import { NextResponse } from "next/server";
import { fetchAccountDaily, type AccountDailyPayload } from "@/lib/windsor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 15 * 60 * 1000; // 15 minutes

type CacheEntry = { at: number; payload: Omit<AccountDailyPayload, "cached"> };

// Single-slot cache: this query is always last_30d.
let cache: CacheEntry | null = null;

export async function GET(request: Request) {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" as const });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("refresh") === "1";
  const now = Date.now();

  if (cache && !force && now - cache.at < TTL_MS) {
    const body: AccountDailyPayload = { ...cache.payload, cached: true };
    return NextResponse.json(body);
  }

  try {
    const payload = await fetchAccountDaily(apiKey);
    cache = { at: now, payload };
    const body: AccountDailyPayload = { ...payload, cached: false };
    return NextResponse.json(body);
  } catch (err) {
    if (cache) {
      const body: AccountDailyPayload = {
        ...cache.payload,
        cached: true,
        stale: true,
      };
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
