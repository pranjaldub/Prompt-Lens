import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";

const TYPE_COLOR = {
  add: { color: "#8FEBA7", bg: "rgba(52,199,89,0.14)", border: "rgba(52,199,89,0.4)" },
  remove: { color: "#FF9B94", bg: "rgba(255,59,48,0.14)", border: "rgba(255,59,48,0.4)" },
  modify: { color: "#7CB5FF", bg: "rgba(0,122,255,0.14)", border: "rgba(0,122,255,0.4)" },
  clarify: { color: "#FFDD66", bg: "rgba(255,204,0,0.14)", border: "rgba(255,204,0,0.4)" },
};

const IMPACT_COLOR = {
  high: "#FF3B30",
  medium: "#FFCC00",
  low: "#71717A",
};

export default function SuggestionsList({ suggestions = [] }) {
  return (
    <Stack spacing={1.5} data-testid="suggestions-list">
      {suggestions.map((s) => {
        const t = TYPE_COLOR[s.type] || TYPE_COLOR.modify;
        return (
          <Box
            key={s.id}
            data-testid={`suggestion-${s.id}`}
            sx={{
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "#121214",
              p: 2,
              "&:hover": { borderColor: "rgba(255,255,255,0.25)" },
              transition: "border-color 0.15s ease",
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
              <Box sx={{ px: 1, py: 0.25, backgroundColor: t.bg, border: `1px solid ${t.border}`, color: t.color, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {s.type}
              </Box>
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.9rem", fontWeight: 600, color: "#EDEDED", flex: 1 }}>
                {s.title}
              </Typography>
              <Chip
                label={`${s.impact} impact`}
                size="small"
                sx={{
                  backgroundColor: "transparent",
                  border: `1px solid ${IMPACT_COLOR[s.impact] || "#71717A"}55`,
                  color: IMPACT_COLOR[s.impact] || "#71717A",
                  fontSize: "0.62rem",
                }}
              />
            </Stack>
            {s.description && (
              <Typography sx={{ color: "#EDEDED", fontSize: "0.85rem", lineHeight: 1.55 }}>
                {s.description}
              </Typography>
            )}
            {s.example && (
              <Box sx={{ mt: 1, p: 1.25, backgroundColor: "#0B0B0D", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#A1A1AA", whiteSpace: "pre-wrap" }}>
                {s.example}
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
