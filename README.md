# Content Dashboard

Live Instagram analytics dashboard built with **Next.js 14 (App Router)**,
**TypeScript**, **Tailwind CSS**, and **Recharts**. Data comes from the
[Windsor.ai](https://windsor.ai) Instagram connector.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then paste your key
npm run dev
```

Set `WINDSOR_API_KEY` in `.env.local`. It is read **only** on the server, inside
`app/api/content/route.ts` — it is never bundled into client code. If the key is
missing the app shows a setup screen instead of crashing.

## How it works

- **`GET /api/content?range=7|30|90&refresh=1`** — server route that calls
  Windsor (`connectors.windsor.ai/instagram`), first discovering the account's
  available fields via `/instagram/fields`, then normalizing rows into a clean
  shape: `posts[]`, `account` (name + followers), and `stats` (totals +
  engagement rate). Results are cached in memory per range for **15 minutes**;
  `refresh=1` bypasses the cache. On an upstream failure the last good payload is
  served as `stale`.
- **`GET /api/account?refresh=1`** — a **separate** `date_preset=last_30d` query
  for account-level daily insights (`views`, `reach`, `accounts_engaged`,
  `total_interactions`, `follows_and_unfollows`). Returns a `days[]` time series
  plus 30-day totals. The current incomplete day is dropped. Cached 15 min.
- **`GET /api/audience?refresh=1`** — four parallel breakdown queries (age /
  gender / country / city — Windsor allows only one breakdown per request),
  filtered to the latest snapshot date, returned as percentage buckets. Country
  codes are resolved to names via `Intl.DisplayNames`. Cached 15 min.
- **`GET /api/stories?refresh=1`** — `date_preset=last_1dT` query against the
  `story_insights` fields. Returns only stories still inside their 24h life
  (checked against `story_timestamp`); an empty array means no active story.
  Cached 5 min.
- **`/` dashboard** — header (account, followers, 7/30/90 range picker, refresh),
  five stat cards, a Recharts bar chart of views per post, and a sortable table
  (click any header to sort, click a row to open the post on Instagram).
  Below that: an **Account activity** section (daily views area chart, daily
  follower-activity bar chart, engaged/interactions stat cards) and an
  **Audience** section (age bars, gender split, top countries, top cities), and
  an **Active stories** section that only renders when a story is currently up.
  The header refresh button busts the cache for all four routes at once.

The posts table's **Watch** column is `media_reel_avg_watch_time` in seconds;
**Replay** is `views / reach` (above 1.0× = average viewer rewatched, shown in
the accent color).

Engagement rate = `(likes + comments + saves + shares) / views`.

Null fields (common: `media_plays`, `media_saved`, reel watch time) fall back
gracefully — `media_views` is used when `media_plays` is null.

## Scripts

| command | what |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build + serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
