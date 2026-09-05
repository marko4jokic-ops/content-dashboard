"use client";

import {
  Bar,
  BarChart,
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
      <p className="text-xs font-semibold text-ink">
        {fmtFull(d.followerActivity)} follow / unfollow events
      </p>
      <p className="mt-0.5 text-[11px] text-faint">{fmtShortDate(d.date)}</p>
    </div>
  );
}

export default function FollowerActivityChart({
  days,
}: {
  days: DailyPoint[];
}) {
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
        <BarChart
          data={days}
          margin={{ top: 8, right: 8, bottom: 4, left: 4 }}
          barCategoryGap="18%"
        >
          <defs>
            <linearGradient id="goldActivityBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffe680" />
              <stop offset="100%" stopColor="#f2c218" />
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
            allowDecimals={false}
            tickFormatter={(v: number) => fmtCompact(v)}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(255,222,89,0.06)" }}
          />
          <Bar
            dataKey="followerActivity"
            fill="url(#goldActivityBar)"
            radius={[3, 3, 0, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
