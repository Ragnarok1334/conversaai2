"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

const data = [
  { value: 12 },
  { value: 18 },
  { value: 14 },
  { value: 28 },
  { value: 22 },
  { value: 36 },
  { value: 42 },
];

export function MiniChart() {
  return (
    <div className="w-full" style={{ height: 80, minHeight: 80 }}>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorChart" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
            </linearGradient>
          </defs>

          <Area
            type="monotone"
            dataKey="value"
            stroke="#06B6D4"
            strokeWidth={3}
            fill="url(#colorChart)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}