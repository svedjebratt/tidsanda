<script lang="ts">
  import { onMount } from 'svelte';

  import { link, navigate } from 'svelte-routing';
  import { fade, fly } from 'svelte/transition';

  let open = false;
  let menuOpenBtn = true;

  function toggle() {
    open = !open;
    if (open) {
      menuOpenBtn = false;
    }
  }

  onMount(() => {
    function listener(e: KeyboardEvent) {
      if (document.activeElement?.tagName === 'INPUT') {
        return;
      }

      switch (e.key) {
        case 't':
          navigate('/timer');
          break;
        case 'l':
          navigate('/log/day/0');
          break;
      }
    }

    document.addEventListener('keypress', listener);
    return () => {
      document.removeEventListener('keypress', listener);
    };
  });
</script>

{#if open}
  <nav transition:fly={{ x: 200, duration: 500 }} on:outroend={() => (menuOpenBtn = true)}>
    <button on:click={toggle}>Close</button>
    <ul>
      <li><a href="/timer" use:link>Timer</a></li>
      <li><a href="/log" use:link>Logs</a></li>
      <li><a href="/logout" use:link>Logout</a></li>
    </ul>
  </nav>
{/if}

{#if menuOpenBtn}
  <nav in:fade>
    <button on:click={toggle}>Menu</button>
  </nav>
{/if}

<style>
  nav {
    position: fixed;
    top: 0;
    right: 0;
  }

  ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }
</style>
