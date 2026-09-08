<script lang="ts">
  import { addDays, format, isAfter, isBefore, isSameDay, parse, startOfDay, subDays } from 'date-fns';
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import Select from 'svelte-select';
  import Button from './Button.svelte';
  import MenuBar from './MenuBar.svelte';
  import { deleteTimeEntry, getTags, getTimeEntry, updateTimeEntry } from './TimeApi';
  import { formatSecsNatural } from './timerStore';
  import type { TimeEntry } from './types';

  export let timeId: number;

  let timeEntry: TimeEntry;
  let tags: string[] = [];
  let selectedTags: string[] = [];
  $: selectedTags = timeEntry?.tags?.length ? timeEntry.tags : null;
  // let startTimeValue = '00:00';
  // $: startTimeValue = timeEntry?.start ? format(timeEntry.start, 'HH:mm') : '00:00';
  // let stopTimeValue = '00:00';
  // $: stopTimeValue = timeEntry?.stop ? format(timeEntry.stop, 'HH:mm') : '00:00';
  $: sameDay = timeEntry && isSameDay(timeEntry.start, timeEntry.stop);

  let start = '00:00';
  let stop = '00:00';
  $: isInvalidTimeSpan =
    !start || !stop || (sameDay && Number(start.replace(':', '')) >= Number(stop.replace(':', '')));
  $: isValidNextStartDay = timeEntry && isBefore(startOfDay(timeEntry.start), startOfDay(timeEntry.stop));
  $: isValidPrevStopDay = timeEntry && isAfter(startOfDay(timeEntry.stop), startOfDay(timeEntry.start));
  $: duration = timeEntry ? calcDuration(timeEntry, start, stop) : '';
  let prevUrl: string;
  $: isLog = prevUrl && prevUrl.startsWith('/log');

  function calcDuration(timeEntry: TimeEntry, start: string, stop: string) {
    const startTime = parse(start, 'HH:mm', timeEntry.start);
    const stopTime = parse(stop, 'HH:mm', timeEntry.stop);
    return formatSecsNatural((stopTime.getTime() - startTime.getTime()) / 1000);
  }

  onMount(() => {
    getTimeEntry(timeId)
      .then((te) => {
        timeEntry = te;
        // console.log('saved', timeEntry);
        start = format(timeEntry.start, 'HH:mm');
        stop = format(timeEntry.stop, 'HH:mm');
        // if (!timeEntry) {
        //   console.log('no time entry');
        //   return te;
        // }
        // startTimeValue = format(timeEntry?.start, 'HH:mm');
        // stopTimeValue = format(timeEntry?.stop, 'HH:mm');
      })
      .catch(() => console.log('time entry not found'));

    getTags()
      .then((allTags) => (tags = allTags))
      .catch(() => (tags = []));

    prevUrl = history.state?.prevUrl;
  });

  function setTags(event: { detail: Array<{ label: string; value: string }> }) {
    const newTags = event.detail?.map((opt) => opt.value) || [];
    // if (timeEntry.tags.length !== newTags.length || newTags.some((tag) => !timeEntry.tags.includes(tag))) {
    //   updateTimeEntry(timeEntry.id, {
    //     ...timeEntry,
    //     tags: newTags,
    //   })
    //     .then((te) => (timeEntry = te))
    //     .catch(() => console.log('could not update time entry ' + timeId));
    // }
    timeEntry = { ...timeEntry, tags: newTags };

    tags = newTags.reduce((all, tag) => {
      if (all.indexOf(tag) === -1) {
        return [...all, tag];
      }
      return all;
    }, tags);
  }

  function saveEntry() {
    const newTimeEntry = {
      ...timeEntry,
      start: parse(start, 'HH:mm', timeEntry.start),
      stop: parse(stop, 'HH:mm', timeEntry.stop),
    };
    console.log('save the stuff', newTimeEntry);

    updateTimeEntry(timeEntry.id, newTimeEntry)
      .then(() => navigate(prevUrl || '/timer'))
      .catch(() => console.log('Could not update time entry', timeEntry.id));
  }

  function deleteEntry() {
    if (confirm('Delete current time entry?')) {
      deleteTimeEntry(timeEntry.id)
        .then(() => navigate('/timer'))
        .catch(() => console.log('Could not delete time entry', timeEntry.id));
    }
  }

  // function updateStartTime(e) {
  //   const startTime = parse(e.target.value, 'HH:mm', timeEntry.start);
  //   timeEntry = { ...timeEntry, start: startTime };
  //   // if (isBefore(startTime, timeEntry.stop)) {
  //   //   timeEntry = { ...timeEntry, start: parse(e.target.value, 'HH:mm', timeEntry.start) };
  //   // }
  //   console.log('start time', start, e.target.value);
  // }

  // function updateStopTime(e) {
  //   const stopTime = parse(e.target.value, 'HH:mm', timeEntry.stop);
  //   timeEntry = { ...timeEntry, stop: stopTime };
  //   // if (isAfter(stopTime, timeEntry.start)) {
  //   //   timeEntry = { ...timeEntry, stop: parse(e.target.value, 'HH:mm', timeEntry.stop) };
  //   // }
  // }

  function addStartDay() {
    if (isValidNextStartDay) {
      timeEntry = { ...timeEntry, start: addDays(timeEntry.start, 1) };
    }
  }
  function addStopDay() {
    timeEntry = { ...timeEntry, stop: addDays(timeEntry.stop, 1) };
  }
  function subStartDay() {
    timeEntry = { ...timeEntry, start: subDays(timeEntry.start, 1) };
  }
  function subStopDay() {
    if (isValidPrevStopDay) {
      timeEntry = { ...timeEntry, stop: subDays(timeEntry.stop, 1) };
    }
  }
