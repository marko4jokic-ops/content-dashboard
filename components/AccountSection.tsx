"use client";

import type { AccountDailyPayload } from "@/lib/windsor";
import { fmtCompact, fmtFull, fmtRelative } from "@/lib/format";
import StatCard from "@/components/StatCard";
import DailyViewsChart from "@/components/DailyViewsChart";
import FollowerActivityChart from "@/components/FollowerActivityChart";

interface AccountSectionProps {
  data: AccountDailyPayload | null;
  loading: boolean;
  error: string | null;
}

export default function AccountSection({
  data,
  loading,
  error,
}: AccountSectionProps) {
  const days = data?.days ?? [];
  const totals = data?.totals;
  const skeleton = loading && !data;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold text-ink">
          Account activity
          <span className="ml-2 text-xs font-normal text-faint">
            last 30 days · separate Windsor query
          </span>
        </h2>
        {data?.fetchedAt && (
          <span className="text-xs text-faint">
            {days.length} days ·{" "}
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Accounts engaged"
          value={fmtFull(totals?.accountsEngaged)}
          sub="30-day total"
          loading={skeleton}
          accent
        />
        <StatCard
          label="Total interactions"
          value={fmtFull(totals?.totalInteractions)}
          sub="30-day total"
          loading={skeleton}
          accent
        />
        <StatCard
          label="Views (account)"
          value={fmtCompact(totals?.views)}
          sub={totals ? `${fmtFull(totals.views)} exact` : undefined}
          loading={skeleton}
        />
        <StatCard
          label="Follower activity"
          value={fmtFull(totals?.followerActivity)}
          sub="follows + unfollows"
          loading={skeleton}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-ink">Daily views</h3>
            <span className="text-xs text-faint">account-level</span>
          </div>
          {skeleton ? (
            <div className="h-[260px] animate-pulse rounded-xl bg-panel2/60" />
          ) : (
            <DailyViewsChart days={days} />
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-ink">
              Daily follower activity
            </h3>
            <span className="text-xs text-faint">follows + unfollows</span>
          </div>
          {skeleton ? (
            <div className="h-[260px] animate-pulse rounded-xl bg-panel2/60" />
          ) : (
            <FollowerActivityChart days={days} />
          )}
        </div>
      </div>
    </section>
  );
}
