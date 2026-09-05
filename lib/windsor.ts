/**
 * Server-only helpers for the Windsor.ai Instagram connector.
 *
 * The API key is passed in by the caller (an API route that reads it from
 * process.env.WINDSOR_API_KEY). Nothing in this module should ever run in the
 * browser.
 */

const BASE = "https://connectors.windsor.ai/instagram";

export type RangeKey = "7" | "30" | "90";

const RANGE_PRESET: Record<RangeKey, string> = {
  "7": "last_7d",
  "30": "last_30d",
  "90": "last_90d",
};

/** Trailing window length in days, for client-side range filtering. */
export const RANGE_DAYS: Record<RangeKey, number> = {
  "7": 7,
  "30": 30,
  "90": 90,
};

export const RANGE_LABEL: Record<RangeKey, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
};

export function isRangeKey(v: unknown): v is RangeKey {
  return v === "7" || v === "30" || v === "90";
}

/** Fields we always need for the aggregates to make sense. */
const CORE_FIELDS = [
  "media_id",
  "media_views",
  "media_reach",
  "media_like_count",
  "media_comments_count",
  "followers_count",
];

/** Everything we'd like if the account exposes it. */
const WISH_FIELDS = [
  ...CORE_FIELDS,
  "date",
  "media_caption",
  "media_permalink",
  "media_thumbnail_url",
  "media_type",
  "media_product_type",
  "media_plays",
  "media_saved",
  "media_shares",
  "media_reel_avg_watch_time",
  "account_name",
];

/** Fields that are frequently missing; skipped when discovery is unavailable. */
const RISKY_WHEN_UNKNOWN = new Set(["account_name", "media_plays"]);

export interface Post {
  id: string;
  date: string | null;
  caption: string;
  permalink: string | null;
  thumbnail: string | null;
  type: string;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  avgWatchTimeMs: number | null;
  engagementRate: number;
  /** views / reach — above 1.0 means the average viewer watched more than once */
  replayRate: number;
}

export interface Stats {
  postCount: number;
  totalViews: number;
  totalReach: number;
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  totalShares: number;
  engagementRate: number;
}

export interface Account {
  name: string | null;
  followers: number;
}

export interface ContentPayload {
  posts: Post[];
  account: Account;
  stats: Stats;
  range: RangeKey;
  fetchedAt: string;
  cached: boolean;
  stale?: boolean;
  fieldsUsed: string[];
}

export interface ContentError {
  error: "missing_api_key" | "upstream_error";
  message?: string;
}

/* --------------------------------------------------- active stories (last 24h) */

export interface Story {
  id: string;
  timestamp: string | null;
  permalink: string | null;
  thumbnail: string | null;
  views: number;
  reach: number;
  replies: number;
  shares: number;
  exits: number;
  interactions: number;
  /** exits / views */
  exitRate: number;
}

/** One recorded story frame within the selected date range (from the snapshot
 *  store — Windsor cannot return historical stories directly). */
export interface StoryFrame {
  id: string;
  /** the story's day bucket, YYYY-MM-DD */
  date: string;
  /** 1-based position within that day's stories, ordered by timestamp */
  position: number;
  timestamp: string | null;
  permalink: string | null;
  thumbnail: string | null;
  views: number;
  reach: number;
  exits: number;
  exitRate: number;
  /** count of reply messages — NOT unique repliers; one viewer can reply more than once */
  replies: number;
  shares: number;
  /** views[n] / views[1] within the frame's day */
  retention: number;
  /** 1 - views[n] / views[n-1]; 0 for the first frame of a day */
  dropOff: number;
  /** id of the sequence (same day, frames within ~4h of each other) this frame belongs to */
  sequenceId: string;
  /** 1-based position within its sequence */
  sequencePosition: number;
  /** total frame count of the sequence this frame belongs to */
  sequenceLength: number;
}

/**
 * Consecutive frames from the same day where each is within ~4h of the previous
 * one. A day can contain more than one sequence (e.g. a morning burst and an
 * evening burst are two separate sequences).
 */
export interface StorySequence {
  id: string;
  /** the day this sequence falls on, YYYY-MM-DD */
  date: string;
  /** 1-based position of this sequence within its day */
  position: number;
  frames: StoryFrame[];
  frameCount: number;
  /** views on the sequence's first frame */
  openingViewers: number;
  /** views on the sequence's last frame */
  closingViewers: number;
  /** closingViewers / openingViewers */
  completionRate: number;
  /** sum of story_replies across the sequence — reply *messages*, not unique repliers */
  totalReplies: number;
  totalShares: number;
  /** totalReplies / openingViewers */
  replyRate: number;
}

export interface StoryDailyPoint {
  date: string;
  reach: number;
  views: number;
  frames: number;
  avgViewsPerFrame: number;
}

export interface StoryRangeAggregates {
  totalFrames: number;
  avgViewsPerFrame: number;
  avgExitRate: number;
  /** mean over multi-frame days of the retention at that day's last frame */
  avgCompletion: number;
  /** how many days had >= 2 frames (the basis for avgCompletion) */
  completionDayCount: number;
  totalReplies: number;
  totalShares: number;
  bestFrame: StoryFrame | null;
  worstFrame: StoryFrame | null;
}

