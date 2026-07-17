import React from "react";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUncheckedOutlined";

const AGENT_LABEL = {
  agent_clarity: "Clarity Judge",
  agent_specificity: "Specificity Judge",
  agent_ambiguity: "Ambiguity Judge",
  agent_context_score: "Context Judge",
  agent_instruction_quality: "Instruction Judge",
  agent_complexity: "Complexity Judge",
  agent_readability: "Readability Judge",
  agent_predicted_success_rate: "Success-Rate Judge",
  agent_avg_response_quality: "Response-Quality Judge",
  aggregate: "Synthesis Agent",
};

const AGENT_ORDER = [
  "agent_clarity",
  "agent_specificity",
  "agent_ambiguity",
  "agent_context_score",
  "agent_instruction_quality",
  "agent_complexity",
  "agent_readability",
  "agent_predicted_success_rate",
  "agent_avg_response_quality",
  "aggregate",
];

export default function AgentProgressPanel({ agents = [], progress = {}, title = "LANGGRAPH · 10 AGENTS IN PARALLEL" }) {
  const list = agents.length > 0 ? agents : AGENT_ORDER;
  const doneCount = Object.keys(progress).length;
  const total = list.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <Box
      data-testid="agent-progress-panel"
      sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#0B0B0D", display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "#121214",
          display: "flex",
          alignItems: "center",
          gap: 1,
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 8,
              height: 8,
              backgroundColor: doneCount >= total ? "#34C759" : "#FF3B30",
              animation: doneCount >= total ? "none" : "pl-pulse 1.2s ease-in-out infinite",
              "@keyframes pl-pulse": {
                "0%,100%": { opacity: 1 },
                "50%": { opacity: 0.25 },
              },
            }}
          />
          <Typography variant="h6" sx={{ fontSize: "0.65rem" }}>{title}</Typography>
        </Stack>
        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "text.secondary" }}>
          {doneCount}/{total}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{ height: 2, backgroundColor: "transparent", "& .MuiLinearProgress-bar": { backgroundColor: "#FF3B30", transition: "transform 0.3s ease" } }}
      />
      <Box sx={{ p: 1.5, maxHeight: 320, overflowY: "auto" }} data-testid="agent-progress-list">
        <Stack spacing={0.5}>
          {list.map((a) => {
            const done = a in progress;
            const p = progress[a] || {};
            const label = AGENT_LABEL[a] || a;
            return (
              <Stack
                key={a}
                direction="row"
                spacing={1.5}
                alignItems="center"
                data-testid={`agent-row-${a.replace("agent_", "").replace(/_/g, "-")}`}
                sx={{
                  py: 0.5,
                  px: 0.75,
                  transition: "background 0.15s ease",
                  backgroundColor: done ? "rgba(52,199,89,0.06)" : "transparent",
                }}
              >
                {done ? (
                  <CheckCircleIcon sx={{ fontSize: 14, color: "#34C759" }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                )}
                <Typography
                  sx={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "0.72rem",
                    color: done ? "#EDEDED" : "text.secondary",
                    flex: 1,
                  }}
                >
                  {label}
                </Typography>
                {done && p.score !== undefined && (
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.68rem", color: "#EDEDED" }}>
                    {p.score}/100
                  </Typography>
                )}
                {done && p.source && (
                  <Box
                    sx={{
                      px: 0.6,
                      py: 0.1,
                      backgroundColor: p.source === "hf" ? "rgba(52,199,89,0.14)" : "rgba(255,204,0,0.12)",
                      border: `1px solid ${p.source === "hf" ? "rgba(52,199,89,0.35)" : "rgba(255,204,0,0.35)"}`,
                      color: p.source === "hf" ? "#8FEBA7" : "#FFDD66",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "0.55rem",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {p.source}
                  </Box>
                )}
                {done && p.latency_ms !== undefined && (
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "text.secondary" }}>
                    {p.latency_ms}ms
                  </Typography>
                )}
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
