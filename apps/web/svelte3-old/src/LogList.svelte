<script lang="ts">
  import { format, isSameDay } from 'date-fns';
  import { navigate } from 'svelte-routing';
  import Tag from './Tag.svelte';
  import { formatSecsNatural } from './timerStore';
  import type { TimeEntry } from './types';

  export let logs: TimeEntry[] = [];
  export let activeElapsed: number = 0;
  export let referrer: string = null;
  export let hideDateLabel: boolean = false;
  $: total = activeElapsed + logs.reduce((total, entry) => total + entry.duration, 0);
  let openTimeIds: number[] = [];

  // function toggle(timeEntry: TimeEntry) {
  //     const index = openTimeIds.indexOf(timeEntry.timeId);
  //     if (index === -1) {
  //         openTimeIds = [...openTimeIds, timeEntry.timeId];
  //     } else {
  //         openTimeIds = openTimeIds.slice(0, index).concat(openTimeIds.slice(index + 1));
  //     }
  // }

  function goTo(url: string) {
    navigate(url, { state: referrer ? { prevUrl: referrer } : null });
  }
</script>

<div>
  <ul>
    {#each logs as timeEntry, index}
      {#if !hideDateLabel && (index - 1 < 0 || !isSameDay(timeEntry.start, logs[index - 1].start))}
        <li><h4>{format(timeEntry.start, 'EEEE, d MMM')}</h4></li>
      {/if}
      <li>
        <a href="/log/{timeEntry.id}" on:click|preventDefault={() => goTo(`/log/${timeEntry.id}`)}>
          <div class="time">
            <div class="duration">
              <h4>Duration</h4>
              {formatSecsNatural(timeEntry.duration)}
            </div>
            <span class="divider" />
            <div class="start">
              <h4>Start time</h4>
              {format(timeEntry.start, 'HH:mm')}
            </div>
            <span class="divider" />
            <div class="stop">
              <h4>Stop time</h4>
              {format(timeEntry.stop, 'HH:mm')}
            </div>
          </div>
          <div class="tags">
            {#each timeEntry.tags as tag}
              <span class="tag">
                <Tag>{tag}</Tag>
              </span>
            {/each}
          </div>
        </a>
      </li>
    {/each}
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
      > a {
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
    margin-top: var(--space-3);
    .tag {
      display: inline-block;
    }
    .tag + .tag {
      margin-left: var(--space-2);
    }
  }
</style>
