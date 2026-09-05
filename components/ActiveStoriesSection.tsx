"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentError, Story, StoriesPayload } from "@/lib/windsor";
import {
  fmtCompact,
  fmtExpiresIn,
  fmtFull,
  fmtPct,
  fmtRelative,
} from "@/lib/format";

type StoriesResponse = StoriesPayload | ContentError;

function isError(r: StoriesResponse): r is ContentError {
  return "error" in r;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-faint">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-ink">{value}</p>
    </div>
  );
}

function StoryCard({ story }: { story: Story }) {
  const clickable = Boolean(story.permalink);
  const expiry = fmtExpiresIn(story.timestamp);

  return (
    <div
      onClick={() => {
        if (story.permalink)
          window.open(story.permalink, "_blank", "noopener,noreferrer");
      }}
      className={`glass flex gap-4 rounded-2xl p-4 ${
        clickable ? "glass-hover cursor-pointer" : ""
      }`}
      title={clickable ? "Open story on Instagram" : undefined}
    >
      <div className="relative aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-lg border border-edge bg-panel2">
        {story.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.thumbnail}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-faint">
            story
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-deep/30 bg-gold-wash/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Live
          </span>
          {expiry && <span className="text-[11px] text-faint">{expiry}</span>}
        </div>

        <div className="grid grid-cols-3 gap-x-3 gap-y-2.5">
          <Metric label="Views" value={fmtFull(story.views)} />
          <Metric label="Reach" value={fmtFull(story.reach)} />
          <Metric label="Replies" value={fmtFull(story.replies)} />
          <Metric label="Shares" value={fmtFull(story.shares)} />
          <Metric label="Exits" value={fmtCompact(story.exits)} />
          <Metric label="Exit rate" value={fmtPct(story.exitRate, 1)} />
        </div>
      </div>
    </div>
  );
}

export default function ActiveStoriesSection({
  refreshNonce,
}: {
  refreshNonce: number;
}) {
  const [data, setData] = useState<StoriesPayload | null>(null);
  const reqId = useRef(0);
  const firstRun = useRef(true);

  const load = useCallback(async (force: boolean) => {
    const id = ++reqId.current;
    try {
      const res = await fetch(`/api/stories${force ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as StoriesResponse;
      if (id !== reqId.current) return;
      if (isError(json)) return; // stay silent — this section is optional
      setData(json);
    } catch {
      /* silent: no active-stories UI if we can't reach the endpoint */
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    void load(true);
  }, [refreshNonce, load]);

  const stories = data?.stories ?? [];
  if (!stories.length) return null; // only appears when a story is up

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold text-ink">
          Active stories
          <span className="ml-2 text-xs font-normal text-faint">
            {stories.length} up in the last 24h
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

      <div className="grid gap-4 sm:grid-cols-2">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </section>
  );
}