</script>

<main>
  <div>
    <MenuBar active={isLog ? 'logs' : 'timer'} />
    {#if timeEntry}
      <h2 class="duration">
        {duration}
      </h2>
      <form action="" on:submit|preventDefault={saveEntry}>
        <div class="edit-tags">
          <Select items={tags} on:select={setTags} value={selectedTags} isMulti isCreatable placeholder="Set tags" />
        </div>
        <div class="edit-duration">
          <div>
            <div class="edit-date">
              <button type="button" on:click={subStartDay}><i class="bi bi-chevron-down" /></button>
              {format(timeEntry.start, 'yyyy-MM-dd')}
              <button type="button" on:click={addStartDay} disabled={!isValidNextStartDay}
                ><i class="bi bi-chevron-up" /></button
              >
            </div>
            <div class="edit-time">
              <input type="time" class="form-control" bind:value={start} />
            </div>
          </div>
          <div>
            <div class="edit-date">
              <button type="button" on:click={subStopDay} disabled={!isValidPrevStopDay}
                ><i class="bi bi-chevron-down" /></button
              >
              {format(timeEntry.stop, 'yyyy-MM-dd')}
              <button type="button" on:click={addStopDay}><i class="bi bi-chevron-up" /></button>
            </div>
            <div class="edit-time">
              <input type="time" class="form-control" bind:value={stop} />
            </div>
          </div>
        </div>
        <div class="buttons">
          <Button type="submit" disabled={isInvalidTimeSpan}>Save</Button>
          <Button on:click={deleteEntry}>Delete</Button>
        </div>
        {#if isInvalidTimeSpan}
          <div>Not a valid time span</div>
        {/if}
      </form>
    {:else}
      <div>Time entry not found</div>
    {/if}
  </div>
</main>

<style lang="scss">
  .edit-tags {
    margin: 1rem 0;
  }

  h2.duration {
    font-weight: normal;
    margin: 0;
    padding: 0;
    font-size: 1.8rem;
  }

  .edit-duration {
    display: flex;
    margin-bottom: var(--space-5);
    > div {
      flex: 1;
      &:first-child {
        margin-right: var(--space-3);
      }
    }
  }

  .edit-date {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: var(--space-4);
    button {
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
      margin: 0 var(--space-3);
      color: var(--col-black);
      text-decoration: none;
      &:hover {
        color: var(--col-grey-60);
      }
      &:disabled {
        color: var(--col-grey-50);
      }
    }
  }

  .edit-time {
    //text-align: center;
    //input {
    //  width: 100%;
    //  border: 1px solid var(--col-grey-60);
    //  padding: var(--space-2) var(--space-3);
    //}
  }

  .buttons {
    display: flex;
    justify-content: space-between;
  }
</style>
