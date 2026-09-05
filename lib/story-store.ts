/**
 * Storage adapter for the story snapshot archive.
 *
 * JsonFileStoryStore (writing data/story-history.json, gitignored) is the only
 * implementation today, but everything in lib/story-history.ts talks to the
 * StoryStoreAdapter interface — a durable backend (a KV store, a database) can be
 * dropped in later by swapping the `storyStore` export below without touching any
 * caller.
 */
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { STORY_SCHEMA_VERSION, type StoryHistory } from "@/lib/windsor";

export interface StoryStoreAdapter {
  load(): Promise<StoryHistory>;
  save(history: StoryHistory): Promise<void>;
}

function emptyHistory(): StoryHistory {
  return { schemaVersion: STORY_SCHEMA_VERSION, firstSnapshot: null, entries: {} };
}

function isStoryHistoryShape(v: unknown): v is StoryHistory {
  return (
    !!v &&
    typeof v === "object" &&
    "entries" in v &&
    typeof (v as { entries: unknown }).entries === "object" &&
    (v as { entries: unknown }).entries !== null
  );
}

const DEFAULT_FILE = join(process.cwd(), "data", "story-history.json");

export class JsonFileStoryStore implements StoryStoreAdapter {
  constructor(private readonly file: string = DEFAULT_FILE) {}

  async load(): Promise<StoryHistory> {
    let raw: string;
    try {
      raw = await readFile(this.file, "utf8");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT") {
        // Missing file is the expected first-run case; anything else (bad
        // permissions, a half-written file) is worth a server log, but we still
        // start fresh rather than throw and take the whole route down.
        console.warn(
          `story-store: could not read ${this.file} (${code ?? "unknown error"}) — starting fresh.`,
        );
      }
      return emptyHistory();
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isStoryHistoryShape(parsed)) {
        console.warn(`story-store: ${this.file} has an unexpected shape — starting fresh.`);
        return emptyHistory();
      }
      return {
        schemaVersion:
          typeof parsed.schemaVersion === "number"
            ? parsed.schemaVersion
            : STORY_SCHEMA_VERSION,
        firstSnapshot:
          typeof parsed.firstSnapshot === "string" ? parsed.firstSnapshot : null,
        entries: parsed.entries,
      };
    } catch {
      console.warn(`story-store: ${this.file} is not valid JSON — starting fresh.`);
      return emptyHistory();
    }
  }

  async save(history: StoryHistory): Promise<void> {
    let tmp: string | null = null;
    try {
      await mkdir(dirname(this.file), { recursive: true });
      tmp = `${this.file}.tmp-${randomUUID()}`;
      await writeFile(tmp, `${JSON.stringify(history, null, 2)}\n`, "utf8");
      await rename(tmp, this.file); // atomic on the same filesystem
      tmp = null;
    } catch {
      /* best-effort: ephemeral / read-only fs (e.g. a serverless deploy) */
    } finally {
      if (tmp) {
        await unlink(tmp).catch(() => {});
      }
    }
  }
}

/** The active adapter. Point this at a different implementation to change backends. */
export const storyStore: StoryStoreAdapter = new JsonFileStoryStore();
