# Scheduled story-snapshot capture

`/api/stories/snapshot` records whichever stories are live right now into the
archive. `/api/stories` already does this opportunistically whenever the
dashboard is open, but nobody is guaranteed to have it open during a story's
24h life — this lets a scheduler hit the endpoint directly so capture doesn't
depend on that.

Prerequisites:

- `CRON_SECRET` set in `.env.local` (already generated for this machine).
- The dashboard reachable at `DASHBOARD_URL` in `.env.local` (defaults to
  `http://localhost:3000` — for a local dev server, it must be running when
  the scheduler fires; point it at a deployed URL instead if you'd rather not
  rely on that).

`scripts/story-snapshot.sh` reads both from `.env.local` and curls the
endpoint. Run it by hand any time to test:

```
./scripts/story-snapshot.sh
```

## Option A — launchd (macOS, recommended)

Runs every 2 hours, plus once immediately on load.

```
chmod +x scripts/story-snapshot.sh
cp scripts/com.content-dashboard.story-snapshot.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.content-dashboard.story-snapshot.plist
```

Check it's loaded:

```
launchctl list | grep com.content-dashboard.story-snapshot
```

Logs (stdout and stderr both) land in `data/story-snapshot.log`.

To stop it:

```
launchctl unload ~/Library/LaunchAgents/com.content-dashboard.story-snapshot.plist
```

To pick up an edited plist, unload then load again.

## Option B — crontab (fallback, any Unix)

```
crontab -e
```

Add:

```
0 */2 * * * /bin/bash /Users/marko4jokic/content-dashboard/scripts/story-snapshot.sh >> /Users/marko4jokic/content-dashboard/data/story-snapshot.log 2>&1
```

Remove it later with `crontab -e` and deleting the line, or `crontab -r` to
clear the whole crontab (careful — that drops every job, not just this one).
