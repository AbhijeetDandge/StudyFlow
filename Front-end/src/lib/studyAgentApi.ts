import type { AdaptivePlan, DailyProgress, InsightMessage, PlannerInput, StudyPlan } from "@/data/types";
// Replace this string with your actual copied Render URL!
const API_BASE_URL = "https://studyflow-fo3f.onrender.com";
type AgentHealth = {
  ok: boolean;
  aiConfigured: boolean;
  provider: string | null;
  model: string | null;
  availableProviders?: string[];
};

type PlanResponse = {
  plan: StudyPlan;
  source: string;
  provider?: string | null;
  model?: string | null;
};

type AnalysisResponse = {
  analysis: {
    adaptivePlan: AdaptivePlan[];
    insights: InsightMessage[];
  };
  source: string;
  provider?: string | null;
  model?: string | null;
};

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    if (text) {
      try {
        const payload = JSON.parse(text) as { details?: string; error?: string };
        throw new Error(payload.details || payload.error || `Request failed with status ${response.status}`);
      } catch {
        throw new Error(text || `Request failed with status ${response.status}`);
      }
    }
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function fetchAgentHealth() {
  const response = await fetchWithTimeout("${API_BASE_URL}/api/health", {}, 8000);
  return readJson<AgentHealth>(response);
}

export async function requestGeneratedPlan(input: PlannerInput | Record<string, unknown>) {
  const response = await fetchWithTimeout(
    "${API_BASE_URL}/api/agent/plan",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    90000,
  );

  return readJson<PlanResponse>(response);
}

export async function requestProgressAnalysis(plan: StudyPlan, progress: DailyProgress[]) {
  const response = await fetchWithTimeout(
    "${API_BASE_URL}/api/agent/analyze",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan, progress }),
    },
    60000,
  );

  return readJson<AnalysisResponse>(response);
}
