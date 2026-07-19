import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { toast } from "sonner";
import { useOutletContext } from "react-router-dom";

import PromptEditor from "../components/PromptEditor";
import AnalysisTabs from "../components/AnalysisTabs";
import AgentProgressPanel from "../components/AgentProgressPanel";
import { analyzePrompt, fetchModels, streamAnalyze } from "../lib/api";
import { useMetricDefinitions } from "../lib/metrics";
import { saveHistoryItem } from "../lib/storage";

const SAMPLE_PROMPT = `Write me something about AI agents.`;

export default function AnalyzePage() {
  const ctx = useOutletContext() || {};
  const [prompt, setPrompt] = useState(ctx.presetPrompt || SAMPLE_PROMPT);
  const [analyzedPrompt, setAnalyzedPrompt] = useState("");
  const [result, setResult] = useState(ctx.presetResult || null);
  const [loading, setLoading] = useState(false);
  const [streamMode, setStreamMode] = useState(true);
  const [streamText, setStreamText] = useState("");
  const [agentList, setAgentList] = useState([]);
  const [agentProgress, setAgentProgress] = useState({});
  const [models, setModels] = useState({ default: "", options: [] });
  const [modelId, setModelId] = useState("");
  const definitions = useMetricDefinitions();
  const abortRef = useRef(null);

  useEffect(() => {
    fetchModels()
      .then((m) => {
        setModels(m);
        setModelId(m.default);
      })
      .catch(() => {
        setModels({
          default: "llama-3.1-8b-instant",
          options: ["llama-3.1-8b-instant"],
        });
        setModelId("llama-3.1-8b-instant");
      });
  }, []);

  // If parent (App) provides a preset (e.g. clicked history), sync it
  useEffect(() => {
    if (ctx.presetPrompt !== undefined) {
      setPrompt(ctx.presetPrompt);
      setResult(ctx.presetResult || null);
      setAnalyzedPrompt(ctx.presetPrompt);
      ctx.clearPreset?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.presetPrompt]);

  const canAnalyze = useMemo(() => prompt.trim().length > 0 && !loading, [prompt, loading]);

  const runNonStreaming = async () => {
    const data = await analyzePrompt(prompt, modelId);
    setResult(data);
    setAnalyzedPrompt(prompt);
    const entry = saveHistoryItem({ prompt, result: data, modelId });
    ctx.onHistoryAdded?.(entry);
    toast.success(`Analysis complete · ${data.source === "hf" ? "AI-powered" : "heuristic fallback"}`);
  };

  const runStreaming = async () => {
    setStreamText("");
    abortRef.current = new AbortController();
    const data = await streamAnalyze({
      prompt,
      modelId,
      onToken: (t) => setStreamText((prev) => prev + t),
      onWarning: (m) => toast.warning(m),
      signal: abortRef.current.signal,
    });
    setResult(data);
    setAnalyzedPrompt(prompt);
    const entry = saveHistoryItem({ prompt, result: data, modelId });
    ctx.onHistoryAdded?.(entry);
    toast.success(`Analysis complete · ${data.source === "hf" ? "AI-powered (streamed)" : "heuristic fallback"}`);
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    setResult(null);
    setStreamText("");
    try {
      if (streamMode) await runStreaming();
      else await runNonStreaming();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Analysis failed";
      toast.error(String(msg));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "5fr 7fr" },
        gap: 3,
        alignItems: "start",
        minWidth: 0,
      }}
    >
      {/* Left: editor + controls */}
      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        <Box>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: "2rem", md: "2.5rem" }, lineHeight: 1.05, mb: 1.5 }}
            data-testid="hero-title"
          >
            Dissect any prompt.
            <br />
            <Box component="span" sx={{ color: "#FF3B30" }}>Ship better ones.</Box>
          </Typography>
          <Typography variant="body2" sx={{ maxWidth: 480, fontSize: "0.85rem" }}>
            Paste a prompt. PromptLens scores 10 dimensions of quality, streams the reasoning
            live, and produces an optimized rewrite with word-level diff.
          </Typography>
        </Box>

        <PromptEditor value={prompt} onChange={setPrompt} disabled={loading} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="stretch">
          <Select
            data-testid="model-select"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            size="small"
            sx={{  width: "100%", minWidth: { sm: 240 }, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.8rem" }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: "#121214",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 0.5,
                },
              },
            }}
          >
            {(models.options || []).map((m) => (
              <MenuItem key={m} value={m} sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.8rem" }}>
                {m}
              </MenuItem>
            ))}
          </Select>
          <Button
            data-testid="analyze-btn"
            variant="contained"
            color="primary"
            size="large"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            startIcon={
              loading ? (
                <CircularProgress size={14} thickness={5} sx={{ color: "#09090B" }} />
              ) : (
                <AutoAwesomeIcon fontSize="small" />
              )
            }
            sx={{ flex: 1, py: 1.25 }}
          >
            {loading ? "Analyzing…" : "Analyze Prompt"}
          </Button>
        </Stack>

        <FormControlLabel
          control={
            <Switch
              checked={streamMode}
              onChange={(e) => setStreamMode(e.target.checked)}
              data-testid="stream-mode-toggle"
              size="small"
              sx={{
                "& .MuiSwitch-thumb": { backgroundColor: streamMode ? "#FF3B30" : "#71717A" },
                "& .MuiSwitch-track": { backgroundColor: "rgba(255,255,255,0.15) !important" },
              }}
            />
          }
          label={
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: "text.secondary" }}>
              Live token streaming
            </Typography>
          }
        />

        {/* Agent progress renders in the right column during loading */}
      </Stack>

      {/* Right: analysis */}
      <Box sx={{ minWidth: 0 }}>
        {!result && !loading && (
          <Box
            data-testid="empty-state"
            sx={{
              border: "1px dashed rgba(255,255,255,0.12)",
              p: { xs: 3, md: 5 },
              minHeight: 460,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: 1.5,
            }}
          >
            <Typography variant="h6" sx={{ color: "text.secondary" }}>// READY</Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: "1.5rem", md: "1.8rem" } }}>
              Awaiting a prompt to analyze.
            </Typography>
            <Typography variant="body2" sx={{ maxWidth: 460 }}>
              Enter a prompt, pick a model, and press
              <Box component="span" sx={{ color: "#EFEFEF" }}> Analyze Prompt </Box>
              to receive 10 scored metrics, a radar matrix, cost estimates and a word-diff rewrite.
            </Typography>
          </Box>
        )}
        {loading && !streamMode && (
          <Box
            data-testid="loading-state"
            sx={{
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "#121214",
              minHeight: 460,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <CircularProgress size={28} thickness={4} sx={{ color: "#FF3B30" }} />
            <Typography variant="body2" sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem" }}>
              Running lens · tokenizing · scoring · rewriting…
            </Typography>
          </Box>
        )}
        {loading && streamMode && !result && (
          <Box
            data-testid="loading-state"
            sx={{
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "#121214",
              minHeight: 220,
              p: 2.5,
            }}
          >
            <Typography variant="h6" sx={{ fontSize: "0.7rem", mb: 1.5 }}>// LANGGRAPH ANALYSIS IN PROGRESS</Typography>
            <Typography variant="body2" sx={{ fontSize: "0.8rem", mb: 2 }}>
              10 specialised agents are judging your prompt in parallel. Each returns a score,
              a diagnosis, and a concrete fix — grounded in the actual text.
            </Typography>
            <AgentProgressPanel agents={agentList} progress={agentProgress} title="AGENTS IN FLIGHT" />
          </Box>
        )}
        {result && !loading && (
          <AnalysisTabs result={result} originalPrompt={analyzedPrompt} definitions={definitions} />
        )}
      </Box>
    </Box>
  );
}
