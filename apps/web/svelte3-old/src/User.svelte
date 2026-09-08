<script>
  import { getAccount } from './AccountApi';
  import MenuBar from './MenuBar.svelte';
  import { navigate } from 'svelte-routing';
  import Button from './Button.svelte';
</script>

<main>
  <div>
    <MenuBar active="user" />
    <p>
      Account id: {getAccount()}
    </p>
    <p>
      <Button on:click={() => navigate('/logout')}>Logout</Button>
    </p>

    <p>
      Key bindings: <br />
      s: Start/Stop timer <br />
      t: Timer <br />
      l: Logs <br />
      g: Edit tags<br />
      Shift + UP: Increase start time <br />
      Shift + DOWN: Decrease start time
    </p>
  </div>
</main>
