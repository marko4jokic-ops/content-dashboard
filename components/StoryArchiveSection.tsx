"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ContentError,
  StoryArchivePayload,
  StoryMonthComparison,
} from "@/lib/windsor";
import {
  fmtCompact,
  fmtDate,
  fmtFull,
  fmtMonth,
  fmtPct,
  fmtRelative,
} from "@/lib/format";
import StatCard from "@/components/StatCard";
import StoryHighlightCard from "@/components/StoryHighlightCard";
import StoryFunnelChart from "@/components/StoryFunnelChart";
import StoryFramesTable from "@/components/StoryFramesTable";
import StorySequencesList from "@/components/StorySequencesList";

type ArchiveResponse = StoryArchivePayload | ContentError;

function isError(r: ArchiveResponse): r is ContentError {
  return "error" in r;
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[260px] items-center justify-center px-6 text-center text-sm text-faint">
      {children}
    </div>
  );
}

function ComparisonCard({ comparison }: { comparison: StoryMonthComparison[] }) {
  return (
    <div className="glass grid gap-5 rounded-2xl p-5 sm:grid-cols-3">
      {comparison.map((c) => {
        const hasDelta = c.deltaPct != null;
        const improved = hasDelta && c.deltaPct! > 0;
        const declined = hasDelta && c.deltaPct! < 0;
        const display =
          c.current == null
            ? "—"
            : c.metric === "viewers"
              ? fmtCompact(c.current)
              : fmtPct(c.current, 1);
        return (
          <div key={c.metric}>
            <p className="text-[10px] uppercase tracking-[0.12em] text-faint">
              {c.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
              {display}
            </p>
            <p
              className={`mt-0.5 text-xs tabular-nums ${
                improved ? "text-gold" : declined ? "text-red-400/80" : "text-faint"
              }`}
            >
              {hasDelta
                ? `${c.deltaPct! > 0 ? "+" : ""}${(c.deltaPct! * 100).toFixed(1)}% vs prior month`
                : "no prior month to compare"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function StoryArchiveSection({
  refreshNonce,
}: {
  refreshNonce: number;
}) {
  const [data, setData] = useState<StoryArchivePayload | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const lastNonce = useRef(refreshNonce);

  const load = useCallback(async (m: string | null, force: boolean) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (m) params.set("month", m);
      if (force) params.set("refresh", "1");
      const qs = params.toString();
      const res = await fetch(`/api/stories/archive${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ArchiveResponse;
      if (id !== reqId.current) return;
      if (isError(json)) {
        if (json.error !== "missing_api_key") {
          setError(json.message ?? "Could not load the story archive.");
        }
        return;
      }
      setData(json);
      setMonth((cur) => cur ?? json.selectedMonth);
    } catch {
      if (id === reqId.current) {
        setError("Network error while loading the story archive.");
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(null, false);
  }, [load]);

  useEffect(() => {
    if (lastNonce.current === refreshNonce) return;
    lastNonce.current = refreshNonce;
    void load(month, true);
  }, [refreshNonce, month, load]);

  function selectMonth(m: string) {
    setMonth(m);
    void load(m, false);
  }

  const skeleton = loading && !data;
  const monthData = data?.data ?? null;
  const agg = monthData?.aggregates;
  const frames = monthData?.frames ?? [];

  const funnelDays = useMemo(() => {
    return Array.from(new Set(frames.map((f) => f.date))).sort((a, b) =>
      b.localeCompare(a),
    );
  }, [frames]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDay((cur) => {
      if (cur && funnelDays.includes(cur)) return cur;
      const multiFrame = funnelDays.find(
        (d) => frames.filter((f) => f.date === d).length >= 2,
      );
      return multiFrame ?? funnelDays[0] ?? null;
    });
  }, [funnelDays, frames]);

  const dayFrames = useMemo(
    () =>
      selectedDay
        ? frames
            .filter((f) => f.date === selectedDay)
            .sort((a, b) => a.position - b.position)
        : [],
    [frames, selectedDay],
  );

  return (
    <section className="space-y-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold text-ink">
          Monthly archive
          <span className="ml-2 text-xs font-normal text-faint">
            {data?.coverageSince
              ? `archive covers ${fmtDate(data.coverageSince)} → today`
              : "no snapshots recorded yet"}
          </span>
        </h2>
        {data?.fetchedAt && (
          <span className="text-xs text-faint">
            {data.stale
              ? "showing last good data"
              : data.cached
                ? `cached ${fmtRelative(data.fetchedAt)}`
                : `updated ${fmtRelative(data.fetchedAt)}`}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200">
          {error}
        </div>
      )}

      {skeleton ? (
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-lg bg-panel2/50" />
          ))}
        </div>
      ) : data && data.months.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {data.months.map((m) => {
            const active = m.month === month;
            return (
              <button
                key={m.month}
                type="button"
                onClick={() => selectMonth(m.month)}
                aria-pressed={active}
                title={
                  m.partial
                    ? "Partial month — archive coverage begins mid-month"
                    : undefined
                }
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-transparent bg-gradient-to-br from-gold to-gold-deep text-black"
                    : "border-edge bg-panel/60 text-dim hover:text-ink"
                }`}
              >
                {fmtMonth(m.month)} · {m.frameCount}
                {m.partial && <span className="ml-1">*</span>}
              </button>
            );
          })}
        </div>
      ) : (
        !error && (
          <div className="rounded-xl border border-edge bg-panel/50 px-4 py-3 text-sm text-dim">
            No story archive yet. Once /api/stories/snapshot has run at least once
            (or the dashboard catches a live story), months will show up here.
          </div>
        )
      )}

      {monthData?.partial && (
        <div className="rounded-xl border border-gold-deep/30 bg-gold-wash/30 px-4 py-2.5 text-xs text-gold">
          {fmtMonth(monthData.month)} is a partial month — archive coverage begins{" "}
          {fmtDate(monthData.coverageSince)}, not the 1st. Totals below only cover
          the days actually recorded.
        </div>
      )}

      {monthData && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Frames posted"
              value={fmtFull(agg?.totalFrames)}
              loading={skeleton}
              accent
            />
            <StatCard
              label="Total viewers"
              value={fmtCompact(agg?.totalViewers)}
              sub={agg ? `${fmtFull(agg.totalViewers)} exact` : undefined}
              loading={skeleton}
            />
            <StatCard
              label="Avg viewers / frame"
              value={agg ? fmtFull(Math.round(agg.avgViewsPerFrame)) : "—"}
              loading={skeleton}
            />
            <StatCard
              label="Avg completion"
              value={
                agg && agg.completionDayCount > 0 ? fmtPct(agg.avgCompletion, 1) : "—"
              }
              loading={skeleton}
              accent
            />
            <StatCard
              label="Avg exit rate"
              value={fmtPct(agg?.avgExitRate, 1)}
              loading={skeleton}
            />
            <StatCard
              label="Replies"
              value={agg ? fmtFull(agg.totalReplies) : "—"}
              sub="messages, not unique repliers"
              loading={skeleton}
            />
          </section>

          {monthData.comparison.length > 0 && (
            <ComparisonCard comparison={monthData.comparison} />
          )}

          {(agg?.bestRepliesSequence || agg?.bestRepliesFrame) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {agg.bestRepliesSequence && (
                <StoryHighlightCard
                  label="Best replying sequence"
                  context={`${fmtDate(agg.bestRepliesSequence.date)} · ${agg.bestRepliesSequence.frameCount} frames`}
                  primary={`${fmtFull(agg.bestRepliesSequence.totalReplies)} replies`}
                  secondary={`${fmtPct(agg.bestRepliesSequence.completionRate, 1)} completion`}
                />
              )}
              {agg.bestRepliesFrame && (
                <StoryHighlightCard
                  label="Best replying frame"
                  context={`${fmtDate(agg.bestRepliesFrame.date)} · frame #${agg.bestRepliesFrame.position}`}
                  primary={`${fmtFull(agg.bestRepliesFrame.replies)} replies`}
                  secondary={`${fmtFull(agg.bestRepliesFrame.views)} views`}
                />
              )}
            </div>
          )}

          <section className="glass rounded-2xl p-5">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">
                Frame-to-frame drop-off
                <span className="ml-2 text-xs font-normal text-faint">
                  {fmtMonth(monthData.month)}
                </span>
              </h3>
              {funnelDays.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-faint">
                  Day
                  <select
                    value={selectedDay ?? ""}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="rounded-lg border border-edge bg-panel px-2 py-1 text-xs text-ink"
                  >
                    {funnelDays.map((d) => (
                      <option key={d} value={d}>
                        {fmtDate(d)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {dayFrames.length >= 2 ? (
              <StoryFunnelChart frames={dayFrames} />
            ) : (
              <EmptyChart>
                {dayFrames.length === 1
                  ? "Only one frame recorded on this day — a drop-off funnel needs at least two."
                  : "No stories on the selected day."}
              </EmptyChart>
            )}
          </section>

          <section className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-ink">Story sequences</h3>
              <span className="text-xs text-faint">
                {monthData.sequences.length}{" "}
                {monthData.sequences.length === 1 ? "sequence" : "sequences"}
              </span>
            </div>
            <StorySequencesList sequences={monthData.sequences} />
          </section>

          <section className="glass rounded-2xl">
            <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
              <h3 className="text-sm font-semibold text-ink">Story frames</h3>
              <span className="text-xs text-faint">
                {frames.length} in {fmtMonth(monthData.month)} · click a column to
                sort
              </span>
            </div>
            <div className="px-2 pb-2">
              <StoryFramesTable frames={frames} />
            </div>
          </section>
        </>
      )}

      {data && data.months.length > 0 && !monthData && !error && (
        <div className="rounded-xl border border-edge bg-panel/50 px-4 py-3 text-sm text-dim">
          No stories recorded for {fmtMonth(month)}.
        </div>
      )}
    </section>
  );
}
