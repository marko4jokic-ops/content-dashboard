"use client";

import { useMemo, useState } from "react";
import type { Post } from "@/lib/windsor";
import {
  fmtCompact,
  fmtDate,
  fmtFull,
  fmtMultiplier,
  fmtPct,
  fmtSeconds,
  truncate,
} from "@/lib/format";

type SortKey =
  | "date"
  | "type"
  | "caption"
  | "views"
  | "reach"
  | "likes"
  | "comments"
  | "saves"
  | "shares"
  | "watch"
  | "replay"
  | "er";

type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  numeric: boolean;
  accessor: (p: Post) => string | number;
}

const COLUMNS: Column[] = [
  { key: "date", label: "Date", numeric: false, accessor: (p) => p.date ?? "" },
  { key: "type", label: "Type", numeric: false, accessor: (p) => p.type },
  {
    key: "caption",
    label: "Caption",
    numeric: false,
    accessor: (p) => p.caption.toLowerCase(),
  },
  { key: "views", label: "Views", numeric: true, accessor: (p) => p.views },
  { key: "reach", label: "Reach", numeric: true, accessor: (p) => p.reach },
  { key: "likes", label: "Likes", numeric: true, accessor: (p) => p.likes },
  {
    key: "comments",
    label: "Comments",
    numeric: true,
    accessor: (p) => p.comments,
  },
  { key: "saves", label: "Saves", numeric: true, accessor: (p) => p.saves },
  { key: "shares", label: "Shares", numeric: true, accessor: (p) => p.shares },
  {
    key: "watch",
    label: "Watch",
    numeric: true,
    accessor: (p) => p.avgWatchTimeMs ?? -1,
  },
  {
    key: "replay",
    label: "Replay",
    numeric: true,
    accessor: (p) => p.replayRate,
  },
  { key: "er", label: "ER", numeric: true, accessor: (p) => p.engagementRate },
];

function typeBadgeClass(type: string): string {
  const t = type.toUpperCase();
  if (t.includes("REEL") || t.includes("VIDEO"))
    return "border-gold-deep/30 bg-gold-wash/40 text-gold";
  if (t.includes("CAROUSEL") || t.includes("ALBUM"))
    return "border-edge-strong bg-panel2 text-dim";
  return "border-edge-strong bg-panel2 text-dim";
}

interface PostsTableProps {
  posts: Post[];
}

export default function PostsTable({ posts }: PostsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey) ?? COLUMNS[0];
    const factor = sortDir === "asc" ? 1 : -1;
    return [...posts].sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * factor;
      }
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [posts, sortKey, sortDir]);

  function toggleSort(col: Column) {
    if (col.key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir(col.numeric ? "desc" : "asc");
    }
  }

  function openPost(post: Post) {
    if (!post.permalink) return;
    window.open(post.permalink, "_blank", "noopener,noreferrer");
  }

  if (!posts.length) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-faint">
        No posts to show for this date range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[1040px] border-collapse text-sm">
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
          {sorted.map((post) => {
            const clickable = Boolean(post.permalink);
            return (
              <tr
                key={post.id}
                onClick={() => openPost(post)}
                className={`border-b border-edge/60 transition-colors ${
                  clickable
                    ? "cursor-pointer hover:bg-panel2/60"
                    : "cursor-default"
                }`}
                title={clickable ? "Open on Instagram" : undefined}
              >
                <td className="px-3 py-2.5">
                  <div className="h-9 w-9 overflow-hidden rounded-md border border-edge bg-panel2">
                    {post.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-faint">
                        {post.type.charAt(0)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-dim tabular-nums">
                  {fmtDate(post.date)}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${typeBadgeClass(
                      post.type,
                    )}`}
                  >
                    {post.type.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="max-w-[280px] px-3 py-2.5 text-dim">
                  <span title={post.caption || undefined}>
                    {post.caption ? truncate(post.caption, 72) : "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-ink tabular-nums">
                  <span title={fmtFull(post.views)}>
                    {fmtCompact(post.views)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-dim tabular-nums">
                  <span title={fmtFull(post.reach)}>
                    {fmtCompact(post.reach)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-dim tabular-nums">
                  {fmtCompact(post.likes)}
                </td>
                <td className="px-3 py-2.5 text-right text-dim tabular-nums">
                  {fmtCompact(post.comments)}
                </td>
                <td className="px-3 py-2.5 text-right text-dim tabular-nums">
                  {fmtCompact(post.saves)}
                </td>
                <td className="px-3 py-2.5 text-right text-dim tabular-nums">
                  {fmtCompact(post.shares)}
                </td>
                <td className="px-3 py-2.5 text-right text-dim tabular-nums">
                  {fmtSeconds(post.avgWatchTimeMs)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right tabular-nums ${
                    post.replayRate > 1 ? "font-medium text-gold" : "text-dim"
                  }`}
                  title={
                    post.replayRate > 1
                      ? "Average viewer watched more than once"
                      : undefined
                  }
                >
                  {post.reach > 0 ? fmtMultiplier(post.replayRate) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-gold tabular-nums">
                  {fmtPct(post.engagementRate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
