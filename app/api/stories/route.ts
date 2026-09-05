import { NextResponse } from "next/server";
import {
  buildStoriesPayload,
  fetchLiveStoryRecords,
  isRangeKey,
  type RangeKey,
  type StoriesPayload,
} from "@/lib/windsor";
import { recordStorySnapshots } from "@/lib/story-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stories move fast and expire in 24h — shorter cache than the other routes.
const TTL_MS = 5 * 60 * 1000;

type CacheEntry = { at: number; payload: Omit<StoriesPayload, "cached"> };

// Module-scoped cache, one slot per range. The historical part of the payload
// is derived from the snapshot store, which only changes on a real fetch anyway.
const cache = new Map<RangeKey, CacheEntry>();

function parseRange(value: string | null): RangeKey {
  return isRangeKey(value) ? value : "30";
}

export async function GET(request: Request) {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" as const });
  }

  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get("range"));
  const force = searchParams.get("refresh") === "1";
  const now = Date.now();
  const hit = cache.get(range);

  if (hit && !force && now - hit.at < TTL_MS) {
    const body: StoriesPayload = { ...hit.payload, cached: true };
    return NextResponse.json(body);
  }

  try {
    const live = await fetchLiveStoryRecords(apiKey);
    // Record every live story into the append-only snapshot store, then build
    // the range view from the merged history.
    const history = await recordStorySnapshots(live);
    const payload = buildStoriesPayload(live, history, range);
    cache.set(range, { at: now, payload });
    const body: StoriesPayload = { ...payload, cached: false };
    return NextResponse.json(body);
  } catch (err) {
    if (hit) {
      const body: StoriesPayload = { ...hit.payload, cached: true, stale: true };
      return NextResponse.json(body);
    }
    const message =
      err instanceof Error ? err.message : "Unknown error contacting Windsor.ai";
    return NextResponse.json(
      { error: "upstream_error" as const, message },
      { status: 502 },
    );
  }
}
