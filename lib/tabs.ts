export type TabId = "overview" | "stories" | "audience";

export interface TabDef {
  id: TabId;
  label: string;
  /** number key that jumps to this tab, and the keycap shown on the button */
  key: string;
}

export const TABS: TabDef[] = [
  { id: "overview", label: "Overview", key: "1" },
  { id: "stories", label: "Stories", key: "2" },
  { id: "audience", label: "Audience", key: "3" },
];

export function isTabId(v: unknown): v is TabId {
  return v === "overview" || v === "stories" || v === "audience";
}
