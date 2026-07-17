import React from "react";
import { Box, Grid, Typography, IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text);
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Panel = ({ title, text, tokens, testid, onCopy, onDownload }) => (
  <Box
    data-testid={testid}
    sx={{
      border: "1px solid rgba(255,255,255,0.08)",
      backgroundColor: "#0E0E10",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 1.5,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "#121214",
      }}
    >
      <Typography variant="h6" sx={{ fontSize: "0.7rem" }}>
        {title} · {tokens} tokens
      </Typography>
      <Box>
        <Tooltip title="Copy">
          <IconButton size="small" data-testid={`${testid}-copy`} onClick={onCopy} sx={{ color: "text.secondary" }}>
            <ContentCopyIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <IconButton size="small" data-testid={`${testid}-download`} onClick={onDownload} sx={{ color: "text.secondary" }}>
            <DownloadIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
    <Box
      sx={{
        p: 2,
        flex: 1,
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
        fontSize: "0.82rem",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        overflow: "auto",
        color: "#EDEDED",
        minHeight: 220,
      }}
    >
      {text}
    </Box>
  </Box>
);

export default function OptimizedDiff({ original, optimized, originalTokens, optimizedTokens }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Panel
          testid="original-panel"
          title="ORIGINAL"
          text={original}
          tokens={originalTokens}
          onCopy={() => copyToClipboard(original)}
          onDownload={() => download("original-prompt.txt", original)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Panel
          testid="optimized-panel"
          title="OPTIMIZED"
          text={optimized}
          tokens={optimizedTokens}
          onCopy={() => copyToClipboard(optimized)}
          onDownload={() => download("optimized-prompt.txt", optimized)}
        />
      </Grid>
    </Grid>
  );
}
