import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: ReactNode;
  accent?: boolean;
  loading?: boolean;
}

export default function StatCard({
  label,
  value,
  sub,
  accent = false,
  loading = false,
}: StatCardProps) {
  return (
    <div className="glass glass-hover relative overflow-hidden rounded-2xl p-5">
      {accent && (
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-deep to-transparent" />
      )}
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
      {loading ? (
        <div className="mt-3 h-7 w-24 animate-pulse rounded bg-panel2" />
      ) : (
        <p
          className={`mt-2 text-2xl font-semibold tabular-nums ${
            accent ? "text-gold" : "text-ink"
          }`}
        >
          {value}
        </p>
      )}
      {sub && !loading && (
        <p className="mt-1 text-xs text-dim tabular-nums">{sub}</p>
      )}
    </div>
  );
}
