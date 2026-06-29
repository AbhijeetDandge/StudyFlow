import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const models = await client.models.list();

console.log(models);

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    totalDays: { type: "integer" },
    dailyHours: { type: "number" },
    subjects: {
      type: "array",
      items: { type: "string" },
    },
    goal: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "integer" },
          date: { type: "string" },
          subjects: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                topics: {
                  type: "array",
                  items: { type: "string" },
                },
                hours: { type: "number" },
              },
              required: ["name", "topics", "hours"],
            },
          },
        },
        required: ["day", "date", "subjects"],
      },
    },
  },
  required: ["totalDays", "dailyHours", "subjects", "goal", "days"],
};

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    adaptivePlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "integer" },
          date: { type: "string" },
          status: { type: "string", enum: ["increased", "decreased", "adjusted"] },
          change: { type: "string" },
          subjects: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                topics: {
                  type: "array",
                  items: { type: "string" },
                },
                hours: { type: "number" },
              },
              required: ["name", "topics", "hours"],
            },
          },
        },
        required: ["day", "date", "status", "change", "subjects"],
      },
    },
    insights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["motivator", "alert", "info"] },
          agent: { type: "string" },
          message: { type: "string" },
          timestamp: { type: "string" },
        },
        required: ["id", "type", "agent", "message", "timestamp"],
      },
    },
  },
  required: ["adaptivePlan", "insights"],
};

function sanitizeSubjects(subjects) {
  const unique = [...new Set((subjects ?? []).map((subject) => String(subject).trim()).filter(Boolean))];
  return unique.length > 0 ? unique : ["General Study"];
}

function getProviderConfig() {
  if (!process.env.NVIDIA_API_KEY) {
    return null;
  }

  return {
    provider: "nvidia",
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    model: process.env.NVIDIA_MODEL || "deepseek-ai/deepseek-v3.2",
    defaultHeaders: undefined,
    extraBody: {
      // chat_template_kwargs: {
      //   thinking: process.env.NVIDIA_THINKING === "true",
      // },
    },
    timeout: 70000,
    maxTokens: 4096,
    topP: 0.95,
  };
}

function getClient(config) {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultHeaders: config.defaultHeaders,
    timeout: config.timeout,
    maxRetries: 1,
  });
}

function extractJson(content) {
  const trimmed = content.trim();
  const withoutFence = trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Model response did not contain JSON.");
  }

  return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1));
}

async function callJsonResponse({ systemPrompt, userPrompt, schema }) {
  const config = getProviderConfig();
  if (!config) {
    throw new Error("NVIDIA DeepSeek is not configured. Add NVIDIA_API_KEY to enable live AI planning.");
  }

  const client = getClient(config);
  const response = await client.chat.completions.create({
    model: config.model,
    temperature: 0.2,
    top_p: config.topP,
    max_tokens: config.maxTokens,
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\nReturn valid JSON only. Do not wrap it in markdown. Follow this JSON Schema exactly:\n${JSON.stringify(schema)}`,
      },
      { role: "user", content: userPrompt },
    ],
    ...(Object.keys(config.extraBody).length && {
  extra_body: config.extraBody,
}),
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("nvidia returned an empty response.");
  }

  return {
    data: extractJson(content),
    provider: config.provider,
    model: config.model,
  };
}

export function getAIStatus() {
  const config = getProviderConfig();
  return {
    configured: Boolean(config),
    provider: config?.provider ?? null,
    model: config?.model ?? null,
    availableProviders: config ? [config.provider] : [],
  };
}

export async function generatePlan(input) {
  const normalized = {
    subjects: sanitizeSubjects(input.subjects),
    totalDays: Math.min(Math.max(Number(input.totalDays) || 7, 1), 30),
    dailyHours: Math.min(Math.max(Number(input.dailyHours) || 4, 1), 16),
    goal: input.goal?.trim() || "Build a consistent study routine with revision built in.",
  };

  const { data, provider, model } = await callJsonResponse({
    systemPrompt:
      "You are Planner AI for a study companion. Create a realistic student study plan. Balance workload across the requested days, keep daily hours close to the requested limit, rotate subjects, intentionally revisit weak topics, and include concise date labels and topic names. Prefer variety, spaced revision, and balanced focus blocks over repetitive schedules.",
    userPrompt: `Create a study plan for these subjects: ${normalized.subjects.join(", ")}. Days: ${normalized.totalDays}. Daily hours: ${normalized.dailyHours}. Goal: ${normalized.goal}.`,
    schema: PLAN_SCHEMA,
  });

  return { plan: data, provider, model };
}

export async function analyzeProgress({ plan, progress }) {
  const { data, provider, model } = await callJsonResponse({
    systemPrompt:
      "You are a team of study agents: Planner AI, Coach AI, and Analytics AI. Review the plan and progress, then propose adaptive schedule updates and actionable insight messages. Use supportive wording, keep advice specific, and call out the exact subject or topic that needs attention next.",
    userPrompt: JSON.stringify({ plan, progress }),
    schema: ANALYSIS_SCHEMA,
  });

  return { analysis: data, provider, model };
}
