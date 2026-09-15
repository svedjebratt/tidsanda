import type { TimeEntry } from '$lib/types';

export interface TagGroup {
  tags: string[];
  entries: TimeEntry[];
}

function latestActivity(entry: TimeEntry): number {
  return (entry.stop ?? entry.start).getTime();
}

export function groupTimeEntries(timeEntries: TimeEntry[]): TagGroup[] {
  const groups = new Map<string, TagGroup>();

  for (const entry of timeEntries) {
    const tags = [...new Set(entry.tags)].sort();
    const key = JSON.stringify(tags);
    const group = groups.get(key);

    if (group) {
      group.entries.push(entry);
    } else {
      groups.set(key, { tags, entries: [entry] });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: group.entries.toSorted((left, right) => latestActivity(right) - latestActivity(left)),
    }))
    .toSorted((left, right) => latestActivity(right.entries[0]) - latestActivity(left.entries[0]));
}
