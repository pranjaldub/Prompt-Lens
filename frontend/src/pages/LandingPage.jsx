import React, { useEffect, useState } from "react";
import { Box, Button, Container, Grid, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";
import BoltIcon from "@mui/icons-material/BoltOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrowsOutlined";
import LayersIcon from "@mui/icons-material/LayersOutlined";
import ShieldIcon from "@mui/icons-material/ShieldOutlined";
import TerminalIcon from "@mui/icons-material/TerminalOutlined";
import InsightsIcon from "@mui/icons-material/InsightsOutlined";
import { Link as RouterLink } from "react-router-dom";

import ScoreGauge from "../components/ScoreGauge";

const SAMPLE_PROMPT = `Write me something about AI agents.`;
const IMPROVED_PROMPT = `# Role
You are a senior AI researcher.

# Task
Explain how tool-using LLM agents (function-calling, planners, short-term memory) work in ~200 words.

# Audience
Software engineers new to agent architectures.

# Format
Markdown with H2 sections and one runnable Python code block.

# Constraints
- Do not repeat definitions.
- If a term is jargon, define it in-line the first time.`;

const FEATURES = [
  {
    icon: <InsightsIcon fontSize="small" />,
    title: "10 specialist agents, in parallel",
    body: "A LangGraph DAG fans out to nine metric agents (Clarity Judge, Specificity Judge, …) plus a Synthesis agent — each returns a score, a diagnosis, and a concrete fix grounded in your prompt text.",
  },
  {
    icon: <ShieldIcon fontSize="small" />,
    title: "7 failure-mode risks",
    body: "Hallucination, injection, ambiguity, instruction conflict, missing context, no format, task overload — each with probability & severity.",
  },
  {
    icon: <BoltIcon fontSize="small" />,
    title: "Token streaming",
    body: "Watch the analysis stream live via SSE. Full JSON parses at the end; no black-box waiting.",
  },
  {
    icon: <CompareArrowsIcon fontSize="small" />,
    title: "A/B compare two prompts",
    body: "Score two variants side-by-side with a dual-radar overlay, metric-by-metric winner bars, and a word-level diff.",
  },
  {
    icon: <LayersIcon fontSize="small" />,
    title: "Word-level diff & optimized rewrite",
    body: "Get a rewritten prompt that preserves intent, plus red/green inline diff in unified or split mode.",
  },
  {
    icon: <TerminalIcon fontSize="small" />,
    title: "Zero-config, no sign-up",
    body: "Everything runs from your browser. History stays in localStorage. No accounts, no tracking.",
  },
];

const AnimatedScoreDemo = () => {
  const [state, setState] = useState("before"); // "before" -> "after"
  useEffect(() => {
    const t1 = setTimeout(() => setState("after"), 1400);
    const t2 = setTimeout(() => setState("before"), 4200);
    const int = setInterval(() => {
      setState((s) => (s === "before" ? "after" : "before"));
    }, 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(int);
    };
  }, []);
  const value = state === "before" ? 34 : 87;
  const promptText = state === "before" ? SAMPLE_PROMPT : IMPROVED_PROMPT;

  return (
    <Box
      data-testid="landing-demo"
      sx={{
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "#121214",
        p: { xs: 2.5, md: 3 },
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "220px 1fr" },
        gap: { xs: 2, md: 3 },
        alignItems: "center",
      }}
    >
      <Stack alignItems="center" spacing={1}>
        <ScoreGauge value={value} size={200} label={state === "before" ? "BEFORE" : "AFTER"} testid="landing-demo-gauge" />
      </Stack>
      <Box
        sx={{
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "#0B0B0D",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.78rem",
          color: "#EDEDED",
          p: 2,
          minHeight: 220,
          whiteSpace: "pre-wrap",
          lineHeight: 1.55,
          position: "relative",
          overflow: "hidden",
        }}
        data-testid="landing-demo-prompt"
      >
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.62rem",
            color: state === "before" ? "#FF3B30" : "#34C759",
            letterSpacing: "0.08em",
          }}
        >
          {state === "before" ? "// ORIGINAL" : "// PROMPTLENS REWRITE"}
        </Box>
        {promptText}
      </Box>
    </Box>
  );
};

