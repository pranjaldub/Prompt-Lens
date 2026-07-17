import React from "react";
import {
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { RADAR_KEYS, findMetric } from "../lib/metrics";

/**
 * Radar chart — always displays value normalized so higher = better on-screen.
 * If `secondScores` is provided, renders a second overlay (for compare page).
 */
export default function ScoreRadar({ scores, secondScores, definitions, height = 340, labelA = "A", labelB = "B" }) {
  const build = (s) =>
    RADAR_KEYS.map((k) => {
      const def = findMetric(definitions, k);
      const raw = s?.[k] ?? 0;
      const displayed = def.higher_is_better ? raw : 100 - raw;
      return { metric: def.label, key: k, [labelA]: displayed };
    });

  const dataA = build(scores);
  const data = secondScores
    ? build(scores).map((row, i) => {
        const def = findMetric(definitions, row.key);
        const raw = secondScores[row.key] ?? 0;
        const displayed = def.higher_is_better ? raw : 100 - raw;
        return { ...row, [labelB]: displayed };
      })
    : dataA;

  return (
    <div data-testid="score-radar" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }}
            axisLine={false}
          />
          <Radar name={labelA} dataKey={labelA} stroke="#007AFF" fill="#007AFF" fillOpacity={0.28} strokeWidth={1.5} isAnimationActive />
          {secondScores && (
            <Radar name={labelB} dataKey={labelB} stroke="#FF3B30" fill="#FF3B30" fillOpacity={0.18} strokeWidth={1.5} isAnimationActive />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: "#000",
              border: "1px solid rgba(255,255,255,0.15)",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              borderRadius: 2,
            }}
            labelStyle={{ color: "#EFEFEF" }}
          />
          {secondScores && (
            <Legend
              wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#EDEDED" }}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
