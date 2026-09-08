<script lang="ts">
  import { effect } from 'svelte/effects';
  import { navigate } from 'svelte-routing';

  export let active: 'timer' | 'logs' | 'user' = 'timer';

  effect(() => {
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

<nav>
  <a href="/timer" class={active === 'timer' ? 'active' : ''}>Timer</a>
  <a href="/log/day/0" class={active === 'logs' ? 'active' : ''}>History</a>
  <a href="/user" class={active === 'user' ? 'active' : ''}><i class="bi bi-person" /></a>
</nav>

<style lang="scss">
  nav {
    height: 32px;
    list-style-type: none;
    padding: 0;
    margin: 0 0 1rem;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    border-bottom: 1px solid var(--col-black);
  }

  a {
    font-size: 14px;
    line-height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: var(--col-grey-70);
    padding: 6px 15px 10px;
    margin-bottom: -1px;
    border: 1px solid transparent;

    &.active {
      border-color: var(--col-black);
      border-bottom-color: var(--col-white);
    }

    &:hover:not(.active) {
      border-color: var(--col-grey-40);
      border-bottom-color: transparent;
    }

    &:last-child {
      padding-left: 10px;
      padding-right: 10px;
    }
  }
</style>