const FeatureCard = ({ f, i }) => (
  <Box
    data-testid={`landing-feature-${i}`}
    sx={{
      border: "1px solid rgba(255,255,255,0.08)",
      backgroundColor: "#121214",
      p: 2.5,
      height: "100%",
      transition: "border-color 0.15s ease, transform 0.15s ease",
      "&:hover": { borderColor: "rgba(255,255,255,0.3)", transform: "translateY(-2px)" },
    }}
  >
    <Box sx={{ color: "#FF3B30", mb: 1.5 }}>{f.icon}</Box>
    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1rem", color: "#EDEDED", fontWeight: 600, mb: 0.75 }}>
      {f.title}
    </Typography>
    <Typography sx={{ color: "#A1A1AA", fontSize: "0.82rem", lineHeight: 1.55 }}>
      {f.body}
    </Typography>
  </Box>
);

const Stat = ({ value, label, testid }) => (
  <Stack alignItems="flex-start" data-testid={testid}>
    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: { xs: "1.9rem", md: "2.6rem" }, color: "#EDEDED", lineHeight: 1, letterSpacing: "-0.04em" }}>
      {value}
    </Typography>
    <Typography sx={{ mt: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.08em", color: "text.secondary", textTransform: "uppercase" }}>
      {label}
    </Typography>
  </Stack>
);

export default function LandingPage() {
  return (
    <Box data-testid="landing-page">
      {/* HERO */}
      <Stack spacing={4} sx={{ mb: { xs: 6, md: 10 } }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 6, height: 6, backgroundColor: "#FF3B30", borderRadius: 0 }} />
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.08em", color: "text.secondary", textTransform: "uppercase" }}>
            PROMPTLENS v4 — 10 specialised langgraph agents in parallel
          </Typography>
        </Stack>

        <Typography
          data-testid="landing-hero-title"
          variant="h1"
          sx={{
            fontSize: { xs: "2.4rem", sm: "3.4rem", md: "5rem" },
            lineHeight: 0.98,
            letterSpacing: "-0.045em",
            maxWidth: 1000,
          }}
        >
          Ship prompts you can
          <br />
          <Box component="span" sx={{ color: "#FF3B30" }}>bet on.</Box>
        </Typography>

        <Typography sx={{ maxWidth: 640, fontSize: { xs: "0.95rem", md: "1.1rem" }, lineHeight: 1.55, color: "#A1A1AA" }}>
          PromptLens dissects any prompt across 10 quality dimensions, quantifies 7 distinct
          failure modes, and rewrites it — with a live token stream and word-level diff you
          can trust.
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <Button
            component={RouterLink}
            to="/analyze"
            variant="contained"
            color="primary"
            size="large"
            endIcon={<ArrowForwardIcon />}
            data-testid="landing-cta-analyze"
            sx={{ py: 1.4, px: 3, fontSize: "0.85rem" }}
          >
            Launch analyzer
          </Button>
          <Button
            component={RouterLink}
            to="/compare"
            variant="outlined"
            size="large"
            data-testid="landing-cta-compare"
            sx={{ py: 1.4, px: 3, fontSize: "0.85rem" }}
          >
            Compare two prompts
          </Button>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "text.secondary" }}>
            // no signup · runs in your browser
          </Typography>
        </Stack>
      </Stack>

      {/* LIVE DEMO */}
      <Stack spacing={2} sx={{ mb: { xs: 6, md: 10 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6" sx={{ fontSize: "0.7rem" }}>WATCH A SCORE MOVE</Typography>
          <Box sx={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
        </Stack>
        <AnimatedScoreDemo />
        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: "text.secondary" }}>
          // the same prompt, before and after PromptLens rewrites it
        </Typography>
      </Stack>

      {/* STATS */}
      <Grid container spacing={4} sx={{ mb: { xs: 6, md: 10 } }} data-testid="landing-stats">
        <Grid item xs={6} md={3}>
          <Stat value="10" label="Quality metrics" testid="stat-metrics" />
        </Grid>
        <Grid item xs={6} md={3}>
          <Stat value="7" label="Failure risk types" testid="stat-risks" />
        </Grid>
        <Grid item xs={6} md={3}>
          <Stat value="9" label="Model cost estimates" testid="stat-costs" />
        </Grid>
        <Grid item xs={6} md={3}>
          <Stat value="0" label="Accounts required" testid="stat-signup" />
        </Grid>
      </Grid>

      {/* FEATURES */}
      <Stack spacing={2} sx={{ mb: { xs: 6, md: 10 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6" sx={{ fontSize: "0.7rem" }}>WHAT YOU GET</Typography>
          <Box sx={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
        </Stack>
        <Grid container spacing={2}>
          {FEATURES.map((f, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <FeatureCard f={f} i={i} />
            </Grid>
          ))}
        </Grid>
      </Stack>

      {/* HOW IT WORKS */}
      <Stack spacing={2} sx={{ mb: { xs: 6, md: 10 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6" sx={{ fontSize: "0.7rem" }}>HOW IT WORKS</Typography>
          <Box sx={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
        </Stack>
        <Grid container spacing={2}>
          {[
            ["01", "Paste", "Drop your prompt into the Monaco editor. Any length, any language, any format."],
            ["02", "Analyze", "Llama 3.1 8B (or heuristic fallback) scores 10 dimensions in seconds via streaming."],
            ["03", "Ship", "Copy the optimized rewrite, review the word-diff, and deploy with confidence."],
          ].map(([num, title, body]) => (
            <Grid item xs={12} md={4} key={num}>
              <Box
                data-testid={`landing-step-${num}`}
                sx={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "#121214",
                  p: 2.5,
                  height: "100%",
                }}
              >
                <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "#FF3B30", letterSpacing: "0.1em", mb: 1.5 }}>
                  {num}
                </Typography>
                <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.1rem", color: "#EDEDED", fontWeight: 600, mb: 1 }}>
                  {title}
                </Typography>
                <Typography sx={{ color: "#A1A1AA", fontSize: "0.82rem", lineHeight: 1.55 }}>
                  {body}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Stack>

      {/* FINAL CTA */}
      <Box
        sx={{
          border: "1px solid rgba(255,255,255,0.12)",
          p: { xs: 4, md: 6 },
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { md: "center" },
          justifyContent: "space-between",
          gap: 3,
          backgroundColor: "#0B0B0D",
        }}
      >
        <Stack spacing={1}>
          <Typography variant="h2" sx={{ fontSize: { xs: "1.6rem", md: "2.2rem" } }}>
            Stop guessing. Start scoring.
          </Typography>
          <Typography sx={{ color: "#A1A1AA", maxWidth: 560, fontSize: "0.9rem" }}>
            Every prompt you send costs tokens, time, and trust. Analyze once. Ship better.
          </Typography>
        </Stack>
        <Button
          component={RouterLink}
          to="/analyze"
          variant="contained"
          color="primary"
          size="large"
          endIcon={<ArrowForwardIcon />}
          data-testid="landing-cta-bottom"
          sx={{ py: 1.4, px: 4 }}
        >
          Analyze a prompt
        </Button>
      </Box>

      <Box sx={{ textAlign: "left", py: 4, mt: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "text.secondary", letterSpacing: "0.06em" }}>
          PROMPTLENS · BUILT WITH FASTAPI + REACT + MATERIAL UI · TOKEN COUNTING VIA TIKTOKEN · LLM VIA HUGGING FACE INFERENCE
        </Typography>
      </Box>
    </Box>
  );
}
