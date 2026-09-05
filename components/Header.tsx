"use client";

import { RANGE_LABEL, type RangeKey } from "@/lib/windsor";
import { fmtFull, fmtRelative } from "@/lib/format";
import type { TabId } from "@/lib/tabs";
import TabBar from "@/components/TabBar";

const RANGES: RangeKey[] = ["7", "30", "90"];

interface HeaderProps {
  accountName: string | null;
  followers: number | null;
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  onRefresh: () => void;
  refreshing: boolean;
  loading: boolean;
  fetchedAt: string | null;
  cached: boolean;
  stale: boolean;
  tab: TabId;
  onTabChange: (t: TabId) => void;
}

export default function Header({
  accountName,
  followers,
  range,
  onRangeChange,
  onRefresh,
  refreshing,
  loading,
  fetchedAt,
  cached,
  stale,
  tab,
  onTabChange,
}: HeaderProps) {
  const handle = accountName ? `@${accountName.replace(/^@/, "")}` : "Instagram";
  const initial = (accountName ?? "IG").replace(/^@/, "").charAt(0).toUpperCase();

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-deep text-lg font-bold text-black">
            {initial}
          </span>
          <div>
            <h1 className="text-xl font-semibold leading-tight text-ink">
              {handle}
            </h1>
            <p className="text-sm text-dim tabular-nums">
              {loading && followers == null ? (
                <span className="inline-block h-4 w-28 animate-pulse rounded bg-panel2 align-middle" />
              ) : (
                <>
                  {fmtFull(followers)} followers
                  {fetchedAt && (
                    <span className="text-faint">
                      {"  ·  "}
                      {stale
                        ? "showing last good data"
                        : cached
                          ? `cached · ${fmtRelative(fetchedAt)}`
                          : `updated ${fmtRelative(fetchedAt)}`}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="Date range"
            className="flex rounded-xl border border-edge bg-panel/60 p-1"
          >
            {RANGES.map((r) => {
              const active = r === range;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => onRangeChange(r)}
                  aria-pressed={active}
                  title={RANGE_LABEL[r]}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-gradient-to-br from-gold to-gold-deep text-black"
                      : "text-dim hover:text-ink"
                  }`}
                >
                  {r}d
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-xl border border-edge bg-panel/60 px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-edge-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              aria-hidden="true"
              className={refreshing ? "animate-spin-slow" : ""}
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6"
              />
            </svg>
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3 border-t border-edge pt-4">
        <TabBar active={tab} onChange={onTabChange} />
        <span className="hidden text-[11px] text-faint sm:block">
          Press{" "}
          <kbd className="rounded border border-edge-strong bg-panel2 px-1 text-[10px]">
            1
          </kbd>
          –
          <kbd className="rounded border border-edge-strong bg-panel2 px-1 text-[10px]">
            3
          </kbd>{" "}
          to switch
        </span>
      </div>
    </div>
  );
}
