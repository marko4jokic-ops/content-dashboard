import type { AudienceBucket } from "@/lib/windsor";
import { fmtFull, fmtPct } from "@/lib/format";

// Male / Female get the two gold tones; Unknown stays neutral gray.
const SEGMENT_COLOR: Record<string, string> = {
  Male: "#f2c218",
  Female: "#ffe680",
  Unknown: "#3a3a40",
};

export default function GenderSplit({ items }: { items: AudienceBucket[] }) {
  if (!items.length) {
    return (
      <p className="py-6 text-center text-sm text-faint">No gender data.</p>
    );
  }

  const ordered = [...items].sort((a, b) => {
    const rank = (n: string) => (n === "Male" ? 0 : n === "Female" ? 1 : 2);
    return rank(a.name) - rank(b.name);
  });

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {ordered.map((b) => (
          <span
            key={b.name}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${Math.max(b.pct * 100, 1)}%`,
              backgroundColor: SEGMENT_COLOR[b.name] ?? "#3a3a40",
            }}
          />
        ))}
      </div>

      <ul className="grid grid-cols-3 gap-2 text-sm">
        {ordered.map((b) => (
          <li key={b.name} className="min-w-0">
            <span className="flex items-center gap-1.5 text-dim">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: SEGMENT_COLOR[b.name] ?? "#3a3a40" }}
              />
              <span className="truncate">{b.name}</span>
            </span>
            <span className="mt-0.5 block tabular-nums text-ink">
              {fmtPct(b.pct, 1)}
            </span>
            <span className="text-[11px] tabular-nums text-faint">
              {fmtFull(b.size)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
