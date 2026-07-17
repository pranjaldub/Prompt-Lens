import React from "react";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";

const severityStyle = {
  critical: { color: "#FF3B30", bg: "rgba(255,59,48,0.14)", border: "rgba(255,59,48,0.45)" },
  high: { color: "#FF9500", bg: "rgba(255,149,0,0.14)", border: "rgba(255,149,0,0.45)" },
  medium: { color: "#FFCC00", bg: "rgba(255,204,0,0.12)", border: "rgba(255,204,0,0.4)" },
  low: { color: "#34C759", bg: "rgba(52,199,89,0.12)", border: "rgba(52,199,89,0.4)" },
};

export default function RisksPanel({ risks = [] }) {
  return (
    <Stack spacing={1.5} data-testid="risks-panel">
      {risks.map((r) => {
        const s = severityStyle[r.severity] || severityStyle.medium;
        const idSuffix = r.id?.replace(/^risk-/, "") || r.name?.toLowerCase().replace(/\s+/g, "-");
        return (
          <Box
            key={r.id}
            data-testid={`risk-${idSuffix}`}
            sx={{
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "#121214",
              p: 2,
              transition: "border-color 0.15s ease",
              "&:hover": { borderColor: "rgba(255,255,255,0.25)" },
            }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
                <Box sx={{ px: 1, py: 0.25, backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {r.severity}
                </Box>
                <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.9rem", color: "#EDEDED", fontWeight: 600 }}>
                  {r.name}
                </Typography>
              </Stack>
              <Box sx={{ width: { xs: "100%", sm: 220 } }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Probability
                  </Typography>
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", color: s.color }}>
                    {r.probability}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={r.probability}
                  sx={{ height: 4, "& .MuiLinearProgress-bar": { backgroundColor: s.color } }}
                />
              </Box>
            </Stack>
            {r.description && (
              <Typography sx={{ mt: 1.5, color: "#A1A1AA", fontSize: "0.82rem", lineHeight: 1.55 }}>
                {r.description}
              </Typography>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
