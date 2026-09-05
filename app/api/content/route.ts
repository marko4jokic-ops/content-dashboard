import { NextResponse } from "next/server";
import {
  fetchContent,
  isRangeKey,
  type ContentPayload,
  type RangeKey,
} from "@/lib/windsor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 15 * 60 * 1000; // 15 minutes

type CacheEntry = { at: number; payload: Omit<ContentPayload, "cached"> };

// Module-scoped cache. Persists across requests for the lifetime of the server
// process (per range). Cleared on redeploy / restart.
const cache = new Map<RangeKey, CacheEntry>();

function parseRange(value: string | null): RangeKey {
  return isRangeKey(value) ? value : "30";
}

export async function GET(request: Request) {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) {
    // 200 on purpose: the client renders a setup screen, this is not a crash.
    return NextResponse.json({ error: "missing_api_key" as const });
  }

  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get("range"));
  const force = searchParams.get("refresh") === "1";
  const now = Date.now();
  const hit = cache.get(range);

  if (hit && !force && now - hit.at < TTL_MS) {
    const body: ContentPayload = { ...hit.payload, cached: true };
    return NextResponse.json(body);
  }

  try {
    const payload = await fetchContent(apiKey, range);
    cache.set(range, { at: now, payload });
    const body: ContentPayload = { ...payload, cached: false };
    return NextResponse.json(body);
  } catch (err) {
    // Fall back to whatever we have rather than blanking the dashboard.
    if (hit) {
      const body: ContentPayload = { ...hit.payload, cached: true, stale: true };
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
