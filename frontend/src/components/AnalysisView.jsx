import React from "react";
import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import ScoreCard from "./ScoreCard";
import ScoreRadar from "./ScoreRadar";
import CostChart from "./CostChart";
import OptimizedDiff from "./OptimizedDiff";

const InfoList = ({ title, items, testid, dotColor = "#007AFF" }) => (
  <Box
    data-testid={testid}
    sx={{
      border: "1px solid rgba(255,255,255,0.08)",
      backgroundColor: "#121214",
      p: 2,
      height: "100%",
    }}
  >
    <Typography variant="h6" sx={{ mb: 1.5, fontSize: "0.7rem" }}>
      {title}
    </Typography>
    <Stack spacing={1.25}>
      {(items || []).map((s, i) => (
        <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 6,
              height: 6,
              backgroundColor: dotColor,
              mt: "8px",
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: "0.85rem", color: "#EDEDED", lineHeight: 1.55 }}>
            {s}
          </Typography>
        </Stack>
      ))}
    </Stack>
  </Box>
);

export default function AnalysisView({ result, originalPrompt }) {
  if (!result) return null;

  return (
    <Stack spacing={3} data-testid="analysis-view">
      {/* Meta bar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "#121214",
          px: 2,
          py: 1.5,
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="h6" sx={{ fontSize: "0.7rem" }}>
            CATEGORY
          </Typography>
          <Chip
            label={result.category}
            data-testid="category-chip"
            sx={{
              backgroundColor: "rgba(0,122,255,0.12)",
              color: "#7CB5FF",
              border: "1px solid rgba(0,122,255,0.35)",
            }}
          />
          <Chip
            label={`source: ${result.source}`}
            data-testid="source-chip"
            variant="outlined"
            sx={{ borderColor: "rgba(255,255,255,0.15)", color: "text.secondary" }}
          />
        </Stack>
        <Stack direction="row" spacing={3}>
          <Stack>
            <Typography variant="body2" sx={{ fontSize: "0.65rem" }}>INPUT TOKENS</Typography>
            <Typography
              data-testid="input-tokens"
              sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1rem", color: "#EDEDED" }}
            >
              {result.token_count}
            </Typography>
          </Stack>
          <Stack>
            <Typography variant="body2" sx={{ fontSize: "0.65rem" }}>OPTIMIZED TOKENS</Typography>
            <Typography
              data-testid="optimized-tokens"
              sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1rem", color: "#EDEDED" }}
            >
              {result.optimized_token_count}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      {/* Score cards */}
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <ScoreCard label="Clarity" value={result.clarity} testid="clarity-card" hint="Higher is better" />
        </Grid>
        <Grid item xs={6} md={3}>
          <ScoreCard label="Specificity" value={result.specificity} testid="specificity-card" hint="Higher is better" />
        </Grid>
        <Grid item xs={6} md={3}>
          <ScoreCard
            label="Ambiguity"
            value={result.ambiguity}
            inverted
            testid="ambiguity-card"
            hint="Lower is better"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <ScoreCard
            label="Hallucination Risk"
            value={result.hallucination_risk}
            inverted
            testid="hallucination-card"
            hint="Lower is better"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: "0.7rem" }}>
              QUALITY MATRIX
            </Typography>
            <ScoreRadar scores={result} />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: "0.7rem" }}>
              EST. COST PER RUN (INPUT-ONLY)
            </Typography>
            <CostChart costs={result.cost_estimates} />
          </Box>
        </Grid>
      </Grid>

      {/* Lists */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <InfoList
            title="Missing Context"
            items={result.missing_context}
            testid="missing-context-list"
            dotColor="#FFCC00"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <InfoList
            title="Suggestions"
            items={result.suggestions}
            testid="suggestions-list"
            dotColor="#34C759"
          />
        </Grid>
      </Grid>

      {/* Diff */}
      <Box>
        <Typography variant="h6" sx={{ mb: 1.5, fontSize: "0.75rem" }}>
          PROMPT COMPARISON
        </Typography>
        <OptimizedDiff
          original={originalPrompt}
          optimized={result.optimized_prompt}
          originalTokens={result.token_count}
          optimizedTokens={result.optimized_token_count}
        />
      </Box>
    </Stack>
  );
}
