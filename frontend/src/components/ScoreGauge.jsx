import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";

const scoreColor = (v) => {
  if (v >= 75) return "#34C759";
  if (v >= 50) return "#FFCC00";
  return "#FF3B30";
};
const scoreLabel = (v) => {
  if (v >= 85) return "EXCELLENT";
  if (v >= 70) return "STRONG";
  if (v >= 50) return "DECENT";
  if (v >= 30) return "WEAK";
  return "POOR";
};

export default function ScoreGauge({ value = 0, size = 220, testid = "prompt-score-gauge", label = "PROMPT SCORE" }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    startRef.current = null;
    fromRef.current = display;
    let raf;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const clamp = Math.max(0, Math.min(100, display));
  const offset = circ * (1 - clamp / 100);
  const color = scoreColor(value);

  return (
    <Box
      data-testid={testid}
      sx={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          fill="none"
          style={{ transition: "stroke 0.3s ease" }}
        />
      </svg>
      <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Typography sx={{ fontSize: "0.6rem", fontFamily: "'IBM Plex Mono', monospace", color: "text.secondary", letterSpacing: "0.08em" }}>
          {label}
        </Typography>
        <Typography
          data-testid={`${testid}-value`}
          sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: size / 3.6, fontWeight: 700, color: "#EDEDED", lineHeight: 1, letterSpacing: "-0.04em" }}
        >
          {Math.round(display)}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.62rem",
            fontFamily: "'IBM Plex Mono', monospace",
            color,
            letterSpacing: "0.1em",
            mt: 0.5,
          }}
        >
          {scoreLabel(value)}
        </Typography>
      </Box>
    </Box>
  );
}
