"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AccountDailyPayload,
  ContentError,
  ContentPayload,
  RangeKey,
} from "@/lib/windsor";
import { fmtCompact, fmtFull, fmtPct } from "@/lib/format";
import { TABS, isTabId, type TabId } from "@/lib/tabs";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import ViewsChart from "@/components/ViewsChart";
import PostsTable from "@/components/PostsTable";
import AccountSection from "@/components/AccountSection";
import AudienceSection from "@/components/AudienceSection";
import StoriesSection from "@/components/StoriesSection";
import SetupScreen from "@/components/SetupScreen";

type ApiResponse = ContentPayload | ContentError;
type AccountResponse = AccountDailyPayload | ContentError;

function isError<T extends object>(r: T | ContentError): r is ContentError {
  return "error" in r;
}

/** Number-key shortcuts (1/2/3) and #hash sync/restore for the tab bar. */
function useTabRouting(): [TabId, (t: TabId) => void] {
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    const syncFromHash = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (isTabId(h)) setTab(h);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const select = useCallback((t: TabId) => {
    setTab(t);
    if (typeof window !== "undefined" && window.location.hash !== `#${t}`) {
      window.history.replaceState(null, "", `#${t}`);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          el.isContentEditable
        ) {
          return;
        }
      }
      const hit = TABS.find((t) => t.key === e.key);
      if (!hit) return;
      e.preventDefault();
      select(hit.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  return [tab, select];
}

function Panel({
  id,
  active,
  children,
}: {
  id: TabId;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={!active}
      className="space-y-7"
    >
      {active ? children : null}
    </div>
  );
}

export default function Dashboard() {
  const [tab, selectTab] = useTabRouting();
  const [range, setRange] = useState<RangeKey>("30");
  const [data, setData] = useState<ContentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const reqId = useRef(0);

  // Account-level daily section — always last_30d, independent of `range`.
  const [account30, setAccount30] = useState<AccountDailyPayload | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  const accountReqId = useRef(0);

  // Bumped on a manual refresh so self-contained child sections refetch too.
  const [refreshNonce, setRefreshNonce] = useState(0);

  const load = useCallback(
    async (nextRange: RangeKey, opts: { force?: boolean } = {}) => {
      const id = ++reqId.current;
      if (opts.force) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ range: nextRange });
        if (opts.force) params.set("refresh", "1");
        const res = await fetch(`/api/content?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as ApiResponse;
        if (id !== reqId.current) return; // a newer request superseded this one

        if (isError(json)) {
          if (json.error === "missing_api_key") {
            setNeedsSetup(true);
          } else {
            setError(json.message ?? "Could not load analytics from Windsor.ai.");
          }
          return;
        }
        setData(json);
      } catch {
        if (id === reqId.current) {
          setError("Network error while loading analytics.");
        }
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  const loadAccount = useCallback(async (opts: { force?: boolean } = {}) => {
    const id = ++accountReqId.current;
    setAccountLoading(true);
    setAccountError(null);
    try {
      const qs = opts.force ? "?refresh=1" : "";
      const res = await fetch(`/api/account${qs}`, { cache: "no-store" });
      const json = (await res.json()) as AccountResponse;
      if (id !== accountReqId.current) return;
      if (isError(json)) {
        if (json.error === "missing_api_key") setNeedsSetup(true);
        else
          setAccountError(
            json.message ?? "Could not load account activity from Windsor.ai.",
          );
        return;
      }
      setAccount30(json);
    } catch {
      if (id === accountReqId.current) {
        setAccountError("Network error while loading account activity.");
      }
    } finally {
      if (id === accountReqId.current) setAccountLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const refreshAll = useCallback(() => {
    void load(range, { force: true });
    void loadAccount({ force: true });
    setRefreshNonce((n) => n + 1);
  }, [load, loadAccount, range]);

  if (needsSetup) return <SetupScreen />;

  const stats = data?.stats;
  const account = data?.account;
  const posts = data?.posts ?? [];
  const showSkeleton = loading && !data;

  return (
    <div className="space-y-7">
      <Header
        accountName={account?.name ?? null}
        followers={account?.followers ?? null}
        range={range}
        onRangeChange={setRange}
        onRefresh={refreshAll}
        refreshing={refreshing}
        loading={loading}
        fetchedAt={data?.fetchedAt ?? null}
        cached={data?.cached ?? false}
        stale={data?.stale ?? false}
        tab={tab}
        onTabChange={selectTab}
      />

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load(range, { force: true })}
            className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-500/20"
          >
            Try again
          </button>
        </div>
      )}

      <Panel id="overview" active={tab === "overview"}>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Followers"
            value={fmtFull(account?.followers)}
            loading={showSkeleton}
            accent
          />
          <StatCard
            label="Posts"
            value={fmtFull(stats?.postCount)}
            sub={data ? `Last ${range} days` : undefined}
            loading={showSkeleton}
          />
          <StatCard
            label="Total views"
            value={fmtCompact(stats?.totalViews)}
            sub={stats ? `${fmtFull(stats.totalViews)} exact` : undefined}
            loading={showSkeleton}
          />
          <StatCard
            label="Total reach"
            value={fmtCompact(stats?.totalReach)}
            sub={stats ? `${fmtFull(stats.totalReach)} exact` : undefined}
            loading={showSkeleton}
          />
          <StatCard
            label="Engagement rate"
            value={fmtPct(stats?.engagementRate)}
            sub="(likes+comments+saves+shares) / views"
            loading={showSkeleton}
            accent
          />
        </section>

        <section className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-ink">Views per post</h2>
            <span className="text-xs text-faint">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </span>
          </div>
          {showSkeleton ? (
            <div className="h-[300px] animate-pulse rounded-xl bg-panel2/60" />
          ) : (
            <ViewsChart posts={posts} />
          )}
        </section>

        <section className="glass rounded-2xl">
          <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
            <h2 className="text-sm font-semibold text-ink">All posts</h2>
            <span className="text-xs text-faint">Click a column to sort</span>
          </div>
          {showSkeleton ? (
            <div className="space-y-2 px-5 pb-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse rounded-lg bg-panel2/50"
                />
              ))}
            </div>
          ) : (
            <div className="px-2 pb-2">
              <PostsTable posts={posts} />
            </div>
          )}
        </section>
      </Panel>

      <Panel id="stories" active={tab === "stories"}>
        <StoriesSection range={range} refreshNonce={refreshNonce} />
      </Panel>

      <Panel id="audience" active={tab === "audience"}>
        <AccountSection
          data={account30}
          loading={accountLoading}
          error={accountError}
        />

        <div className="h-px bg-edge" />

        <AudienceSection refreshNonce={refreshNonce} />
      </Panel>

      <footer className="pb-2 pt-1 text-center text-[11px] text-faint">
        Data via Windsor.ai · cached server-side for 15 min ·{" "}
        {data?.fieldsUsed?.length ?? 0} fields resolved
      </footer>
    </div>
  );
}
