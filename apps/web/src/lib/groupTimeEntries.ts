import { startOfDay } from 'date-fns';
import type { TimeEntry } from '$lib/types';

export interface TagGroup {
  tags: string[];
  entries: TimeEntry[];
  totalDuration: number;
}

export interface StartDayTagGroups {
  date: Date;
  groups: TagGroup[];
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
      group.totalDuration += entry.duration ?? 0;
    } else {
      groups.set(key, { tags, entries: [entry], totalDuration: entry.duration ?? 0 });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: group.entries.toSorted((left, right) => latestActivity(right) - latestActivity(left)),
    }))
    .toSorted((left, right) => latestActivity(right.entries[0]) - latestActivity(left.entries[0]));
}

export function groupTagGroupsByStartDay(timeEntries: TimeEntry[]): StartDayTagGroups[] {
  const days = new Map<number, TimeEntry[]>();

  for (const entry of timeEntries) {
    const date = startOfDay(entry.start).getTime();
    const entries = days.get(date);
    if (entries) {
      entries.push(entry);
    } else {
      days.set(date, [entry]);
    }
  }

  return [...days.entries()]
    .map(([date, entries]) => ({ date: new Date(date), groups: groupTimeEntries(entries) }))
    .toSorted((left, right) => right.date.getTime() - left.date.getTime());
}