export interface StoriesPayload {
  /** stories that are live right now (inside their 24h window) */
  stories: Story[];
  range: RangeKey;
  /** every recorded story frame whose day falls in the selected range */
  frames: StoryFrame[];
  daily: StoryDailyPoint[];
  aggregates: StoryRangeAggregates;
  /** date of the first snapshot ever recorded; null if the store is empty */
  historySince: string | null;
  fetchedAt: string;
  cached: boolean;
  stale?: boolean;
}

/** Live story metrics as returned by Windsor while a story is inside its 24h life. */
export interface LiveStoryRecord {
  id: string;
  timestamp: string | null;
  /** YYYY-MM-DD derived from the timestamp (the "story day") */
  date: string | null;
  permalink: string | null;
  thumbnail: string | null;
  views: number;
  reach: number;
  replies: number;
  shares: number;
  exits: number;
  interactions: number;
  impressions: number | null;
  tapsForward: number | null;
  tapsBack: number | null;
  swipeForward: number | null;
}

/** Current on-disk shape of the snapshot store. Bump when the shape changes in a
 *  way readers must know about; all fields so far have been purely additive, so
 *  there is no migration step — a missing/older version is just read as-is. */
export const STORY_SCHEMA_VERSION = 1;

/** One story as persisted in the append-only snapshot store. */
export interface StoryHistoryEntry {
  id: string;
  timestamp: string | null;
  date: string | null;
  permalink: string | null;
  thumbnail: string | null;
  views: number;
  reach: number;
  replies: number;
  shares: number;
  exits: number;
  interactions: number;
  impressions: number | null;
  tapsForward: number | null;
  tapsBack: number | null;
  swipeForward: number | null;
  firstSeen: string;
  lastSeen: string;
  /** how many times this story was sampled — a story caught once near expiry
   *  has less reliable numbers than one sampled six times */
  snapshotCount: number;
}

export interface StoryHistory {
  schemaVersion: number;
  /** date (YYYY-MM-DD) the first snapshot was ever taken */
  firstSnapshot: string | null;
  entries: Record<string, StoryHistoryEntry>;
}

/* ---------------------------------------------------------- monthly archive */

export interface StoryMonthMeta {
  /** YYYY-MM */
  month: string;
  frameCount: number;
  /** true when the store's coverage begins mid-month, not on the 1st */
  partial: boolean;
}

export interface StoryMonthAggregates {
  totalFrames: number;
  totalViewers: number;
  avgViewsPerFrame: number;
  /** mean over multi-frame days of the retention at that day's last frame */
  avgCompletion: number;
  completionDayCount: number;
  avgExitRate: number;
  /** count of reply messages, not unique repliers */
  totalReplies: number;
  totalShares: number;
  bestFrame: StoryFrame | null;
  worstFrame: StoryFrame | null;
  bestRepliesSequence: StorySequence | null;
  bestRepliesFrame: StoryFrame | null;
}

export interface StoryMonthComparison {
  metric: "viewers" | "completion" | "replyRate";
  label: string;
  current: number | null;
  previous: number | null;
  /** (current - previous) / previous; null when not computable */
  deltaPct: number | null;
}

export interface StoryMonthData {
  month: string;
  partial: boolean;
  coverageSince: string | null;
  frames: StoryFrame[];
  daily: StoryDailyPoint[];
  sequences: StorySequence[];
  aggregates: StoryMonthAggregates;
  /** this month vs the previous month — empty array if there's no data at all */
  comparison: StoryMonthComparison[];
}

export interface StoryArchivePayload {
  months: StoryMonthMeta[];
  coverageSince: string | null;
  selectedMonth: string | null;
  data: StoryMonthData | null;
  fetchedAt: string;
  cached: boolean;
  stale?: boolean;
}

/* ------------------------------------------------- audience (lifetime snapshot) */

export interface AudienceBucket {
  name: string;
  size: number;
  /** share of the breakdown total, 0..1 */
  pct: number;
}

export interface AudiencePayload {
  snapshotDate: string | null;
  age: AudienceBucket[];
  gender: AudienceBucket[];
  countries: AudienceBucket[];
  cities: AudienceBucket[];
  /** sum of the gender breakdown — the closest thing to "known audience size" */
  audienceTotal: number;
  fetchedAt: string;
  cached: boolean;
  stale?: boolean;
}

/* ----------------------------------------------- account-level daily insights */

export interface DailyPoint {
  date: string;
  views: number;
  reach: number;
  accountsEngaged: number;
  totalInteractions: number;
  /** follows + unfollows recorded that day (churn activity, not net change) */
  followerActivity: number;
}

export interface AccountDailyPayload {
  days: DailyPoint[];
  totals: {
    views: number;
    reach: number;
    accountsEngaged: number;
    totalInteractions: number;
    followerActivity: number;
  };
  followers: number | null;
  fetchedAt: string;
  cached: boolean;
  stale?: boolean;
}

/* ------------------------------------------------------------------ helpers */

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

type Row = Record<string, unknown>;

/* ------------------------------------------------------------- field discovery */

