"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { DailyPoint } from "@/lib/windsor";
import { fmtCompact, fmtFull, fmtShortDate } from "@/lib/format";

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload as DailyPoint | undefined;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-edge-strong bg-[#0c0c0e] px-3 py-2 shadow-glass">
      <p className="text-xs font-semibold text-ink">{fmtFull(d.views)} views</p>
      <p className="mt-0.5 text-[11px] text-faint">{fmtShortDate(d.date)}</p>
      <p className="mt-1 text-[11px] text-dim">{fmtFull(d.reach)} reach</p>
    </div>
  );
}

export default function DailyViewsChart({ days }: { days: DailyPoint[] }) {
  if (!days.length) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-faint">
        No daily data for this account.
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={days} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2c218" stopOpacity={0.34} />
              <stop offset="100%" stopColor="#f2c218" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#242427" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => fmtShortDate(v)}
            tick={{ fill: "#68686e", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#242427" }}
            minTickGap={28}
          />
          <YAxis
            width={44}
            tick={{ fill: "#68686e", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmtCompact(v)}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#33333a", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke="#ffde59"
            strokeWidth={2}
            fill="url(#goldArea)"
            activeDot={{
              r: 4,
              fill: "#ffde59",
              stroke: "#0c0c0e",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
