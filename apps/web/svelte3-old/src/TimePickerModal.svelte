<script lang="ts">
  import { addDays, format, parse, subDays } from 'date-fns';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let time: Date = null;
  let timeValue = format(time, 'HH:mm:ss');
  let dateValue: Date = time;

  function save() {
    dispatch('save', { date: parse(timeValue, 'HH:mm:ss', dateValue) });
  }

  function cancel() {
    dispatch('cancel');
  }

  function dateDown() {
    dateValue = subDays(dateValue, 1);
  }

  function dateUp() {
    dateValue = addDays(dateValue, 1);
  }
</script>

<div class="modal">
  <main>
    <div>
      <div>
        <button on:click={dateDown}>&lt;</button>
        {format(dateValue, 'yyyy MMM do')}
        <button on:click={dateUp}>&gt;</button>
      </div>
      <input type="time" step="1000" bind:value={timeValue} />
      <div>
        <button on:click={save}>Save</button>
        <button on:click={cancel}>Cancel</button>
      </div>
    </div>
  </main>
</div>

<style>
  .modal {
    position: fixed;
    z-index: 999;
    width: auto;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
  }
</style>
