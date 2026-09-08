<script lang="ts">
  import { subDays, subMonths, subWeeks, subYears, format } from 'date-fns';
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import Select from 'svelte-select';
  import LogList from './LogList.svelte';
  import MenuBar from './MenuBar.svelte';
  import { getTags, getTimeEntries } from './TimeApi';
  import type { Period } from './timerStore';
  import { getDates } from './timerStore';
  import type { TimeEntry } from './types';

  export let period: Period = 'day';
  export let amount = '0';
  let amountNum = Number(amount) >= 0 ? Number(amount) : 0;
  $: isValidNext = amountNum > 0;
  let filterTags: string[] = [];
  let tags: string[] = [];
  let logs: TimeEntry[] = [];
  let filteredLogs: TimeEntry[];
  $: filteredLogs = logs.filter((log) => filterTags.every((tag) => log.tags.indexOf(tag) > -1));
  $: label = getLabel(period, amountNum);

  function getLabel(period: Period, amountNum: number) {
    const now = new Date();
    switch (period) {
      case 'day':
        return format(subDays(now, amountNum), 'MMMM do');
      case 'week':
        return 'week ' + format(subWeeks(now, amountNum), 'w');
      case 'month':
        return format(subMonths(now, amountNum), 'LLLL yyyy');
      case 'year':
        return format(subYears(now, amountNum), 'yyyy');
    }
  }

  function updateLogs() {
    const [start, stop] = getDates(amountNum, period);
    getTimeEntries(start, stop)
      .then((allLogs) => (logs = allLogs))
      .then(() => {
        navigate(`/log/${period}/${amountNum}`);
      })
      .catch(() => {
        // logs.set([]);
        console.log('Could not get time logs');
      });

    getTags()
      .then((allTags) => (tags = allTags))
      .catch(() => (tags = []));
  }

  onMount(updateLogs);

  function setFilter(event: { detail: Array<{ label: string; value: string }> }) {
    filterTags = event.detail?.map((opt) => opt.value) ?? [];
  }

  function goBack() {
    amountNum = amountNum + 1;
    updateLogs();
  }

  function goForward() {
    if (isValidNext) {
      amountNum = amountNum - 1;
      updateLogs();
    }
  }

  function periodChange() {
    amountNum = 0;
    updateLogs();
  }
</script>

<main>
  <div>
    <MenuBar active="logs" />
    <div class="period">
      <div>
        <button on:click={goBack}><i class="bi bi-chevron-down" /></button>
        {label}
        <button on:click={goForward} disabled={!isValidNext}><i class="bi bi-chevron-up" /></button>
      </div>
      <select bind:value={period} on:change={periodChange}>
        <option value="day">Day</option>
        <option value="week">Week</option>
        <option value="month">Month</option>
        <option value="year">Year</option>
      </select>
    </div>

    <div class="edit-tags">
      <Select
        on:select={setFilter}
        items={tags}
        value={filterTags.length ? filterTags : null}
        isMulti
        placeholder="Filter on tags"
      />
    </div>

    <LogList logs={filteredLogs} referrer={`/log/${period}/${amountNum}`} hideDateLabel={period === 'day'} />
  </div>
</main>

<style lang="scss">
  .edit-tags {
    margin: 1rem 0;
  }

  .period {
    display: flex;
    justify-content: center;
    align-items: center;
    > div:first-child {
      flex: 1;
    }
    select {
      width: auto;
      padding: var(--space-2) var(--space-2);
    }
    button {
      background: none;
      padding: 0;
      border: none;
      margin: 0 var(--space-4);
      cursor: pointer;
      &:disabled {
        color: var(--col-grey-50);
      }
    }
  }
</style>
