import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function CostChart({ costs }) {
  const data = Object.entries(costs || {})
    .map(([name, cost]) => ({ name, cost: Number(cost) }))
    .sort((a, b) => b.cost - a.cost);

  return (
    <div data-testid="cost-chart" style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{
              fill: "#A1A1AA",
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
            angle={-30}
            textAnchor="end"
            height={70}
            interval={0}
          />
          <YAxis
            tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v.toFixed(4)}`}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              backgroundColor: "#000",
              border: "1px solid rgba(255,255,255,0.15)",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              borderRadius: 2,
            }}
            formatter={(v) => [`$${Number(v).toFixed(6)}`, "Cost"]}
          />
          <Bar dataKey="cost" fill="#FF3B30" radius={[0, 0, 0, 0]} isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
