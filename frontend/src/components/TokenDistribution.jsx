import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

/**
 * Token distribution donut + legend.
 * Segments come from backend: { name, value, color }.
 */
export default function TokenDistribution({ segments = [], totalTokens }) {
  const total = totalTokens ?? segments.reduce((s, x) => s + x.value, 0);
  return (
    <Box data-testid="token-distribution" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, gap: 3, alignItems: "center" }}>
      <Box sx={{ position: "relative", width: 220, height: 220 }}>
        <ResponsiveContainer>
          <PieChart>
            <Tooltip
              contentStyle={{
                backgroundColor: "#000",
                border: "1px solid rgba(255,255,255,0.15)",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                borderRadius: 2,
              }}
              formatter={(v, n) => [`${v} tokens`, n]}
            />
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              innerRadius={64}
              outerRadius={100}
              paddingAngle={2}
              stroke="#0B0B0D"
              strokeWidth={2}
              isAnimationActive
            >
              {segments.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.8rem", color: "#EDEDED", lineHeight: 1 }}>
            {total}
          </Typography>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "text.secondary", letterSpacing: "0.06em" }}>
            TOKENS
          </Typography>
        </Box>
      </Box>
      <Stack spacing={0.75} data-testid="token-distribution-legend">
        {segments.map((s) => (
          <Stack direction="row" spacing={1.5} alignItems="center" key={s.name}>
            <Box sx={{ width: 10, height: 10, backgroundColor: s.color, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", color: "#EDEDED", minWidth: 110 }}>
              {s.name}
            </Typography>
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", color: "text.secondary" }}>
              {s.value}
            </Typography>
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "text.secondary" }}>
              · {total ? Math.round((s.value / total) * 100) : 0}%
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
