import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrowsOutlined";
import { toast } from "sonner";

import PromptEditor from "../components/PromptEditor";
import ScoreRadar from "../components/ScoreRadar";
import WordDiff, { WordDiffModeToggle } from "../components/WordDiff";
import { streamAnalyze } from "../lib/api";
import { ALL_METRIC_KEYS, RADAR_KEYS, findMetric, useMetricDefinitions } from "../lib/metrics";

const SAMPLE_A = `Write me something about AI agents.`;
const SAMPLE_B = `# Role
You are an expert AI researcher.

# Task
Write a 200-word explainer on how tool-using LLM agents (function-calling, planners, memory) work.

# Audience
Software engineers new to agents.

# Format
Markdown with H2 sections and 1 code example.`;

const DeltaBar = ({ def, a, b }) => {
  const aVal = a ?? 0;
  const bVal = b ?? 0;
  const winnerB = def.higher_is_better ? bVal > aVal : bVal < aVal;
  const winnerA = def.higher_is_better ? aVal > bVal : aVal < bVal;
  return (
    <Box
      data-testid={`compare-row-${def.key.replace(/_/g, "-")}`}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 34px 52px 34px 1fr", sm: "1fr 130px 60px 130px 1fr" },
        alignItems: "center",
        gap: { xs: 0.75, sm: 1.5 },
        px: { xs: 0.75, sm: 1.25 },
        py: 1,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        minWidth: 0,
      }}
    >
      {/* A bar */}
      <Box sx={{ position: "relative", height: 8, backgroundColor: "rgba(255,255,255,0.05)", minWidth: 0 }}>
        <Box
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: `${aVal}%`,
            backgroundColor: winnerA ? "#34C759" : "#007AFF",
          }}
        />
      </Box>
      <Typography
        sx={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: { xs: "0.68rem", sm: "0.8rem" },
          textAlign: "right",
          color: winnerA ? "#34C759" : "#EDEDED",
        }}
      >
        {aVal}
      </Typography>
      <Typography
        sx={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: { xs: "0.55rem", sm: "0.65rem" },
          textAlign: "center",
          color: "text.secondary",
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          lineHeight: 1.2,
          overflowWrap: "break-word",
        }}
      >
        {def.label}
      </Typography>
      <Typography
        sx={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: { xs: "0.68rem", sm: "0.8rem" },
          textAlign: "left",
          color: winnerB ? "#34C759" : "#EDEDED",
        }}
      >
        {bVal}
      </Typography>
      <Box sx={{ position: "relative", height: 8, backgroundColor: "rgba(255,255,255,0.05)", minWidth: 0 }}>
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${bVal}%`,
            backgroundColor: winnerB ? "#34C759" : "#FF3B30",
          }}
        />
      </Box>
    </Box>
  );
};

export default function ComparePage() {
  const definitions = useMetricDefinitions();
  const [promptA, setPromptA] = useState(SAMPLE_A);
  const [promptB, setPromptB] = useState(SAMPLE_B);
  const [resA, setResA] = useState(null);
  const [resB, setResB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diffMode, setDiffMode] = useState("split");

  const canRun = useMemo(
    () => promptA.trim().length > 0 && promptB.trim().length > 0 && !loading,
    [promptA, promptB, loading]
  );

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setResA(null);
    setResB(null);
    try {
      const [a, b] = await Promise.all([
        streamAnalyze({ prompt: promptA }),
        streamAnalyze({ prompt: promptB }),
      ]);
      setResA(a);
      setResB(b);
      toast.success("Comparison ready");
    } catch (e) {
      toast.error(e?.message || "Compare failed");
    } finally {
      setLoading(false);
    }
  };

  const winnerCount = useMemo(() => {
    if (!resA || !resB) return { a: 0, b: 0, tie: 0 };
    let a = 0, b = 0, tie = 0;
    ALL_METRIC_KEYS.forEach((k) => {
      const def = findMetric(definitions, k);
      const av = resA[k];
      const bv = resB[k];      if (av === bv) tie++;
      else if (def.higher_is_better ? av > bv : av < bv) a++;
      else b++;
    });
    return { a, b, tie };
  }, [resA, resB, definitions]);

  return (
    <Stack spacing={3} data-testid="compare-page">
      <Box>
        <Typography variant="h1" sx={{ fontSize: { xs: "1.8rem", md: "2.3rem" }, mb: 1, lineHeight: 1.05 }}>
          Compare two prompts.
          <br />
          <Box component="span" sx={{ color: "#FF3B30" }}>See who wins each metric.</Box>
        </Typography>
        <Typography variant="body2" sx={{ maxWidth: 620, fontSize: "0.85rem" }}>
          Paste two prompt variants — same intent, different wording. PromptLens scores each
          across 10 dimensions and shows a word-level diff.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          alignItems: "start",
          minWidth: 0,
        }}
      >
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontSize: "0.72rem", color: "#7CB5FF" }}>PROMPT A</Typography>
          <PromptEditor value={promptA} onChange={setPromptA} disabled={loading} />
        </Stack>
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontSize: "0.72rem", color: "#FF9B94" }}>PROMPT B</Typography>
          <PromptEditor value={promptB} onChange={setPromptB} disabled={loading} />
        </Stack>
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleRun}
          disabled={!canRun}
          data-testid="compare-btn"
          startIcon={loading ? <CircularProgress size={14} sx={{ color: "#09090B" }} /> : <CompareArrowsIcon fontSize="small" />}
          sx={{ py: 1.25, px: 3 }}
        >
          {loading ? "Analyzing both…" : "Compare Prompts"}
        </Button>
        {resA && resB && (
          <Typography variant="body2" sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem" }} data-testid="winner-summary">
            A wins: <Box component="span" sx={{ color: "#7CB5FF" }}>{winnerCount.a}</Box> · B wins: <Box component="span" sx={{ color: "#FF9B94" }}>{winnerCount.b}</Box> · Ties: {winnerCount.tie}
          </Typography>
        )}
      </Stack>

      {resA && resB && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
              alignItems: "start",
              minWidth: 0,
            }}
          >
            <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 2, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontSize: "0.72rem", mb: 1 }}>QUALITY MATRIX · A (BLUE) vs B (RED)</Typography>
              <ScoreRadar
                scores={resA}
                secondScores={resB}
                definitions={definitions}
                labelA="A"
                labelB="B"
                height={340}
              />
            </Box>
            <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 0, minWidth: 0 }} data-testid="metric-compare-list">
              <Box sx={{ p: 1.5, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <Typography variant="h6" sx={{ fontSize: "0.72rem" }}>METRIC-BY-METRIC (WINNER HIGHLIGHTED)</Typography>
              </Box>
              {ALL_METRIC_KEYS.map((k) => (
                <DeltaBar key={k} def={findMetric(definitions, k)} a={resA[k]} b={resB[k]} />
              ))}
            </Box>
          </Box>

          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontSize: "0.75rem" }}>WORD-LEVEL DIFF · A → B</Typography>
            <WordDiffModeToggle mode={diffMode} onChange={setDiffMode} />
          </Stack>
          <WordDiff original={promptA} optimized={promptB} mode={diffMode} />
        </>
      )}
    </Stack>
  );
}
