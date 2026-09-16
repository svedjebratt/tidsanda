<script lang="ts">
    import { format, isSameDay } from "date-fns";
    import { goto } from "$app/navigation";
    import Tag from "./Tag.svelte";
    import {
        groupTimeEntries,
        groupTagGroupsByStartDay,
        type TagGroup,
    } from "$lib/groupTimeEntries";
    import { formatSecsNatural } from "$lib/stores/timerStore";
    import type { TimeEntry } from "$lib/types";

    let {
        logs = [],
        activeElapsed = 0,
        referrer = "",
        hideDateLabel = false,
        grouping = "entries",
    } = $props<{
        logs?: TimeEntry[];
        activeElapsed?: number;
        referrer?: string;
        hideDateLabel?: boolean;
        grouping?: "entries" | "tags" | "start-day-tags";
    }>();
    let total = $derived(
        activeElapsed +
            logs.reduce(
                (total: number, entry: TimeEntry) =>
                    total + (entry.duration ?? 0),
                0,
            ),
    );
    let tagGroups = $derived(grouping === "tags" ? groupTimeEntries(logs) : []);
    let tagGroupsByStartDay = $derived(
        grouping === "start-day-tags" ? groupTagGroupsByStartDay(logs) : [],
    );

    function goTo(url: string) {
        goto(url, { state: referrer ? { prevUrl: referrer } : undefined });
    }
</script>

{#snippet timeEntryLink(timeEntry: TimeEntry, showTags: boolean)}
    <a
        href="/log/{timeEntry.id}"
        onclick={(event) => {
            event.preventDefault();
            goTo(`/log/${timeEntry.id}`);
        }}
    >
        <div class="time">
            <div class="duration">
                <h4>Duration</h4>
                {formatSecsNatural(timeEntry.duration ?? 0)}
            </div>
            <span class="divider"></span>
            <div class="start">
                <h4>Start time</h4>
                {format(timeEntry.start, "HH:mm")}
            </div>
            <span class="divider"></span>
            <div class="stop">
                <h4>Stop time</h4>
                {format(timeEntry.stop ?? timeEntry.start, "HH:mm")}
            </div>
        </div>
        {#if showTags}
            <div class="tags">
                {#each timeEntry.tags as tag}
                    <span class="tag">
                        <Tag>{tag}</Tag>
                    </span>
                {/each}
            </div>
        {/if}
    </a>
{/snippet}

{#snippet tagGroup(group: TagGroup)}
    <li class="tag-group" role="group" aria-label="Tag group">
        {#each group.entries as timeEntry}
            <div class="entry-row">
                {@render timeEntryLink(timeEntry, false)}
            </div>
        {/each}
        <div class="group-footer">
            {#if group.entries.length > 1}
                <div class="group-total">Σ {formatSecsNatural(group.totalDuration)}</div>
            {/if}
            <div class="tags">
                {#each group.tags as tag}
                    <span class="tag"><Tag>{tag}</Tag></span>
                {/each}
            </div>
        </div>
    </li>
{/snippet}

<div>
    <ul>
        {#if grouping === "start-day-tags"}
            {#each tagGroupsByStartDay as day}
                {#if !hideDateLabel}
                    <li><h4>{format(day.date, "EEEE, d MMM")}</h4></li>
                {/if}
                {#each day.groups as group}
                    {@render tagGroup(group)}
                {/each}
            {/each}
        {:else if grouping === "tags"}
            {#each tagGroups as group}
                {@render tagGroup(group)}
            {/each}
        {:else}
            {#each logs as timeEntry, index}
                {#if !hideDateLabel && (index - 1 < 0 || !isSameDay(timeEntry.start, logs[index - 1].start))}
                    <li><h4>{format(timeEntry.start, "EEEE, d MMM")}</h4></li>
                {/if}
                <li>{@render timeEntryLink(timeEntry, true)}</li>
            {/each}
        {/if}
    </ul>
    {#if activeElapsed > 0 || logs.length > 1}
        <div>Total: {formatSecsNatural(total)}</div>
    {/if}
</div>

<style lang="scss">
    ul {
        margin: 0;
        padding: 0;
        list-style-type: none;
        li {
            h4 {
                margin: var(--space-5) 0 0;
                font-weight: normal;
                text-align: center;
            }
            list-style-type: none;
            > a,
            .entry-row > a {
                display: block;
                color: var(--col-black);
                background: var(--col-grey-30);
                padding: var(--space-3);
                text-decoration: none;
                &:hover {
                    background: var(--col-grey-40);
                }
            }
            margin-bottom: var(--space-3);
        }
    }

    .tag-group {
        background: var(--col-grey-30);
    }

    .entry-row + .entry-row {
        border-top: 1px solid var(--col-grey-50);
    }

    .group-footer {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        justify-content: space-between;
        padding: 0 var(--space-3) var(--space-3);

        .tags {
            flex: 1;
        }
    }

    .group-total {
        white-space: nowrap;
    }

    .time {
        display: flex;
        justify-content: space-around;
        align-items: center;

        h4 {
            padding: 0;
            margin: 0 0 var(--space-1);
            color: var(--col-grey-60);
            font-weight: 600;
            font-size: 0.7rem;
        }
        .duration {
            font-weight: 600;
        }

        > div {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 80px;
        }

        span.divider {
            display: block;
            width: 1px;
            height: 20px;
            background: var(--col-grey-50);
        }
    }

    .tags {
        text-align: right;
        // margin-top: var(--space-3);
        .tag {
            display: inline-block;
        }
        .tag + .tag {
            margin-left: var(--space-2);
        }
    }
</style>
