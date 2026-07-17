import React from "react";
import { diffWords } from "diff";
import { Box, Typography, ToggleButton, ToggleButtonGroup, Stack } from "@mui/material";

/**
 * WordDiff — inline red/green word-level diff.
 * mode: "unified" | "split"
 */
export default function WordDiff({ original = "", optimized = "", mode = "unified" }) {
  const parts = diffWords(original || "", optimized || "");

  if (mode === "split") {
    return (
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} data-testid="word-diff-split">
        <Box sx={boxSx} data-testid="word-diff-original">
          <Header text="ORIGINAL" />
          <Body>
            {parts.map((p, i) =>
              p.added ? null : (
                <span
                  key={i}
                  style={{
                    backgroundColor: p.removed ? "rgba(255,59,48,0.22)" : "transparent",
                    color: p.removed ? "#FF9B94" : "#EDEDED",
                    textDecoration: p.removed ? "line-through" : "none",
                  }}
                >
                  {p.value}
                </span>
              )
            )}
          </Body>
        </Box>
        <Box sx={boxSx} data-testid="word-diff-optimized">
          <Header text="OPTIMIZED" />
          <Body>
            {parts.map((p, i) =>
              p.removed ? null : (
                <span
                  key={i}
                  style={{
                    backgroundColor: p.added ? "rgba(52,199,89,0.18)" : "transparent",
                    color: p.added ? "#8FEBA7" : "#EDEDED",
                  }}
                >
                  {p.value}
                </span>
              )
            )}
          </Body>
        </Box>
      </Stack>
    );
  }

  return (
    <Box sx={boxSx} data-testid="word-diff-unified">
      <Header text="UNIFIED DIFF" />
      <Body>
        {parts.map((p, i) => {
          const bg = p.added
            ? "rgba(52,199,89,0.18)"
            : p.removed
            ? "rgba(255,59,48,0.22)"
            : "transparent";
          const color = p.added ? "#8FEBA7" : p.removed ? "#FF9B94" : "#EDEDED";
          return (
            <span
              key={i}
              style={{
                backgroundColor: bg,
                color,
                textDecoration: p.removed ? "line-through" : "none",
              }}
            >
              {p.value}
            </span>
          );
        })}
      </Body>
    </Box>
  );
}

export function WordDiffModeToggle({ mode, onChange }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={mode}
      onChange={(_e, v) => v && onChange(v)}
      data-testid="diff-mode-toggle"
      sx={{
        "& .MuiToggleButton-root": {
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "0.65rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderRadius: 0,
          borderColor: "rgba(255,255,255,0.12)",
          color: "text.secondary",
          px: 1.5,
          "&.Mui-selected": {
            backgroundColor: "rgba(239,239,239,0.1)",
            color: "#EFEFEF",
          },
        },
      }}
    >
      <ToggleButton value="unified" data-testid="diff-unified-btn">Unified</ToggleButton>
      <ToggleButton value="split" data-testid="diff-split-btn">Split</ToggleButton>
    </ToggleButtonGroup>
  );
}

const boxSx = {
  border: "1px solid rgba(255,255,255,0.08)",
  backgroundColor: "#0E0E10",
  flex: 1,
  minWidth: 0,
};

const Header = ({ text }) => (
  <Box
    sx={{
      p: 1.25,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      backgroundColor: "#121214",
    }}
  >
    <Typography variant="h6" sx={{ fontSize: "0.68rem" }}>{text}</Typography>
  </Box>
);

const Body = ({ children }) => (
  <Box
    sx={{
      p: 2,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "0.82rem",
      lineHeight: 1.65,
      whiteSpace: "pre-wrap",
      color: "#EDEDED",
      minHeight: 220,
      overflow: "auto",
    }}
  >
    {children}
  </Box>
);
