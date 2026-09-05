"use client";

import { useMemo, useState } from "react";
import type { StoryFrame } from "@/lib/windsor";
import { fmtCompact, fmtDateTime, fmtFull, fmtPct } from "@/lib/format";

type SortKey =
  | "time"
  | "views"
  | "reach"
  | "exits"
  | "exitRate"
  | "replies"
  | "shares";

type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  numeric: boolean;
  accessor: (f: StoryFrame) => string | number;
  /** shown as a title tooltip on the header — used to disambiguate replies/shares */
  hint?: string;
}

const REPLIES_HINT =
  "Counts reply messages, not unique repliers — one viewer can reply more than once.";
const SHARES_HINT =
  "Counts share actions, not unique sharers — one viewer can share more than once.";

const COLUMNS: Column[] = [
  { key: "time", label: "Time", numeric: false, accessor: (f) => f.timestamp ?? "" },
  { key: "views", label: "Views", numeric: true, accessor: (f) => f.views },
  { key: "reach", label: "Reach", numeric: true, accessor: (f) => f.reach },
  { key: "exits", label: "Exits", numeric: true, accessor: (f) => f.exits },
  {
    key: "exitRate",
    label: "Exit rate",
    numeric: true,
    accessor: (f) => f.exitRate,
  },
  {
    key: "replies",
    label: "Replies",
    numeric: true,
    accessor: (f) => f.replies,
    hint: REPLIES_HINT,
  },
  {
    key: "shares",
    label: "Shares",
    numeric: true,
    accessor: (f) => f.shares,
    hint: SHARES_HINT,
  },
];

interface StoryFramesTableProps {
  frames: StoryFrame[];
}

export default function StoryFramesTable({ frames }: StoryFramesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey) ?? COLUMNS[0];
    const factor = sortDir === "asc" ? 1 : -1;
    return [...frames].sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * factor;
      }
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [frames, sortKey, sortDir]);

  function toggleSort(col: Column) {
    if (col.key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir(col.numeric ? "desc" : "asc");
    }
  }

  function openFrame(frame: StoryFrame) {
    if (!frame.permalink) return;
    window.open(frame.permalink, "_blank", "noopener,noreferrer");
  }

  if (!frames.length) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-faint">
        No stories in this range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-edge text-left">
            <th className="w-14 px-3 py-2.5" aria-label="Thumbnail" />
            {COLUMNS.map((col) => {
              const active = col.key === sortKey;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    active
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={`px-3 py-2.5 font-medium ${
                    col.numeric ? "text-right" : "text-left"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col)}
                    title={col.hint}
                    className={`group inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                      col.numeric ? "flex-row-reverse" : ""
                    } ${active ? "text-gold" : "text-faint hover:text-dim"}`}
                  >
                    <span>{col.label}</span>
                    <span className="text-[9px] leading-none">
                      {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((frame) => {
            const clickable = Boolean(frame.permalink);
            return (
              <tr
                key={`${frame.date}-${frame.id}`}
                onClick={() => openFrame(frame)}
                className={`border-b border-edge/60 transition-colors ${
                  clickable
                    ? "cursor-pointer hover:bg-panel2/60"
                    : "cursor-default"
                }`}
                title={clickable ? "Open story on Instagram" : undefined}
              >
                <td className="px-3 py-2.5">
                  <div className="h-11 w-8 overflow-hidden rounded-md border border-edge bg-panel2">
                    {frame.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={frame.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] text-faint">
                        #{frame.position}
                      </div>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-dim tabular-nums">
                  {fmtDateTime(frame.timestamp)}
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-ink tabular-nums">
                  <span title={fmtFull(frame.views)}>{fmtCompact(frame.views)}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-dim tabular-nums">
                  <span title={fmtFull(frame.reach)}>{fmtCompact(frame.reach)}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-dim tabular-nums">
                  {fmtCompact(frame.exits)}
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-gold tabular-nums">
                  {fmtPct(frame.exitRate, 1)}
                </td>
                <td className="px-3 py-2.5 text-right text-dim tabular-nums">
                  {fmtCompact(frame.replies)}
                </td>
                <td className="px-3 py-2.5 text-right text-dim tabular-nums">
                  {fmtCompact(frame.shares)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
