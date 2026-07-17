import React, { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";

/**
 * Live token stream console. Renders a monospaced feed and auto-scrolls.
 */
export default function StreamingConsole({ text, title = "MODEL STREAM", height = 220 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);
  return (
    <Box
      data-testid="streaming-console"
      sx={{
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "#0B0B0D",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
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
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            backgroundColor: "#FF3B30",
            animation: "pl-pulse 1.2s ease-in-out infinite",
            "@keyframes pl-pulse": {
              "0%,100%": { opacity: 1 },
              "50%": { opacity: 0.25 },
            },
          }}
        />
        <Typography variant="h6" sx={{ fontSize: "0.65rem" }}>{title}</Typography>
      </Box>
      <Box
        ref={ref}
        sx={{
          height,
          p: 1.5,
          overflowY: "auto",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.78rem",
          lineHeight: 1.55,
          color: "#A1A1AA",
          whiteSpace: "pre-wrap",
        }}
        data-testid="streaming-console-body"
      >
        {text || "// awaiting first token…"}
      </Box>
    </Box>
  );
}
