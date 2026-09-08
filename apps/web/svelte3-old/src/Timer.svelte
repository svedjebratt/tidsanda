<script lang="ts">
  import { addMinutes, format, isAfter, subMinutes } from 'date-fns';
  // import { endOfDay, startOfDay } from 'date-fns';
  import { onDestroy, onMount } from 'svelte';
  import Select from 'svelte-select';
  import Button from './Button.svelte';
  import LogList from './LogList.svelte';
  import MenuBar from './MenuBar.svelte';
  import { getActive, getTags, getTimeEntries, start, stop, updateTimeEntry } from './TimeApi';
  import TimePickerModal from './TimePickerModal.svelte';
  import { current, formatSecs, getDates } from './timerStore';
  import type { TimeEntry } from './types';

  let tags: string[] = [];
  let selectedTags: string[] = [];
  let currentValue: TimeEntry;
  let logs: TimeEntry[] = [];
  // $: selectedTags = currentValue?.tags ?? [];
  let showEditStartTime = false;

  const unsubscribe = current.subscribe((timeEntry) => {
    currentValue = timeEntry;
    if (currentValue) {
      selectedTags = currentValue?.tags ?? [];
    }
  });

  onDestroy(unsubscribe);

  async function updateLogs() {
    try {
      const [start, stop] = getDates(0, 'day');
      logs = await getTimeEntries(start, stop);
      // logs.set(await getTimeEntries(start, stop));
    } catch (err) {
      console.log('error fetching logs', err);
      logs = [];
      // logs.set([]);
    }
  }

  async function init() {
    try {
      let active = await getActive();
      current.set(active);
    } catch (_) {
      console.log('no active clock');
      current.set(null);
    }

    try {
      tags = await getTags();
    } catch (_) {
      console.log('Could not get tags');
    }

    await updateLogs();
  }

  onMount(() => {
    const tagInput = document.querySelector<HTMLInputElement>('#TagInput');

    let timeout;
    const onFocus = () => {
      timeout = setTimeout(() => {
        if (!document.querySelector('.selectContainer .listContainer')) {
          tagInput.blur();
        } else {
          onFocus();
        }
      }, 60000);
    };

    function onInput() {
      clearTimeout(timeout);
      onFocus();
    }

    tagInput.addEventListener('input', onInput);
    tagInput.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(timeout);

      tagInput.removeEventListener('focus', onFocus);
      tagInput.removeEventListener('input', onInput);
    };
  });

  onMount(async () => {
    // active.initialize();
    // timeHistory.setDates(startOfDay(new Date()), endOfDay(new Date()));
    // tags.initialize();
    await init();
    const interval = setInterval(() => {
      init().catch((err) => console.error(err));
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  });

  function updateStart(increase: boolean) {
    const change = currentValue.start.getMinutes() % 5;
    let start;
    if (increase) {
      start = addMinutes(currentValue.start, 5 - change);
      if (isAfter(start, new Date())) {
        start = new Date();
      }
    } else {
      start = subMinutes(currentValue.start, change > 0 ? change : 5);
    }
    updateTimeEntry(currentValue.id, { ...currentValue, start })
      .then(current.set)
      .catch(() => console.log('could not update current timer'));
  }

  onMount(() => {
    function keyUp(e: KeyboardEvent) {
      if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Escape' && !document.querySelector('.selectContainer .listContainer')) {
          document.querySelector<HTMLInputElement>('#TagInput')?.blur();
        }
        return;
      }

      if (e.shiftKey && currentValue) {
        if (e.key === 'ArrowUp') {
          updateStart(true);
        } else if (e.key === 'ArrowDown') {
          updateStart(false);
        }
      } else {
        switch (e.key) {
          case 's':
            if (currentValue) {
              stopTimer();
            } else {
              startTimer();
            }
            break;
          case 'g':
            document.querySelector<HTMLInputElement>('#TagInput')?.focus();
            break;
        }
      }
    }

    // document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);

    return () => {
      // document.removeEventListener('keydown', keyDown);
      document.removeEventListener('keyup', keyUp);
    };
  });

  const elapsed = current.elapsed;

  function setTags(event: { detail: Array<{ label: string; value: string }> }) {
    const newTags = event.detail?.map((opt) => opt.value) ?? [];
    if (
      currentValue &&
      (currentValue.tags.length !== newTags.length || newTags.some((tag) => !currentValue.tags.includes(tag)))
    ) {
      updateTimeEntry(currentValue.id, {
        ...currentValue,
        tags: newTags,
      })
        .then(current.set)
        .catch(() => console.log('could not update current timer'));
    } else {
      selectedTags = newTags;
    }

    tags = newTags.reduce((all, tag) => {
      if (all.indexOf(tag) === -1) {
        return [...all, tag];
      }
      return all;
    }, tags);
  }

  async function stopTimer() {
    try {
      await stop();
      current.set(null);
      await updateLogs();
    } catch (err) {
      console.log('error stopping timer', err);
    }
  }

  async function startTimer() {
    try {
      console.log('start with tags', selectedTags);
      current.set(await start(selectedTags));
    } catch (err) {
      console.log('error starting timer', err);
    }
  }

  function editStartTime() {
    showEditStartTime = true;
  }

  function saveStartTime() {}
</script>

<main>
  <div>
    <MenuBar active="timer" />
    <div class="timer">
      {#if $current}
        <div>
          {formatSecs($elapsed)}
          <div class="edit-start-time">
            Started {format($current.start, 'HH:mm')}
          </div>
        </div>
        <div class="play-control">
          <button type="button" class="skip-start" on:click={() => updateStart(false)}
            ><i class="bi bi-skip-start" /></button
          >
          <button type="button" class="skip-end" on:click={() => updateStart(true)}><i class="bi bi-skip-end" /></button
          >
          <Button on:click={stopTimer} large><i class="bi bi-pause" /></Button>
        </div>
      {:else}
        <div>
          {formatSecs(0)}
        </div>
        <Button on:click={startTimer} large><i class="bi bi-play" /></Button>
      {/if}
    </div>

    <div class="edit-tags">
      <Select
        on:select={setTags}
        value={selectedTags.length ? selectedTags : null}
        items={tags}
        isCreatable
        isMulti
        placeholder="Set tags"
        inputAttributes={{ id: 'TagInput' }}
      />
    </div>

    <LogList {logs} activeElapsed={$elapsed} referrer="/timer" hideDateLabel />
  </div>
  {#if showEditStartTime}
    <TimePickerModal time={$current.start} on:cancel={() => (showEditStartTime = false)} />
  {/if}
</main>

<style lang="scss">
  .timer {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    font-size: 1.8rem;
    > div:first-child {
      line-height: 1;
    }
  }

  .play-control {
    display: flex;
    align-items: center;
    .skip-start,
    .skip-end {
      background: var(--col-grey-20);
      border: 1px solid var(--col-grey-50);
      cursor: pointer;
    }
    .skip-start {
      margin-right: var(--space-3);
    }
    .skip-end {
      margin-right: var(--space-5);
    }
  }

  .edit-start-time {
    font-size: 0.7rem;
    color: var(--col-grey-60);

    //button {
    //  margin: 0;
    //  padding: 0;
    //  background: none;
    //  color: inherit;
    //  border: none;
    //  font-size: inherit;
    //  cursor: pointer;
    //}
  }
  .edit-tags {
    margin: 1rem 0;
  }
</style>
