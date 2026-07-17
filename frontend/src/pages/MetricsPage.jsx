import React from "react";
import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import { useMetricDefinitions } from "../lib/metrics";

export default function MetricsPage() {
  const definitions = useMetricDefinitions();

  return (
    <Stack spacing={3} data-testid="metrics-page">
      <Box>
        <Typography variant="h1" sx={{ fontSize: { xs: "1.8rem", md: "2.3rem" }, mb: 1, lineHeight: 1.05 }}>
          Metric reference.
        </Typography>
        <Typography variant="body2" sx={{ maxWidth: 640, fontSize: "0.85rem" }}>
          Every score is bounded 0–100. When the LLM is available, PromptLens uses it to compute
          each metric; otherwise the deterministic heuristic below runs on the client's server.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {definitions.map((m) => (
          <Grid item xs={12} md={6} key={m.key}>
            <Box
              data-testid={`metric-def-${m.key.replace(/_/g, "-")}`}
              sx={{
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "#121214",
                p: 2.5,
                height: "100%",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h3" sx={{ fontSize: "1.1rem", fontFamily: "'IBM Plex Mono', monospace", color: "#EFEFEF" }}>
                  {m.label}
                </Typography>
                <Chip
                  label={m.higher_is_better ? "higher = better" : "lower = better"}
                  size="small"
                  sx={{
                    backgroundColor: m.higher_is_better ? "rgba(52,199,89,0.14)" : "rgba(255,59,48,0.14)",
                    color: m.higher_is_better ? "#8FEBA7" : "#FF9B94",
                    border: `1px solid ${m.higher_is_better ? "rgba(52,199,89,0.35)" : "rgba(255,59,48,0.35)"}`,
                  }}
                />
              </Stack>
              <Typography sx={{ fontSize: "0.88rem", color: "#EDEDED", mb: 1.25 }}>
                {m.description}
              </Typography>
              {m.formula && (
                <Box sx={{ mb: 1.25 }}>
                  <Typography variant="h6" sx={{ fontSize: "0.62rem", mb: 0.5 }}>FORMULA</Typography>
                  <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#A1A1AA" }}>
                    {m.formula}
                  </Typography>
                </Box>
              )}
              {m.signals?.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ fontSize: "0.62rem", mb: 0.5 }}>SIGNALS</Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {m.signals.map((s, i) => (
                      <Chip
                        key={i}
                        label={s}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: "rgba(255,255,255,0.12)",
                          color: "text.secondary",
                          fontSize: "0.65rem",
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
