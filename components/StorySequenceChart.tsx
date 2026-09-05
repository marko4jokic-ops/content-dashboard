"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
      <p className="text-xs font-semibold text-ink">Frame #{f.sequencePosition}</p>
      <p className="mt-0.5 text-[11px] text-dim">
        {fmtFull(f.views)} viewers · {fmtPct(f.retention, 1)} retained
      </p>
      <p className="text-[11px] text-faint">{fmtFull(f.replies)} reply messages</p>
    </div>
  );
}

/** Retention curve (line, left axis) with replies per frame (bars, right axis) —
 *  shows which frame in the sequence actually drove responses. */
export default function StorySequenceChart({ frames }: { frames: StoryFrame[] }) {
  const data = [...frames].sort((a, b) => a.sequencePosition - b.sequencePosition);

  if (data.length < 2) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-faint">
        Single-frame sequence — nothing to plot.
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#242427" vertical={false} />
          <XAxis
            dataKey="sequencePosition"
            tickFormatter={(v: number) => `#${v}`}
            tick={{ fill: "#68686e", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#242427" }}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="retention"
            width={40}
            domain={[0, 1]}
            tick={{ fill: "#68686e", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          />
          <YAxis
            yAxisId="replies"
            orientation="right"
            width={30}
            allowDecimals={false}
            tick={{ fill: "#68686e", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#33333a", strokeWidth: 1 }}
          />
          <Bar
            yAxisId="replies"
            dataKey="replies"
            fill="#3a3a40"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
          <Line
            yAxisId="retention"
            type="linear"
            dataKey="retention"
            stroke="#ffde59"
            strokeWidth={2}
            dot={{ r: 3, fill: "#ffde59", stroke: "#0c0c0e", strokeWidth: 1 }}
            activeDot={{ r: 5, fill: "#ffde59", stroke: "#0c0c0e", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
