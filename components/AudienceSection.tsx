"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { AudiencePayload, ContentError } from "@/lib/windsor";
import { fmtDate, fmtFull, fmtRelative } from "@/lib/format";
import AudienceBars from "@/components/AudienceBars";
import GenderSplit from "@/components/GenderSplit";

type AudienceResponse = AudiencePayload | ContentError;

function isError(r: AudienceResponse): r is ContentError {
  return "error" in r;
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {hint && <span className="text-xs text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function AudienceSection({
  refreshNonce,
}: {
  refreshNonce: number;
}) {
  const [data, setData] = useState<AudiencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const firstRun = useRef(true);

  const load = useCallback(async (force: boolean) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audience${force ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as AudienceResponse;
      if (id !== reqId.current) return;
      if (isError(json)) {
        if (json.error !== "missing_api_key") {
          setError(json.message ?? "Could not load audience data from Windsor.ai.");
        }
        return;
      }
      setData(json);
    } catch {
      if (id === reqId.current) {
        setError("Network error while loading audience data.");
      }
    } finally {
      if (id === reqId.current) setLoading(false);
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

  const skeleton = loading && !data;
  const empty =
    !!data &&
    !data.age.length &&
    !data.gender.length &&
    !data.countries.length &&
    !data.cities.length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold text-ink">
          Audience
          <span className="ml-2 text-xs font-normal text-faint">
            follower demographics · lifetime snapshot
            {data?.snapshotDate ? ` · ${fmtDate(data.snapshotDate)}` : ""}
          </span>
        </h2>
        {data?.fetchedAt && (
          <span className="text-xs text-faint">
            {data.audienceTotal > 0
              ? `${fmtFull(data.audienceTotal)} classified · `
              : ""}
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

      {empty && !error && (
        <div className="rounded-xl border border-edge bg-panel/50 px-4 py-3 text-sm text-dim">
          Instagram only returns audience demographics for accounts with 100+
          followers. Nothing to show yet.
        </div>
      )}

      {skeleton ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="glass h-56 animate-pulse rounded-2xl bg-panel2/40"
            />
          ))}
        </div>
      ) : (
        !empty && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Age brackets" hint="% of classified followers">
              <AudienceBars items={data?.age ?? []} scaleToMax />
            </Card>
            <Card title="Gender split">
              <GenderSplit items={data?.gender ?? []} />
            </Card>
            <Card title="Top countries" hint="% of located followers">
              <AudienceBars items={data?.countries ?? []} scaleToMax />
            </Card>
            <Card title="Top cities" hint="% of located followers">
              <AudienceBars items={data?.cities ?? []} scaleToMax />
            </Card>
          </div>
        )
      )}
    </section>
  );
}
