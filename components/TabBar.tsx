"use client";

import { useRef, type KeyboardEvent } from "react";
import { TABS, type TabId } from "@/lib/tabs";

interface TabBarProps {
  active: TabId;
  onChange: (t: TabId) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  const refs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const idx = TABS.findIndex((t) => t.id === active);
    if (idx === -1) return;

    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (idx + 1) % TABS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (idx - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = TABS.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const target = TABS[next];
    onChange(target.id);
    refs.current[target.id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className="flex gap-1 rounded-xl border border-edge bg-panel/60 p-1"
    >
      {TABS.map((t) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-controls={`panel-${t.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={onKeyDown}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? "bg-gradient-to-br from-gold to-gold-deep text-black"
                : "text-dim hover:text-ink"
            }`}
          >
            {t.label}
            <kbd
              aria-hidden="true"
              className={`hidden rounded border px-1 text-[10px] font-medium leading-[1.45] sm:inline-block ${
                selected
                  ? "border-black/20 text-black/55"
                  : "border-edge-strong bg-panel2 text-faint"
              }`}
            >
              {t.key}
            </kbd>
          </button>
        );
      })}
    </div>
  );
}
