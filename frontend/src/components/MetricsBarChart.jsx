import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RADAR_KEYS, findMetric } from "../lib/metrics";

const colorFor = (value, higherIsBetter) => {
  const v = higherIsBetter ? value : 100 - value;
  if (v >= 75) return "#34C759";
  if (v >= 50) return "#FFCC00";
  return "#FF3B30";
};

export default function MetricsBarChart({ result, definitions, height = 380 }) {
  const data = RADAR_KEYS.map((k) => {
    const def = findMetric(definitions, k);
    return {
      key: k,
      label: def.label,
      higher_is_better: def.higher_is_better,
      value: result[k] ?? 0,
    };
  });

  return (
    <div data-testid="metrics-bar-chart" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, bottom: 8, left: 20 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fill: "#EDEDED", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              backgroundColor: "#000",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 2,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
            }}
            formatter={(v, _n, ctx) => [
              `${v}/100 · ${ctx.payload.higher_is_better ? "higher=better" : "lower=better"}`,
              ctx.payload.label,
            ]}
          />
          <Bar dataKey="value" isAnimationActive>
            {data.map((d) => (
              <Cell key={d.key} fill={colorFor(d.value, d.higher_is_better)} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              style={{ fill: "#EDEDED", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
