"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { StoryFrame } from "@/lib/windsor";
import { fmtFull, fmtPct } from "@/lib/format";

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const f = payload[0]?.payload as StoryFrame | undefined;
  if (!f) return null;
  return (
    <div className="rounded-lg border border-edge-strong bg-[#0c0c0e] px-3 py-2 shadow-glass">
      <p className="text-xs font-semibold text-ink">Frame #{f.position}</p>
      <p className="mt-0.5 text-[11px] text-dim">{fmtFull(f.views)} viewers</p>
      <p className="text-[11px] text-faint">
        {f.position === 1 ? "first frame" : `${fmtPct(f.dropOff, 1)} lost vs previous`}
      </p>
      <p className="text-[11px] text-faint">{fmtPct(f.retention, 1)} of frame 1</p>
    </div>
  );
}

export default function StoryFunnelChart({ frames }: { frames: StoryFrame[] }) {
  const data = [...frames].sort((a, b) => a.position - b.position);

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#242427" vertical={false} />
          <XAxis
            dataKey="position"
            tickFormatter={(v: number) => `#${v}`}
            tick={{ fill: "#68686e", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#242427" }}
            allowDecimals={false}
          />
          <YAxis
            width={44}
            domain={[0, 1]}
            tick={{ fill: "#68686e", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#33333a", strokeWidth: 1 }}
          />
          <Line
            type="linear"
            dataKey="retention"
            stroke="#ffde59"
            strokeWidth={2}
            dot={{ r: 3, fill: "#ffde59", stroke: "#0c0c0e", strokeWidth: 1 }}
            activeDot={{ r: 5, fill: "#ffde59", stroke: "#0c0c0e", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
