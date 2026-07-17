import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
  timeout: 90000,
});

export async function analyzePrompt(prompt, modelId) {
  const { data } = await api.post("/analyze", { prompt, model_id: modelId });
  return data;
}

export async function fetchModels() {
  const { data } = await api.get("/models");
  return data;
}

export async function fetchMetricDefinitions() {
  const { data } = await api.get("/metrics/definitions");
  return data.metrics;
}

export async function tokenize(text) {
  const { data } = await api.post("/tokenize", { text });
  return data;
}

/**
 * Stream an analysis using SSE (POST). Invokes callbacks as events arrive.
 * Returns a promise that resolves with the final `result` payload.
 */
export async function streamAnalyze({ prompt, modelId, onToken, onAgent, onGraphStart, onAggregate, onWarning, signal }) {
  const resp = await fetch(`${API}/analyze/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ prompt, model_id: modelId }),
    signal,
  });
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Stream failed (${resp.status}): ${text.slice(0, 200)}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "token" && onToken) onToken(evt.text || "");
        else if (evt.type === "graph_start" && onGraphStart) onGraphStart(evt.agents || []);
        else if (evt.type === "agent_done" && onAgent) onAgent(evt);
        else if (evt.type === "aggregate_done" && onAggregate) onAggregate(evt);
        else if (evt.type === "warning" && onWarning) onWarning(evt.message || "");
        else if (evt.type === "result") finalResult = evt.result;
      } catch {
        // ignore malformed frame
      }
    }
  }
  if (!finalResult) throw new Error("Stream ended without result");
  return finalResult;
}
