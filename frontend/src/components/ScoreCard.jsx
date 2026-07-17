import React, { useState } from "react";
import { Box, Collapse, LinearProgress, Stack, Tooltip, Typography } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import AnimatedNumber from "./AnimatedNumber";

const barColor = (value, higherIsBetter) => {
  const v = higherIsBetter ? value : 100 - value;
  if (v >= 75) return "#34C759";
  if (v >= 50) return "#FFCC00";
  return "#FF3B30";
};

const MetricTooltip = ({ definition }) => (
  <Box sx={{ p: 0.5, maxWidth: 320 }}>
    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "#EFEFEF", fontWeight: 700, mb: 0.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {definition.label} · {definition.higher_is_better ? "higher = better" : "lower = better"}
    </Typography>
    <Typography sx={{ fontSize: "0.75rem", color: "#EDEDED", mb: 0.75 }}>{definition.description}</Typography>
    {definition.formula && (
      <Box sx={{ mt: 0.5 }}>
        <Typography sx={{ fontSize: "0.65rem", color: "#A1A1AA", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Formula</Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "#EDEDED", fontFamily: "'JetBrains Mono', monospace" }}>{definition.formula}</Typography>
      </Box>
    )}
  </Box>
);

export default function ScoreCard({ definition, value, testid, compact = false, details = null }) {
  const [open, setOpen] = useState(false);
  if (!definition) return null;
  const color = barColor(value, definition.higher_is_better);
  const hasDetails = details && (details.diagnosis || details.recommendation);

  return (
    <Box
      data-testid={testid}
      sx={{
        p: compact ? 1.5 : 2,
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "#121214",
        transition: "border-color 0.15s ease",
        "&:hover": { borderColor: "rgba(255,255,255,0.3)" },
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: compact ? 0.75 : 1.5 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography variant="h6" sx={{ color: "text.secondary", fontSize: "0.62rem" }}>{definition.label}</Typography>
          {details?.source === "hf" && (
            <Box
              sx={{ px: 0.6, py: 0.1, backgroundColor: "rgba(52,199,89,0.14)", border: "1px solid rgba(52,199,89,0.35)", color: "#8FEBA7", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.05em" }}
              data-testid={`${testid}-agent-badge`}
            >
              AGENT
            </Box>
          )}
        </Stack>
        <Tooltip
          arrow
          placement="top"
          title={<MetricTooltip definition={definition} />}
          componentsProps={{
            tooltip: { sx: { backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.15)", p: 1.5, maxWidth: "none" } },
            arrow: { sx: { color: "#000" } },
          }}
        >
          <HelpOutlineIcon
            data-testid={`${testid}-info`}
            sx={{ fontSize: 14, color: "text.secondary", cursor: "help", "&:hover": { color: "#EFEFEF" } }}
          />
        </Tooltip>
      </Box>

      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
        <Typography
          component="span"
          sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: compact ? "1.4rem" : "2rem", fontWeight: 700, color: "#EDEDED", letterSpacing: "-0.04em", lineHeight: 1 }}
        >
          <AnimatedNumber value={value} testid={`${testid}-value`} />
        </Typography>
        <Typography component="span" sx={{ color: "text.secondary", fontFamily: "'IBM Plex Mono', monospace", fontSize: compact ? "0.7rem" : "0.85rem" }}>
          /100
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, value))}
        sx={{ height: 3, "& .MuiLinearProgress-bar": { backgroundColor: color, transition: "transform 0.7s ease" } }}
      />

      {hasDetails && (
        <>
          <Box
            onClick={() => setOpen((o) => !o)}
            data-testid={`${testid}-expand`}
            sx={{
              mt: 1.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              color: "text.secondary",
              "&:hover": { color: "#EFEFEF" },
            }}
          >
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {open ? "Hide reasoning" : "Why this score?"}
            </Typography>
            <ExpandMoreIcon
              fontSize="small"
              sx={{
                transform: open ? "rotate(180deg)" : "rotate(0)",
                transition: "transform 0.2s ease",
              }}
            />
          </Box>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ mt: 1.25, pt: 1.25, borderTop: "1px solid rgba(255,255,255,0.06)" }} data-testid={`${testid}-details`}>
              {details.diagnosis && (
                <Box sx={{ mb: 1.25 }}>
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "#FF9B94", letterSpacing: "0.06em", mb: 0.5 }}>
                    // DIAGNOSIS
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#EDEDED", lineHeight: 1.5 }}>
                    {details.diagnosis}
                  </Typography>
                </Box>
              )}
              {details.recommendation && (
                <Box sx={{ mb: details.evidence && details.evidence !== "n/a" ? 1.25 : 0 }}>
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "#8FEBA7", letterSpacing: "0.06em", mb: 0.5 }}>
                    // FIX
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#EDEDED", lineHeight: 1.5 }}>
                    {details.recommendation}
                  </Typography>
                </Box>
              )}
              {details.evidence && details.evidence !== "n/a" && (
                <Box sx={{ mt: 0.5, p: 1, backgroundColor: "#0B0B0D", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.58rem", color: "text.secondary", letterSpacing: "0.06em", mb: 0.5 }}>
                    // EVIDENCE
                  </Typography>
                  <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#A1A1AA", fontStyle: "italic" }}>
                    "{details.evidence}"
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </>
      )}
    </Box>
  );
}
