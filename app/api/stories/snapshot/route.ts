import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { fetchLiveStoryRecords } from "@/lib/windsor";
import { readStoryHistory, recordStorySnapshots } from "@/lib/story-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ingest endpoint meant to be hit on a schedule (see scripts/story-snapshot.sh),
 * not from the browser. /api/stories only records a snapshot when someone happens
 * to have the dashboard open while a story is live — this fills the gaps.
 */

// Fixed-length digests so the comparison doesn't leak the secret's length via
// timing, and so unequal-length inputs never throw instead of just failing closed.
function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function extractSecret(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length);
  return null;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // A server misconfiguration, not a client error — 500, not 401.
    return NextResponse.json(
      {
        error: "missing_cron_secret" as const,
        message: "CRON_SECRET is not set on the server.",
      },
      { status: 500 },
    );
  }

  const provided = extractSecret(request);
  if (!provided || !secretsMatch(provided, cronSecret)) {
    return NextResponse.json({ error: "unauthorized" as const }, { status: 401 });
  }

  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" as const });
  }

  try {
    const before = await readStoryHistory();
    const knownIds = new Set(Object.keys(before.entries));

    const live = await fetchLiveStoryRecords(apiKey);
    const after = await recordStorySnapshots(live);

    const newIds = live.map((r) => r.id).filter((id) => !knownIds.has(id));

    return NextResponse.json({
      ok: true as const,
      fetchedAt: new Date().toISOString(),
      storiesSeen: live.length,
      newStoryIds: newIds,
      storeSize: Object.keys(after.entries).length,
      firstSnapshot: after.firstSnapshot,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error contacting Windsor.ai";
    return NextResponse.json(
      { error: "upstream_error" as const, message },
      { status: 502 },
    );
  }
}
