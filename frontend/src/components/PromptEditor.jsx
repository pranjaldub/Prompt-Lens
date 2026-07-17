import React, { useEffect, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { Box, Typography } from "@mui/material";

// Force Monaco to load from the CDN so it works in the sandboxed dev server
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs",
  },
});

export default function PromptEditor({ value, onChange, disabled }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Define custom theme once editor is ready
  }, []);

  return (
    <Box
      data-testid="prompt-editor-wrapper"
      sx={{
        position: "relative",
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "#121214",
        minHeight: 360,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          p: 1.5,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" sx={{ fontSize: "0.7rem" }}>
          PROMPT
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem" }}>
          {(value || "").length} chars
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 320 }}>
        <Editor
          height="380px"
          defaultLanguage="markdown"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("promptlens", {
              base: "vs-dark",
              inherit: true,
              rules: [],
              colors: {
                "editor.background": "#121214",
                "editor.foreground": "#EDEDED",
                "editorLineNumber.foreground": "#3F3F46",
                "editorCursor.foreground": "#EFEFEF",
                "editor.selectionBackground": "#264F78",
                "editor.lineHighlightBackground": "#18181B",
                "editorWhitespace.foreground": "#27272A",
              },
            });
          }}
          onMount={(editor, monaco) => {
            monaco.editor.setTheme("promptlens");
            setReady(true);
          }}
          theme="promptlens"
          options={{
            readOnly: disabled,
            minimap: { enabled: false },
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            fontSize: 13,
            wordWrap: "on",
            lineNumbers: "on",
            renderLineHighlight: "line",
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            automaticLayout: true,
          }}
          loading={
            <Box sx={{ p: 3, color: "text.secondary", fontFamily: "'IBM Plex Mono', monospace" }}>
              Loading editor…
            </Box>
          }
        />
      </Box>
    </Box>
  );
}
