import "dotenv/config";
import express from "express";
import { analyzeProgress, generatePlan, getAIStatus } from "./agentService.js";
// import cors from "cors";

// app.use(cors());

// app.use(express.json());

// console.log("API KEY:", process.env.NVIDIA_API_KEY?.substring(0, 10));
// console.log("MODEL:", process.env.NVIDIA_MODEL);
// console.log("BASE URL:", process.env.NVIDIA_BASE_URL);

const app = express();
const port = process.env.PORT || 8787;

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  const status = getAIStatus();
  res.json({
    ok: true,
    aiConfigured: status.configured,
    provider: status.provider,
    model: status.model,
    availableProviders: status.availableProviders,
  });
});

app.post("/api/agent/plan", async (req, res) => {
  try {
    const result = await generatePlan(req.body ?? {});
    res.json({ ...result, source: "openai-compatible" });
  } catch (error) {
  console.error("FULL ERROR:");
  console.error(error);

  res.status(500).json({
    error: "Failed to generate study plan.",
    details: error.message,
    stack: error.stack,
    response: error.response?.data || null,
  });
}
});

app.post("/api/agent/analyze", async (req, res) => {
  try {
    const result = await analyzeProgress(req.body ?? {});
    res.json({ ...result, source: "openai-compatible" });
  } catch (error) {
  console.error("FULL ERROR:");
  console.error(error);

  res.status(500).json({
    error: "Failed to generate study plan.",
    details: error.message,
    stack: error.stack,
    response: error.response?.data || null,
  });
}
});

app.listen(port, () => {
  console.log(`Server is running on port ${PORT}`);
});
