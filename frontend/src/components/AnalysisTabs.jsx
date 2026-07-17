import React, { useState } from "react";
import {
  Box,
  Chip,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";

import ScoreCard from "./ScoreCard";
import ScoreGauge from "./ScoreGauge";
import ScoreRadar from "./ScoreRadar";
import MetricsBarChart from "./MetricsBarChart";
import CostChart from "./CostChart";
import TokenDistribution from "./TokenDistribution";
import RisksPanel from "./RisksPanel";
import SuggestionsList from "./SuggestionsList";
import WordDiff, { WordDiffModeToggle } from "./WordDiff";
import { PRIMARY_KEYS, RADAR_KEYS, findMetric } from "../lib/metrics";

const copy = (t) => t && navigator.clipboard?.writeText(t);
const download = (fn, t) => {
  const blob = new Blob([t || ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fn;
  a.click();
  URL.revokeObjectURL(url);
};

const MissingInfo = ({ items }) => (
  <Box
    data-testid="missing-info-list"
    sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 2, height: "100%" }}
  >
    <Typography variant="h6" sx={{ mb: 1.5, fontSize: "0.7rem" }}>MISSING INFORMATION</Typography>
    <Stack spacing={1.25}>
      {(items || []).map((s, i) => (
        <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ width: 6, height: 6, backgroundColor: "#FFCC00", mt: "8px", flexShrink: 0 }} />
          <Typography sx={{ fontSize: "0.85rem", color: "#EDEDED", lineHeight: 1.55 }}>{s}</Typography>
        </Stack>
      ))}
    </Stack>
  </Box>
);

const MetaBar = ({ result }) => (
  <Stack
    direction={{ xs: "column", md: "row" }}
    spacing={2}
    sx={{
      border: "1px solid rgba(255,255,255,0.08)",
      backgroundColor: "#121214",
      p: 2.5,
      alignItems: { xs: "flex-start", md: "center" },
    }}
  >
    <ScoreGauge value={result.prompt_score} size={140} />
    <Stack sx={{ flex: 1, minWidth: 0 }} spacing={1.5}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip
          label={result.category}
          data-testid="category-chip"
          sx={{ backgroundColor: "rgba(0,122,255,0.12)", color: "#7CB5FF", border: "1px solid rgba(0,122,255,0.35)" }}
        />
        <Chip
          label={`source: ${result.source}`}
          data-testid="source-chip"
          variant="outlined"
          sx={{ borderColor: "rgba(255,255,255,0.15)", color: "text.secondary" }}
        />
        <Chip
          label={result.model_used?.split("/").pop()}
          data-testid="model-chip"
          variant="outlined"
          sx={{ borderColor: "rgba(255,255,255,0.15)", color: "text.secondary" }}
        />
        {result.graph && (
          <Chip
            label={`${result.graph.hf_agents}/${result.graph.agents_run} agents · hf`}
            data-testid="graph-chip"
            variant="outlined"
            sx={{ borderColor: "rgba(0,122,255,0.35)", color: "#7CB5FF" }}
          />
        )}
      </Stack>
      <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
        <Stack>
          <Typography variant="body2" sx={{ fontSize: "0.62rem" }}>TOKENS</Typography>
          <Typography data-testid="input-tokens" sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.1rem" }}>
            {result.token_count}
          </Typography>
        </Stack>
        <Stack>
          <Typography variant="body2" sx={{ fontSize: "0.62rem" }}>OPT. TOKENS</Typography>
          <Typography data-testid="optimized-tokens" sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.1rem" }}>
            {result.optimized_token_count}
          </Typography>
        </Stack>
        <Stack>
          <Typography variant="body2" sx={{ fontSize: "0.62rem" }}>EST. COST · {result.primary_cost_model}</Typography>
          <Typography data-testid="primary-cost" sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.1rem", color: "#8FEBA7" }}>
            ${(result.primary_cost ?? 0).toFixed(6)}
          </Typography>
        </Stack>
        <Stack>
          <Typography variant="body2" sx={{ fontSize: "0.62rem" }}>SUCCESS RATE</Typography>
          <Typography data-testid="success-rate" sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.1rem" }}>
            {result.predicted_success_rate}%
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  </Stack>
);

