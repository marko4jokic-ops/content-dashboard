"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { Post } from "@/lib/windsor";
import { fmtCompact, fmtFull, fmtShortDate, truncate } from "@/lib/format";

interface ViewsChartProps {
  posts: Post[];
}

interface Datum {
  key: string;
  label: string;
  views: number;
  caption: string;
  date: string | null;
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload as Datum | undefined;
  if (!d) return null;
  return (
    <div className="max-w-[240px] rounded-lg border border-edge-strong bg-[#0c0c0e] px-3 py-2 shadow-glass">
      <p className="text-xs font-semibold text-ink">
        {fmtFull(d.views)} views
      </p>
      <p className="mt-0.5 text-[11px] text-faint">
        {d.date ? fmtShortDate(d.date) : "Undated"}
      </p>
      {d.caption && (
        <p className="mt-1 text-[11px] leading-snug text-dim">
          {truncate(d.caption, 84)}
        </p>
      )}
    </div>
  );
}

export default function ViewsChart({ posts }: ViewsChartProps) {
  const data = useMemo<Datum[]>(() => {
    return [...posts]
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
      .map((p, i) => ({
        key: p.id || `p-${i}`,
        label: p.date ? fmtShortDate(p.date) : `#${i + 1}`,
        views: p.views,
        caption: p.caption,
        date: p.date,
      }));
  }, [posts]);

  const showTicks = data.length <= 16;

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-faint">
        No posts in this range.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 4, left: 4 }}
          barCategoryGap="22%"
        >
          <defs>
            <linearGradient id="goldBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffe680" />
              <stop offset="100%" stopColor="#f2c218" />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#242427"
            strokeDasharray="0"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            hide={!showTicks}
            tick={{ fill: "#68686e", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#242427" }}
            interval="preserveStartEnd"
            minTickGap={16}
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
            cursor={{ fill: "rgba(255,222,89,0.06)" }}
          />
          <Bar dataKey="views" radius={[4, 4, 0, 0]} maxBarSize={44}>
            {data.map((d) => (
              <Cell key={d.key} fill="url(#goldBar)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
