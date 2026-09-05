interface StoryHighlightCardProps {
  label: string;
  context: string;
  primary: string;
  secondary: string;
}

/** Small glass card for "best/worst X" callouts — frames, sequences, etc. */
export default function StoryHighlightCard({
  label,
  context,
  primary,
  secondary,
}: StoryHighlightCardProps) {
  return (
    <div className="glass flex items-center justify-between gap-3 rounded-xl px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.12em] text-faint">
          {label}
        </p>
        <p className="mt-0.5 text-xs text-dim">{context}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-ink">{primary}</p>
        <p className="text-[11px] tabular-nums text-faint">{secondary}</p>
      </div>
    </div>
  );
}
