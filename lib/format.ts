const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const full = new Intl.NumberFormat("en-US");

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return compact.format(n);
}

export function fmtFull(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return full.format(n);
}

export function fmtPct(ratio: number | null | undefined, digits = 2): string {
  if (ratio == null || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** e.g. "Sep 4, 3:40 PM" — used where the clock time matters (story frames). */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms) || ms <= 0) return "—";
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

/** Milliseconds -> a plain seconds reading, e.g. 4354 -> "4.4s". */
export function fmtSeconds(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms) || ms <= 0) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

/** A ratio as a multiplier, e.g. 1.28 -> "1.28×". */
export function fmtMultiplier(ratio: number | null | undefined): string {
  if (ratio == null || Number.isNaN(ratio) || ratio <= 0) return "—";
  return `${ratio.toFixed(2)}×`;
}

/** Time remaining until `iso` + 24h, e.g. "expires in 7h 12m". */
export function fmtExpiresIn(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const posted = new Date(iso).getTime();
  if (Number.isNaN(posted)) return null;
  const left = posted + 24 * 60 * 60 * 1000 - Date.now();
  if (left <= 0) return "expiring now";
  const hrs = Math.floor(left / 3_600_000);
  const mins = Math.round((left % 3_600_000) / 60_000);
  return hrs > 0 ? `expires in ${hrs}h ${mins}m` : `expires in ${mins}m`;
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** "2026-09" -> "Sep 2026" — used by the monthly story archive selector. */
export function fmtMonth(month: string | null | undefined): string {
  if (!month) return "—";
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const d = new Date(Date.UTC(y, m - 1, 1));
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function truncate(text: string, max = 90): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