export default function AnalysisTabs({ result, originalPrompt, definitions }) {
  const [tab, setTab] = useState(0);
  const [diffMode, setDiffMode] = useState("unified");
  if (!result) return null;

  return (
    <Stack spacing={2.5} data-testid="analysis-view">
      <MetaBar result={result} />

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        data-testid="analysis-tabs"
        variant="scrollable"
        scrollButtons={false}
        sx={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          minHeight: 40,
          "& .MuiTab-root": {
            fontFamily: "'IBM Plex Mono', monospace",
            textTransform: "uppercase",
            fontSize: "0.72rem",
            letterSpacing: "0.05em",
            minHeight: 40,
            color: "text.secondary",
            "&.Mui-selected": { color: "#EFEFEF" },
          },
          "& .MuiTabs-indicator": { backgroundColor: "#FF3B30", height: 2 },
        }}
      >
        <Tab label="Overview" data-testid="tab-overview" />
        <Tab label="All Metrics" data-testid="tab-metrics" />
        <Tab label={`Risks (${result.failure_risks?.length || 0})`} data-testid="tab-risks" />
        <Tab label="Costs" data-testid="tab-costs" />
        <Tab label="Rewrite" data-testid="tab-rewrite" />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={2.5} data-testid="overview-panel">
          <Grid container spacing={2}>
            {PRIMARY_KEYS.map((k) => {
              const testid = `${k.replace(/_/g, "-")}-card`;
              return (
                <Grid item xs={6} md={3} key={k}>
                  <ScoreCard
                    definition={findMetric(definitions, k)}
                    value={result[k]}
                    testid={testid}
                    details={(result.metric_details || {})[k]}
                  />
                </Grid>
              );
            })}
          </Grid>
          <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: "0.72rem" }}>QUALITY MATRIX (NORMALIZED)</Typography>
            <ScoreRadar scores={result} definitions={definitions} height={420} />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <MissingInfo items={result.missing_information} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 2, height: "100%" }}>
                <Typography variant="h6" sx={{ mb: 1.5, fontSize: "0.7rem" }}>TOP SUGGESTIONS</Typography>
                <SuggestionsList suggestions={(result.suggestions || []).slice(0, 3)} />
              </Box>
            </Grid>
          </Grid>
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={2.5} data-testid="metrics-panel">
          <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: "0.72rem" }}>
              9 QUALITY DIMENSIONS · HOVER ANY BAR OR CARD ICON FOR THE FORMULA
            </Typography>
            <MetricsBarChart result={result} definitions={definitions} height={440} />
          </Box>
          <Grid container spacing={2}>
            {RADAR_KEYS.map((k) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={k}>
                <ScoreCard
                  definition={findMetric(definitions, k)}
                  value={result[k]}
                  testid={`metric-${k.replace(/_/g, "-")}`}
                  compact
                  details={(result.metric_details || {})[k]}
                />
              </Grid>
            ))}
          </Grid>
          <Stack direction="row" spacing={2} alignItems="center" data-testid="full-suggestions-section">
            <Typography variant="h6" sx={{ fontSize: "0.72rem" }}>ALL SUGGESTIONS ({result.suggestions?.length || 0})</Typography>
          </Stack>
          <SuggestionsList suggestions={result.suggestions} />
        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={2} data-testid="risks-panel-wrapper">
          <Typography variant="body2" sx={{ fontSize: "0.8rem", maxWidth: 720 }}>
            Each risk includes a probability the prompt triggers that failure mode, a severity band,
            and a short reason. Fix the highest-probability critical/high risks first.
          </Typography>
          <RisksPanel risks={result.failure_risks} />
        </Stack>
      )}

      {tab === 3 && (
        <Stack spacing={2.5} data-testid="costs-panel">
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 2, height: "100%" }}>
                <Typography variant="h6" sx={{ mb: 2, fontSize: "0.72rem" }}>
                  TOKEN COMPOSITION · {result.token_count} TOTAL
                </Typography>
                <TokenDistribution segments={result.token_distribution} totalTokens={result.token_count} />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 2, height: "100%" }}>
                <Typography variant="h6" sx={{ mb: 1, fontSize: "0.72rem" }}>ESTIMATED INPUT COST ACROSS MODELS</Typography>
                <CostChart costs={result.cost_estimates} />
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#121214", p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontSize: "0.72rem" }}>PER-MODEL BREAKDOWN</Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr", md: "repeat(3, 1fr)" },
                gap: 1.5,
              }}
              data-testid="cost-grid"
            >
              {Object.entries(result.cost_estimates).map(([m, v]) => (
                <Box key={m} sx={{ p: 1.5, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#0E0E10" }}>
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.68rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {m}
                  </Typography>
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.1rem", color: "#EDEDED", mt: 0.5 }}>
                    ${v.toFixed(6)}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="body2" sx={{ mt: 2, fontSize: "0.7rem" }}>
              // Prices are per-1K input tokens at approximate list rates. Output tokens billed separately.
            </Typography>
          </Box>
        </Stack>
      )}

      {tab === 4 && (
        <Stack spacing={2} data-testid="rewrite-panel">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
            <Typography variant="h6" sx={{ fontSize: "0.75rem" }}>WORD-LEVEL DIFF</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <WordDiffModeToggle mode={diffMode} onChange={setDiffMode} />
              <Tooltip title="Copy optimized">
                <IconButton size="small" data-testid="rewrite-copy-btn" onClick={() => copy(result.optimized_prompt)} sx={{ color: "text.secondary" }}>
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download optimized">
                <IconButton size="small" data-testid="rewrite-download-btn" onClick={() => download("optimized-prompt.txt", result.optimized_prompt)} sx={{ color: "text.secondary" }}>
                  <DownloadIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <WordDiff original={originalPrompt} optimized={result.optimized_prompt} mode={diffMode} />
        </Stack>
      )}
    </Stack>
  );
}
