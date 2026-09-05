import { NextResponse } from "next/server";
import {
  buildStoryMonthPayload,
  listStoryMonths,
  type StoryArchivePayload,
} from "@/lib/windsor";
import { readStoryHistory } from "@/lib/story-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = { at: number; payload: Omit<StoryArchivePayload, "cached"> };

// Keyed by the requested month ("" = "give me the latest"). Doesn't touch
// Windsor at all — it only reads the local snapshot store — but the missing-key
// gate stays so SetupScreen still comes up for an unconfigured install.
const cache = new Map<string, CacheEntry>();

export async function GET(request: Request) {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" as const });
  }

  const { searchParams } = new URL(request.url);
  const requestedMonth = searchParams.get("month");
  const force = searchParams.get("refresh") === "1";
  const now = Date.now();
  const cacheKey = requestedMonth ?? "";
  const hit = cache.get(cacheKey);

  if (hit && !force && now - hit.at < TTL_MS) {
    const body: StoryArchivePayload = { ...hit.payload, cached: true };
    return NextResponse.json(body);
  }

  try {
    const history = await readStoryHistory();
    const months = listStoryMonths(history);
    const selectedMonth = requestedMonth ?? months[0]?.month ?? null;
    const data = selectedMonth ? buildStoryMonthPayload(history, selectedMonth) : null;

    const payload: Omit<StoryArchivePayload, "cached"> = {
      months,
      coverageSince: history.firstSnapshot,
      selectedMonth,
      data,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, { at: now, payload });
    const body: StoryArchivePayload = { ...payload, cached: false };
    return NextResponse.json(body);
  } catch (err) {
    if (hit) {
      const body: StoryArchivePayload = { ...hit.payload, cached: true, stale: true };
      return NextResponse.json(body);
    }
    const message =
      err instanceof Error ? err.message : "Unknown error reading the story archive.";
    return NextResponse.json(
      { error: "upstream_error" as const, message },
      { status: 502 },
    );
  }
}
