/**
 * Server-only append-only snapshot store for Instagram stories.
 *
 * Windsor only returns stories while they are live (24h) and — confirmed against
 * explicit date_from/date_to windows and long presets, not just the empty-result
 * case — never returns historical stories under any parameterization. So daily /
 * monthly history cannot be backfilled: every time /api/stories or
 * /api/stories/snapshot does a real upstream fetch, we record the live stories
 * here, keyed by story_id, keeping the highest value seen for each metric and a
 * count of how many times each story was sampled. History accumulates from the
 * first snapshot forward — it is never backdated.
 *
 * Persistence goes through the StoryStoreAdapter in lib/story-store.ts (JSON file
 * by default) so a durable backend can replace it later without touching either
 * of these two functions.
 */
import { mergeStorySnapshots, type LiveStoryRecord, type StoryHistory } from "@/lib/windsor";
import { storyStore } from "@/lib/story-store";

export function readStoryHistory(): Promise<StoryHistory> {
  return storyStore.load();
}

/**
 * Merge the current live stories into the store and persist. Returns the merged
 * history (usable even if the write fails, so the response for this request is
 * still correct even on a read-only / ephemeral filesystem).
 */
export async function recordStorySnapshots(
  records: LiveStoryRecord[],
): Promise<StoryHistory> {
  const merged = mergeStorySnapshots(await storyStore.load(), records);
  if (records.length) {
    await storyStore.save(merged);
  }
  return merged;
}
