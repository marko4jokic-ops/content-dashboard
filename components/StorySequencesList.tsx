"use client";

import { useMemo, useState } from "react";
import type { StorySequence } from "@/lib/windsor";
import { fmtDateTime, fmtFull, fmtPct } from "@/lib/format";
import StorySequenceChart from "@/components/StorySequenceChart";

type SortMode = "replies" | "completion" | "date";

const SORT_LABEL: Record<SortMode, string> = {
  replies: "Replies",
  completion: "Completion",
  date: "Date",
};

const REPLIES_HINT =
  "Counts reply messages, not unique repliers — one viewer can reply more than once.";

export default function StorySequencesList({
  sequences,
}: {
  sequences: StorySequence[];
}) {
  const [sort, setSort] = useState<SortMode>("replies");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const copy = [...sequences];
    if (sort === "replies") copy.sort((a, b) => b.totalReplies - a.totalReplies);
    else if (sort === "completion")
      copy.sort((a, b) => b.completionRate - a.completionRate);
    else
      copy.sort((a, b) =>
        (b.frames[0]?.timestamp ?? "").localeCompare(a.frames[0]?.timestamp ?? ""),
      );
    return copy;
  }, [sequences, sort]);

  if (!sequences.length) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-faint">
        No story sequences this month.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1">
        <span className="mr-1 text-xs text-faint">Sort by</span>
        {(Object.keys(SORT_LABEL) as SortMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSort(m)}
            aria-pressed={sort === m}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              sort === m
                ? "bg-gradient-to-br from-gold to-gold-deep text-black"
                : "text-dim hover:text-ink"
            }`}
          >
            {SORT_LABEL[m]}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {sorted.map((seq) => {
          const open = expandedId === seq.id;
          return (
            <li key={seq.id} className="glass overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : seq.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {fmtDateTime(seq.frames[0]?.timestamp)}
                    <span className="ml-2 text-xs font-normal text-faint">
                      {seq.frameCount} {seq.frameCount === 1 ? "frame" : "frames"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-dim" title={REPLIES_HINT}>
                    {fmtFull(seq.totalReplies)} replies · {fmtFull(seq.totalShares)}{" "}
                    shares
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-gold">
                      {fmtPct(seq.completionRate, 1)}
                    </p>
                    <p className="text-[11px] text-faint">completion</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`text-xs text-faint transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </div>
              </button>
              {open && (
                <div className="border-t border-edge px-4 py-4">
                  <StorySequenceChart frames={seq.frames} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
