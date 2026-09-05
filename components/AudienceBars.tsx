import type { AudienceBucket } from "@/lib/windsor";
import { fmtFull, fmtPct } from "@/lib/format";

interface AudienceBarsProps {
  items: AudienceBucket[];
  /** widen short bars so tiny shares stay visible; labels always show the true % */
  scaleToMax?: boolean;
}

export default function AudienceBars({
  items,
  scaleToMax = false,
}: AudienceBarsProps) {
  if (!items.length) {
    return (
      <p className="py-6 text-center text-sm text-faint">
        No data for this breakdown.
      </p>
    );
  }

  const max = Math.max(...items.map((i) => i.pct), 0.0001);

  return (
    <ul className="space-y-2.5">
      {items.map((b) => {
        const width = scaleToMax ? (b.pct / max) * 100 : b.pct * 100;
        return (
          <li
            key={b.name}
            className="grid grid-cols-[6.5rem_1fr_4.25rem] items-center gap-3 text-sm sm:grid-cols-[8.5rem_1fr_4.5rem]"
          >
            <span className="truncate text-dim" title={b.name}>
              {b.name}
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-panel2">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-gold to-gold-deep"
                style={{ width: `${Math.max(width, 1.5)}%` }}
              />
            </span>
            <span className="text-right tabular-nums text-ink">
              {fmtPct(b.pct, 1)}
              <span className="ml-1.5 text-[11px] text-faint">
                {fmtFull(b.size)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
