"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  RANGE_LABEL,
  type ContentError,
  type RangeKey,
  type StoriesPayload,
} from "@/lib/windsor";
import { fmtCompact, fmtDate, fmtFull, fmtPct, fmtRelative } from "@/lib/format";
import StatCard from "@/components/StatCard";
import ActiveStoriesSection from "@/components/ActiveStoriesSection";
import StoryViewersChart from "@/components/StoryViewersChart";
import StoryFunnelChart from "@/components/StoryFunnelChart";
import StoryFramesTable from "@/components/StoryFramesTable";
import StoryHighlightCard from "@/components/StoryHighlightCard";
import StoryArchiveSection from "@/components/StoryArchiveSection";

type StoriesResponse = StoriesPayload | ContentError;

function isError(r: StoriesResponse): r is ContentError {
  return "error" in r;
}

function EmptyChart({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[260px] items-center justify-center px-6 text-center text-sm text-faint">
      {children}
    </div>
  );
}

interface StoriesSectionProps {
  range: RangeKey;
  refreshNonce: number;
}

export default function StoriesSection({
  range,
  refreshNonce,
}: StoriesSectionProps) {
  const [data, setData] = useState<StoriesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const lastNonce = useRef(refreshNonce);

  const load = useCallback(async (nextRange: RangeKey, force: boolean) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range: nextRange });
      if (force) params.set("refresh", "1");
      const res = await fetch(`/api/stories?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as StoriesResponse;
      if (id !== reqId.current) return;
      if (isError(json)) {
        if (json.error !== "missing_api_key") {
          setError(json.message ?? "Could not load stories from Windsor.ai.");
        }
        return;
      }
      setData(json);
    } catch {
      if (id === reqId.current) {
        setError("Network error while loading stories.");
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range, false);
  }, [range, load]);

  useEffect(() => {
    if (lastNonce.current === refreshNonce) return;
    lastNonce.current = refreshNonce;
    void load(range, true);
  }, [refreshNonce, range, load]);

  const skeleton = loading && !data;
  const agg = data?.aggregates;
  const daily = data?.daily ?? [];
  const frames = data?.frames ?? [];

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

  const historyNote = data?.historySince
    ? `history since ${fmtDate(data.historySince)}`
    : "no history recorded yet";

  return (
    <section className="space-y-7">
      <ActiveStoriesSection refreshNonce={refreshNonce} />

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold text-ink">
          Stories
          <span className="ml-2 text-xs font-normal text-faint">
            {RANGE_LABEL[range].toLowerCase()} · {historyNote}
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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Story frames"
          value={fmtFull(agg?.totalFrames)}
          sub={data ? `in ${RANGE_LABEL[range].toLowerCase()}` : undefined}
          loading={skeleton}
          accent
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
          sub={
            agg
              ? `${agg.completionDayCount} multi-frame ${
                  agg.completionDayCount === 1 ? "day" : "days"
                }`
              : undefined
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
          label="Replies + shares"
          value={agg ? fmtFull(agg.totalReplies + agg.totalShares) : "—"}
          sub={
            agg
              ? `${fmtFull(agg.totalReplies)} replies + ${fmtFull(agg.totalShares)} shares`
              : undefined
          }
          loading={skeleton}
        />
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-ink">Story viewers per day</h3>
          <span className="text-xs text-faint">{historyNote}</span>
        </div>
        {skeleton ? (
          <div className="h-[260px] animate-pulse rounded-xl bg-panel2/60" />
        ) : daily.length ? (
          <StoryViewersChart days={daily} />
        ) : (
          <EmptyChart>
            No stories in this range. Snapshots are recorded each time this page
            loads while a story is live — history accumulates from here forward.
          </EmptyChart>
        )}
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">
            Frame-to-frame drop-off
            <span className="ml-2 text-xs font-normal text-faint">
              retention by frame position
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
        {skeleton ? (
          <div className="h-[260px] animate-pulse rounded-xl bg-panel2/60" />
        ) : dayFrames.length >= 2 ? (
          <StoryFunnelChart frames={dayFrames} />
        ) : (
          <EmptyChart>
            {frames.length === 0
              ? "No stories in this range."
              : dayFrames.length === 1
                ? "Only one frame recorded on this day — a drop-off funnel needs at least two."
                : "No stories on the selected day."}
          </EmptyChart>
        )}
      </section>

      {agg?.bestFrame && agg?.worstFrame && (
        <div className="grid gap-3 sm:grid-cols-2">
          <StoryHighlightCard
            label="Most-viewed frame"
            context={`${fmtDate(agg.bestFrame.date)} · frame #${agg.bestFrame.position}`}
            primary={fmtFull(agg.bestFrame.views)}
            secondary={`${fmtPct(agg.bestFrame.exitRate, 1)} exit rate`}
          />
          <StoryHighlightCard
            label="Least-viewed frame"
            context={`${fmtDate(agg.worstFrame.date)} · frame #${agg.worstFrame.position}`}
            primary={fmtFull(agg.worstFrame.views)}
            secondary={`${fmtPct(agg.worstFrame.exitRate, 1)} exit rate`}
          />
        </div>
      )}

      <section className="glass rounded-2xl">
        <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
          <h3 className="text-sm font-semibold text-ink">Story frames</h3>
          <span className="text-xs text-faint">
            {frames.length} in range · click a column to sort
          </span>
        </div>
        {skeleton ? (
          <div className="space-y-2 px-5 pb-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-lg bg-panel2/50"
              />
            ))}
          </div>
        ) : frames.length ? (
          <div className="px-2 pb-2">
            <StoryFramesTable frames={frames} />
          </div>
        ) : (
          <div className="px-5 pb-6 pt-2 text-sm text-faint">
            No stories in this range.
            {data && !data.stories.length ? " No active story right now either." : ""}
          </div>
        )}
      </section>

      <div className="h-px bg-edge" />

      <StoryArchiveSection refreshNonce={refreshNonce} />
    </section>
  );
}