async function discoverFields(apiKey: string): Promise<Set<string> | null> {
  try {
    const res = await fetch(
      `${BASE}/fields?api_key=${encodeURIComponent(apiKey)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const raw =
      (json as { data?: unknown; fields?: unknown }).data ??
      (json as { fields?: unknown }).fields ??
      json;
    if (!Array.isArray(raw)) return null;
    const names = raw
      .map((f) => {
        if (typeof f === "string") return f;
        if (f && typeof f === "object") {
          const o = f as Record<string, unknown>;
          // Windsor's /fields returns objects like { id: "media_caption",
          // name: "Media Caption", ... } — the `id` is what goes in ?fields=.
          return (
            str(o.id) ?? str(o.field) ?? str(o.value) ?? str(o.name) ?? null
          );
        }
        return null;
      })
      .filter((x): x is string => typeof x === "string" && x.length > 0);
    return names.length ? new Set(names) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------- fetching */

async function fetchRows(
  apiKey: string,
  preset: string,
  fields: string[],
): Promise<Row[]> {
  const url =
    `${BASE}?api_key=${encodeURIComponent(apiKey)}` +
    `&date_preset=${encodeURIComponent(preset)}` +
    `&fields=${fields.join(",")}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Windsor API responded ${res.status} ${res.statusText}. ${body.slice(0, 400)}`.trim(),
    );
  }

  const json: unknown = await res.json();
  const data = (json as { data?: unknown }).data;
  if (Array.isArray(data)) return data as Row[];

  // Some error responses come back as 200 with an { error } body.
  const errMsg =
    str((json as { error?: unknown }).error) ??
    str((json as { message?: unknown }).message);
  if (errMsg) throw new Error(`Windsor API error: ${errMsg}`);

  return [];
}

/* ---------------------------------------------------------------- aggregation */

function normalize(rows: Row[]): {
  posts: Post[];
  account: Account;
} {
  let followers = 0;
  let accountName: string | null = null;

  const groups = new Map<
    string,
    { best: Row; bestViews: number; minDate: string | null }
  >();

  for (const row of rows) {
    const fc = num(row.followers_count);
    if (fc != null) followers = Math.max(followers, fc);
    if (!accountName) accountName = str(row.account_name);

    const id = str(row.media_id) ?? str(row.media_permalink);
    if (!id) continue;

    const views = num(row.media_views) ?? num(row.media_plays) ?? 0;
    const date = str(row.date);
    const existing = groups.get(id);

    if (!existing) {
      groups.set(id, { best: row, bestViews: views, minDate: date });
    } else {
      if (views > existing.bestViews) {
        existing.best = row;
        existing.bestViews = views;
      }
      if (date && (!existing.minDate || date < existing.minDate)) {
        existing.minDate = date;
      }
    }
  }

  const posts: Post[] = [];
  let i = 0;
  for (const { best, minDate } of groups.values()) {
    const views = num(best.media_views) ?? num(best.media_plays) ?? 0;
    const reach = num(best.media_reach) ?? 0;
    const likes = num(best.media_like_count) ?? 0;
    const comments = num(best.media_comments_count) ?? 0;
    const saves = num(best.media_saved) ?? 0;
    const shares = num(best.media_shares) ?? 0;
    const engagementRate =
      views > 0 ? (likes + comments + saves + shares) / views : 0;
    const replayRate = reach > 0 ? views / reach : 0;
    const type = (
      str(best.media_product_type) ??
      str(best.media_type) ??
      "POST"
    ).toUpperCase();

    posts.push({
      id: str(best.media_id) ?? str(best.media_permalink) ?? `post-${i}`,
      date: str(best.date) ?? minDate,
      caption: str(best.media_caption) ?? "",
      permalink: str(best.media_permalink),
      thumbnail: str(best.media_thumbnail_url),
      type,
      views,
      reach,
      likes,
      comments,
      saves,
      shares,
      avgWatchTimeMs: num(best.media_reel_avg_watch_time),
      engagementRate,
      replayRate,
    });
    i += 1;
  }

  posts.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return {
    posts,
    account: { name: accountName, followers },
  };
}

function aggregate(posts: Post[]): Stats {
  const sum = (sel: (p: Post) => number) =>
    posts.reduce((total, p) => total + sel(p), 0);

  const totalViews = sum((p) => p.views);
  const totalReach = sum((p) => p.reach);
  const totalLikes = sum((p) => p.likes);
  const totalComments = sum((p) => p.comments);
  const totalSaves = sum((p) => p.saves);
  const totalShares = sum((p) => p.shares);

  const engagementRate =
    totalViews > 0
      ? (totalLikes + totalComments + totalSaves + totalShares) / totalViews
      : 0;

  return {
    postCount: posts.length,
    totalViews,
    totalReach,
    totalLikes,
    totalComments,
    totalSaves,
    totalShares,
    engagementRate,
  };
}

/* -------------------------------------------------------------------- public */

export async function fetchContent(
  apiKey: string,
  range: RangeKey,
): Promise<Omit<ContentPayload, "cached">> {
  const preset = RANGE_PRESET[range];

  const available = await discoverFields(apiKey);
  const fields = available
    ? WISH_FIELDS.filter((f) => available.has(f))
    : WISH_FIELDS.filter((f) => !RISKY_WHEN_UNKNOWN.has(f));

  // Guarantee the core fields survive even if discovery returned a short list.
  const finalFields = Array.from(
    new Set([
      ...CORE_FIELDS.filter((f) => !available || available.has(f)),
      ...fields,
    ]),
  );
  const useFields = finalFields.length ? finalFields : CORE_FIELDS;

  const rows = await fetchRows(apiKey, preset, useFields);
  const { posts, account } = normalize(rows);
  const stats = aggregate(posts);

  return {
    posts,
    account,
    stats,
    range,
    fetchedAt: new Date().toISOString(),
    fieldsUsed: useFields,
  };
}

/**
 * Account-level daily time series. Always last_30d, per spec. These metrics live
 * in different Windsor tables than the per-post media_* fields, so this is a
 * deliberately separate query — they still join cleanly on `date`.
 */
const DAILY_FIELDS = [
  "date",
  "views",
  "reach",
  "accounts_engaged",
  "total_interactions",
  "follows_and_unfollows",
  "followers_count",
];

export async function fetchAccountDaily(
  apiKey: string,
): Promise<Omit<AccountDailyPayload, "cached">> {
  const url =
    `${BASE}?api_key=${encodeURIComponent(apiKey)}` +
    `&date_preset=last_30d&fields=${DAILY_FIELDS.join(",")}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Windsor API responded ${res.status} ${res.statusText}. ${body.slice(0, 400)}`.trim(),
    );
  }

  const json: unknown = await res.json();
  const rowsRaw = (json as { data?: unknown }).data;
  if (!Array.isArray(rowsRaw)) {
    const errMsg =
      str((json as { error?: unknown }).error) ??
      str((json as { message?: unknown }).message);
    if (errMsg) throw new Error(`Windsor API error: ${errMsg}`);
  }
  const rows: Row[] = Array.isArray(rowsRaw) ? (rowsRaw as Row[]) : [];

  let followers: number | null = null;
  const days: DailyPoint[] = [];

  for (const row of rows) {
    const fc = num(row.followers_count);
    if (fc != null) followers = fc;

    const date = str(row.date);
    if (!date) continue;

    const views = num(row.views);
    const reach = num(row.reach);
    const accountsEngaged = num(row.accounts_engaged);
    const totalInteractions = num(row.total_interactions);
    const followerActivity = num(row.follows_and_unfollows);

    // Windsor returns the current (incomplete) day with every metric null and
    // only a followers_count snapshot — skip it so charts don't dip to zero.
    if (
      views == null &&
      reach == null &&
      accountsEngaged == null &&
      totalInteractions == null &&
      followerActivity == null
    ) {
      continue;
    }

    days.push({
      date,
      views: views ?? 0,
      reach: reach ?? 0,
      accountsEngaged: accountsEngaged ?? 0,
      totalInteractions: totalInteractions ?? 0,
      followerActivity: followerActivity ?? 0,
    });
  }

  days.sort((a, b) => a.date.localeCompare(b.date));

  const sum = (sel: (d: DailyPoint) => number) =>
    days.reduce((total, d) => total + sel(d), 0);

  return {
    days,
    totals: {
      views: sum((d) => d.views),
      reach: sum((d) => d.reach),
      accountsEngaged: sum((d) => d.accountsEngaged),
      totalInteractions: sum((d) => d.totalInteractions),
      followerActivity: sum((d) => d.followerActivity),
    },
    followers,
    fetchedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------- audience fetch */

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDER_LABEL: Record<string, string> = {
  F: "Female",
  M: "Male",
  U: "Unknown",
};

/**
 * Windsor rejects more than one demographic breakdown per request
 * ("You can use only one breakdown per request"), so age / gender / country /
 * city are four separate calls, run in parallel.
 */
async function fetchBreakdown(
  apiKey: string,
  fields: string[],
): Promise<Row[]> {
  const url =
    `${BASE}?api_key=${encodeURIComponent(apiKey)}` +
    `&date_preset=last_30d&fields=${["date", ...fields].join(",")}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Windsor API responded ${res.status} ${res.statusText}. ${body.slice(0, 300)}`.trim(),
    );
  }
  const json: unknown = await res.json();
  const data = (json as { data?: unknown }).data;
  if (Array.isArray(data)) return data as Row[];

  const errMsg =
    str((json as { error?: unknown }).error) ??
    str((json as { message?: unknown }).message);
  if (errMsg) throw new Error(`Windsor API error: ${errMsg}`);
  return [];
}

function regionName(dn: Intl.DisplayNames | null, code: string): string {
  if (!dn || code.length !== 2) return code;
  try {
    return dn.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

interface BucketOpts {
  order?: string[];
  topN?: number;
}

function toBuckets(
  rows: Row[],
  nameKey: string,
  sizeKey: string,
  opts: BucketOpts = {},
): { buckets: AudienceBucket[]; date: string | null } {
  // Keep only the most recent snapshot date.
  let latest: string | null = null;
  for (const r of rows) {
    const d = str(r.date);
    if (d && (!latest || d > latest)) latest = d;
  }
  const rowsForDate = latest
    ? rows.filter((r) => str(r.date) === latest)
    : rows;

  const raw = rowsForDate
    .map((r) => ({
      name: str(r[nameKey]) ?? "Unknown",
      size: num(r[sizeKey]) ?? 0,
    }))
    .filter((b) => b.size > 0);

  const total = raw.reduce((t, b) => t + b.size, 0);
  let buckets: AudienceBucket[] = raw.map((b) => ({
    ...b,
    pct: total > 0 ? b.size / total : 0,
  }));

  if (opts.order) {
    const rank = (name: string) => {
      const i = opts.order!.indexOf(name);
      return i === -1 ? opts.order!.length : i;
    };
    buckets.sort((a, b) => rank(a.name) - rank(b.name));
  } else {
    buckets.sort((a, b) => b.size - a.size);
  }

  if (opts.topN && buckets.length > opts.topN) {
    const head = buckets.slice(0, opts.topN);
    const tail = buckets.slice(opts.topN);
    const tailSize = tail.reduce((t, b) => t + b.size, 0);
    head.push({
      name: `Other (${tail.length})`,
      size: tailSize,
      pct: total > 0 ? tailSize / total : 0,
    });
    buckets = head;
  }

  return { buckets, date: latest };
}

export async function fetchAudience(
  apiKey: string,
): Promise<Omit<AudiencePayload, "cached">> {
  const [ageRows, genderRows, countryRows, cityRows] = await Promise.all([
    fetchBreakdown(apiKey, ["audience_age_name", "audience_age_size"]),
    fetchBreakdown(apiKey, ["audience_gender_name", "audience_gender_size"]),
    fetchBreakdown(apiKey, ["audience_country_name", "audience_country_size"]),
    fetchBreakdown(apiKey, ["city", "audience_city_size"]),
  ]);

  const age = toBuckets(ageRows, "audience_age_name", "audience_age_size", {
    order: AGE_ORDER,
  });
  const gender = toBuckets(
    genderRows,
    "audience_gender_name",
    "audience_gender_size",
  );
  const countries = toBuckets(
    countryRows,
    "audience_country_name",
    "audience_country_size",
    { topN: 6 },
  );
  const cities = toBuckets(cityRows, "city", "audience_city_size", { topN: 6 });

  let dn: Intl.DisplayNames | null = null;
  try {
    dn = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    dn = null;
  }

  return {
    snapshotDate:
      age.date ?? gender.date ?? countries.date ?? cities.date ?? null,
    age: age.buckets,
    gender: gender.buckets.map((b) => ({
      ...b,
      name: GENDER_LABEL[b.name] ?? b.name,
    })),
    countries: countries.buckets.map((b) =>
      b.name.startsWith("Other (")
        ? b
        : { ...b, name: regionName(dn, b.name) },
    ),
    cities: cities.buckets,
    audienceTotal: gender.buckets.reduce((t, b) => t + b.size, 0),
    fetchedAt: new Date().toISOString(),
  };
}

/* --------------------------------------------------------------- stories fetch */

const STORY_FIELDS = [
  "date",
  "story_id",
  "story_timestamp",
  "story_permalink",
  "story_thumbnail_url",
  "story_views",
  "story_reach",
  "story_replies",
  "story_shares",
  "story_exits",
  "story_interactions",
  "story_impressions",
  "story_taps_forward",
  "story_taps_back",
  "story_swipe_forward",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function dayOf(ts: string | null): string | null {
  if (!ts) return null;
  const t = new Date(ts);
  if (Number.isNaN(t.getTime())) return ts.length >= 10 ? ts.slice(0, 10) : null;
  return t.toISOString().slice(0, 10);
}

/**
 * Fetch the stories that are currently live (inside their 24h window). Windsor
 * only exposes stories while they are live — historical stories are not
 * queryable at all (verified against last_7d / last_30d / last_90d, all empty) —
 * so an empty result simply means "no active story". `date_preset=last_1dT` is
 * the trailing 24h window, today included ("today"/"yesterday" are rejected).
 */
export async function fetchLiveStoryRecords(
  apiKey: string,
): Promise<LiveStoryRecord[]> {
  const url =
    `${BASE}?api_key=${encodeURIComponent(apiKey)}` +
    `&date_preset=last_1dT&fields=${STORY_FIELDS.join(",")}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Windsor API responded ${res.status} ${res.statusText}. ${body.slice(0, 300)}`.trim(),
    );
  }

  const json: unknown = await res.json();
  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    const errMsg =
      str((json as { error?: unknown }).error) ??
      str((json as { message?: unknown }).message);
    if (errMsg) throw new Error(`Windsor API error: ${errMsg}`);
    return [];
  }

  const now = Date.now();
  const groups = new Map<string, { best: Row; bestViews: number }>();

  for (const row of data as Row[]) {
    const id = str(row.story_id) ?? str(row.story_permalink);
    if (!id) continue;
    const views = num(row.story_views) ?? 0;
    const g = groups.get(id);
    if (!g || views > g.bestViews) {
      groups.set(id, { best: row, bestViews: views });
    }
  }

  const records: LiveStoryRecord[] = [];
  for (const { best } of groups.values()) {
    const ts = str(best.story_timestamp);
    // Keep only stories still inside their 24h life. If the timestamp is
    // missing, trust the last_1dT query window.
    if (ts) {
      const t = new Date(ts).getTime();
      if (Number.isFinite(t) && now - t > DAY_MS) continue;
    }

    records.push({
      id: str(best.story_id) ?? str(best.story_permalink) ?? ts ?? "story",
      timestamp: ts,
      date: dayOf(ts) ?? str(best.date),
      permalink: str(best.story_permalink),
      thumbnail: str(best.story_thumbnail_url),
      views: num(best.story_views) ?? 0,
      reach: num(best.story_reach) ?? 0,
      replies: num(best.story_replies) ?? 0,
      shares: num(best.story_shares) ?? 0,
      exits: num(best.story_exits) ?? 0,
      interactions: num(best.story_interactions) ?? 0,
      impressions: num(best.story_impressions),
      tapsForward: num(best.story_taps_forward),
      tapsBack: num(best.story_taps_back),
      swipeForward: num(best.story_swipe_forward),
    });
  }

  records.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  return records;
}

function liveToStory(r: LiveStoryRecord): Story {
  return {
    id: r.id,
    timestamp: r.timestamp,
    permalink: r.permalink,
    thumbnail: r.thumbnail,
    views: r.views,
    reach: r.reach,
    replies: r.replies,
    shares: r.shares,
    exits: r.exits,
    interactions: r.interactions,
    exitRate: r.views > 0 ? r.exits / r.views : 0,
  };
}

function maxN(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return Math.max(a, b);
}

/**
 * Merge a batch of live records into a history object, keeping the highest value
 * ever seen for every metric (views only ever climb during a story's life, but a
 * later fetch can also catch a metric that was null earlier). Pure — the caller
 * is responsible for persisting the result.
 */
export function mergeStorySnapshots(
  history: StoryHistory,
  records: LiveStoryRecord[],
  at: Date = new Date(),
): StoryHistory {
  if (!records.length) return history;

  const nowIso = at.toISOString();
  const today = nowIso.slice(0, 10);
  const entries: Record<string, StoryHistoryEntry> = { ...history.entries };

  for (const r of records) {
    const prev = entries[r.id];
    entries[r.id] = {
      id: r.id,
      timestamp: prev?.timestamp ?? r.timestamp,
      date: prev?.date ?? r.date,
      permalink: prev?.permalink ?? r.permalink,
      thumbnail: prev?.thumbnail ?? r.thumbnail,
      views: maxN(prev?.views, r.views) ?? 0,
      reach: maxN(prev?.reach, r.reach) ?? 0,
      replies: maxN(prev?.replies, r.replies) ?? 0,
      shares: maxN(prev?.shares, r.shares) ?? 0,
      exits: maxN(prev?.exits, r.exits) ?? 0,
      interactions: maxN(prev?.interactions, r.interactions) ?? 0,
      impressions: maxN(prev?.impressions, r.impressions),
      tapsForward: maxN(prev?.tapsForward, r.tapsForward),
      tapsBack: maxN(prev?.tapsBack, r.tapsBack),
      swipeForward: maxN(prev?.swipeForward, r.swipeForward),
      firstSeen: prev?.firstSeen ?? nowIso,
      lastSeen: nowIso,
      snapshotCount: (prev?.snapshotCount ?? 0) + 1,
    };
  }

  return {
    schemaVersion: STORY_SCHEMA_VERSION,
    firstSnapshot: history.firstSnapshot ?? today,
    entries,
  };
}

/** Frames within ~4h of each other (same day) are treated as one posting burst. */
const SEQUENCE_GAP_MS = 4 * 60 * 60 * 1000;

interface FramesResult {
  frames: StoryFrame[];
  daily: StoryDailyPoint[];
  sequences: StorySequence[];
}

/**
 * The core of both the range view and the monthly archive: group entries by day,
 * order each day's frames by timestamp, compute the frame-to-frame retention /
 * drop-off funnel (indexed 1..N per day), and split each day into sequences
 * (bursts of frames within ~4h of each other).
 */
function computeFrames(entries: StoryHistoryEntry[]): FramesResult {
  const byDay = new Map<string, StoryHistoryEntry[]>();
  for (const e of entries) {
    const day = e.date ?? e.timestamp?.slice(0, 10) ?? "undated";
    const list = byDay.get(day);
    if (list) list.push(e);
    else byDay.set(day, [e]);
  }

  const frames: StoryFrame[] = [];
  const daily: StoryDailyPoint[] = [];
  const sequences: StorySequence[] = [];

  for (const day of [...byDay.keys()].sort((a, b) => a.localeCompare(b))) {
    const list = byDay.get(day)!;
    list.sort((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""));

    // Split the day into sequences: a new one starts whenever the gap to the
    // previous frame exceeds ~4h, or a timestamp is missing.
    const seqGroups: StoryHistoryEntry[][] = [];
    for (const e of list) {
      const group = seqGroups[seqGroups.length - 1];
      const prev = group?.[group.length - 1];
      const withinGap =
        group &&
        prev?.timestamp &&
        e.timestamp &&
        Math.abs(
          new Date(e.timestamp).getTime() - new Date(prev.timestamp).getTime(),
        ) <= SEQUENCE_GAP_MS;
      if (withinGap) group!.push(e);
      else seqGroups.push([e]);
    }

    const firstViews = list[0]?.views ?? 0;
    let prevViews = 0;
    let position = 0;

    seqGroups.forEach((group, seqIdx) => {
      const sequenceId = `${day}-s${seqIdx + 1}`;
      const groupFrames: StoryFrame[] = [];

      group.forEach((e, posInSeq) => {
        position += 1;
        const views = e.views ?? 0;
        const retention =
          firstViews > 0 ? views / firstViews : position === 1 ? 1 : 0;
        const dropOff =
          position === 1
            ? 0
            : prevViews > 0
              ? Math.max(0, 1 - views / prevViews)
              : 0;

        const frame: StoryFrame = {
          id: e.id,
          date: day,
          position,
          timestamp: e.timestamp,
          permalink: e.permalink,
          thumbnail: e.thumbnail,
          views,
          reach: e.reach ?? 0,
          exits: e.exits ?? 0,
          exitRate: views > 0 ? (e.exits ?? 0) / views : 0,
          replies: e.replies ?? 0,
          shares: e.shares ?? 0,
          retention,
          dropOff,
          sequenceId,
          sequencePosition: posInSeq + 1,
          sequenceLength: group.length,
        };
        frames.push(frame);
        groupFrames.push(frame);
        prevViews = views;
      });

      const opening = groupFrames[0]?.views ?? 0;
      const closing = groupFrames[groupFrames.length - 1]?.views ?? 0;
      const totalReplies = groupFrames.reduce((s, f) => s + f.replies, 0);
      const totalShares = groupFrames.reduce((s, f) => s + f.shares, 0);
      sequences.push({
        id: sequenceId,
        date: day,
        position: seqIdx + 1,
        frames: groupFrames,
        frameCount: groupFrames.length,
        openingViewers: opening,
        closingViewers: closing,
        completionRate: opening > 0 ? closing / opening : 0,
        totalReplies,
        totalShares,
        replyRate: opening > 0 ? totalReplies / opening : 0,
      });
    });

    const totViews = list.reduce((s, e) => s + (e.views ?? 0), 0);
    const totReach = list.reduce((s, e) => s + (e.reach ?? 0), 0);
    daily.push({
      date: day,
      views: totViews,
      reach: totReach,
      frames: list.length,
      avgViewsPerFrame: list.length ? totViews / list.length : 0,
    });
  }

  return { frames, daily, sequences };
}

/** Entries whose day/timestamp falls within [cutoff, now]; undated entries are kept. */
function entriesSince(
  history: StoryHistory,
  cutoffMs: number,
): StoryHistoryEntry[] {
  return Object.values(history.entries).filter((e) => {
    const basis = e.timestamp ?? e.date;
    if (!basis) return true; // keep undated frames rather than hide real data
    const t = new Date(basis).getTime();
    return !Number.isFinite(t) || t >= cutoffMs;
  });
}

function completionByDay(frames: StoryFrame[], daily: StoryDailyPoint[]): number[] {
  return daily
    .filter((d) => d.frames >= 2)
    .map((d) => {
      const dayFrames = frames.filter((f) => f.date === d.date);
      return dayFrames[dayFrames.length - 1]?.retention ?? 0;
    });
}

/**
 * Assemble the Stories payload: the currently-live stories plus everything the
 * snapshot store knows within the selected range. Retention / drop-off are the
 * frame-to-frame view funnel, computed per day (frames ordered by timestamp,
 * indexed 1..N).
 */
export function buildStoriesPayload(
  live: LiveStoryRecord[],
  history: StoryHistory,
  range: RangeKey,
): Omit<StoriesPayload, "cached"> {
  const stories = live.map(liveToStory);

  const cutoff = Date.now() - RANGE_DAYS[range] * DAY_MS;
  const { frames, daily } = computeFrames(entriesSince(history, cutoff));

  const totalFrames = frames.length;
  const sum = (sel: (f: StoryFrame) => number) =>
    frames.reduce((s, f) => s + sel(f), 0);
  const completions = completionByDay(frames, daily);

  const aggregates: StoryRangeAggregates = {
    totalFrames,
    avgViewsPerFrame: totalFrames ? sum((f) => f.views) / totalFrames : 0,
    avgExitRate: totalFrames ? sum((f) => f.exitRate) / totalFrames : 0,
    avgCompletion: completions.length
      ? completions.reduce((a, b) => a + b, 0) / completions.length
      : 0,
    completionDayCount: completions.length,
    totalReplies: sum((f) => f.replies),
    totalShares: sum((f) => f.shares),
    bestFrame: totalFrames
      ? frames.reduce((a, b) => (b.views > a.views ? b : a))
      : null,
    worstFrame: totalFrames
      ? frames.reduce((a, b) => (b.views < a.views ? b : a))
      : null,
  };

  return {
    stories,
    range,
    frames,
    daily,
    aggregates,
    historySince: history.firstSnapshot,
    fetchedAt: new Date().toISOString(),
  };
}

/* ---------------------------------------------------------- monthly archive */

/** Every month present in the store, newest first, each with a frame count. */
export function listStoryMonths(history: StoryHistory): StoryMonthMeta[] {
  const counts = new Map<string, number>();
  for (const e of Object.values(history.entries)) {
    const day = e.date ?? e.timestamp?.slice(0, 10) ?? null;
    if (!day) continue;
    const month = day.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  const firstSnapshotMonth = history.firstSnapshot?.slice(0, 7) ?? null;
  const firstSnapshotDay = history.firstSnapshot?.slice(8, 10) ?? null;

  return [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, frameCount]) => ({
      month,
      frameCount,
      partial: month === firstSnapshotMonth && firstSnapshotDay !== "01",
    }));
}

function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function prevMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? monthKey(y - 1, 12) : monthKey(y, m - 1);
}

/** Everything the store knows for one calendar month — no month-over-month yet. */
function buildStoryMonth(
  history: StoryHistory,
  month: string,
): Omit<StoryMonthData, "comparison"> | null {
  const monthEntries = Object.values(history.entries).filter(
    (e) => (e.date ?? e.timestamp?.slice(0, 10))?.slice(0, 7) === month,
  );
  if (!monthEntries.length) return null;

  const { frames, daily, sequences } = computeFrames(monthEntries);

  const totalFrames = frames.length;
  const sum = (sel: (f: StoryFrame) => number) =>
    frames.reduce((s, f) => s + sel(f), 0);
  const totalViewers = sum((f) => f.views);
  const completions = completionByDay(frames, daily);

  const bestRepliesSequence = sequences.length
    ? sequences.reduce((a, b) => (b.totalReplies > a.totalReplies ? b : a))
    : null;
  const bestRepliesFrame = totalFrames
    ? frames.reduce((a, b) => (b.replies > a.replies ? b : a))
    : null;

  const aggregates: StoryMonthAggregates = {
    totalFrames,
    totalViewers,
    avgViewsPerFrame: totalFrames ? totalViewers / totalFrames : 0,
    avgCompletion: completions.length
      ? completions.reduce((a, b) => a + b, 0) / completions.length
      : 0,
    completionDayCount: completions.length,
    avgExitRate: totalFrames ? sum((f) => f.exitRate) / totalFrames : 0,
    totalReplies: sum((f) => f.replies),
    totalShares: sum((f) => f.shares),
    bestFrame: totalFrames
      ? frames.reduce((a, b) => (b.views > a.views ? b : a))
      : null,
    worstFrame: totalFrames
      ? frames.reduce((a, b) => (b.views < a.views ? b : a))
      : null,
    bestRepliesSequence,
    bestRepliesFrame,
  };

  const firstSnapshotMonth = history.firstSnapshot?.slice(0, 7) ?? null;
  const firstSnapshotDay = history.firstSnapshot?.slice(8, 10) ?? null;
  const partial = month === firstSnapshotMonth && firstSnapshotDay !== "01";

  return {
    month,
    partial,
    coverageSince: history.firstSnapshot,
    frames,
    daily,
    sequences,
    aggregates,
  };
}

function deltaPct(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return (current - previous) / previous;
}

function monthReplyRate(agg: StoryMonthAggregates): number | null {
  return agg.totalViewers > 0 ? agg.totalReplies / agg.totalViewers : null;
}

/**
 * One calendar month's story data plus a month-over-month comparison (viewers,
 * completion, reply rate) against the previous month. Returns null when the
 * store has nothing at all for that month.
 */
export function buildStoryMonthPayload(
  history: StoryHistory,
  month: string,
): StoryMonthData | null {
  const current = buildStoryMonth(history, month);
  if (!current) return null;

  const previous = buildStoryMonth(history, prevMonthKey(month));
  const prevAgg = previous?.aggregates ?? null;
  const currentReplyRate = monthReplyRate(current.aggregates);
  const previousReplyRate = prevAgg ? monthReplyRate(prevAgg) : null;
  const currentCompletion =
    current.aggregates.completionDayCount > 0 ? current.aggregates.avgCompletion : null;
  const previousCompletion =
    prevAgg && prevAgg.completionDayCount > 0 ? prevAgg.avgCompletion : null;

  const comparison: StoryMonthComparison[] = [
    {
      metric: "viewers",
      label: "Total viewers",
      current: current.aggregates.totalViewers,
      previous: prevAgg?.totalViewers ?? null,
      deltaPct: deltaPct(current.aggregates.totalViewers, prevAgg?.totalViewers ?? null),
    },
    {
      metric: "completion",
      label: "Avg completion",
      current: currentCompletion,
      previous: previousCompletion,
      deltaPct: deltaPct(currentCompletion, previousCompletion),
    },
    {
      metric: "replyRate",
      label: "Reply rate",
      current: currentReplyRate,
      previous: previousReplyRate,
      deltaPct: deltaPct(currentReplyRate, previousReplyRate),
    },
  ];

  return { ...current, comparison };
}
