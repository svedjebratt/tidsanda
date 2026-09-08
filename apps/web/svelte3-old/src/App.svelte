<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate, Route, Router } from 'svelte-routing';
  import { getAccount } from './AccountApi';
  import CreateAccount from './CreateAccount.svelte';
  import Timer from './Timer.svelte';
  import Log from './Log.svelte';
  import EditTimeEntry from './EditTimeEntry.svelte';
  import User from './User.svelte';

  export const url = '';
  let account = null;

  onMount(async () => {
    account = getAccount();
    if (account && location.pathname === '/') {
      navigate('/timer', { replace: true });
    } else if (!account && location.pathname !== '/' && location.pathname !== '/logout') {
      navigate('/');
    }
  });
</script>

<Router {url}>
  <Route path="/"><CreateAccount /></Route>
  <Route path="/timer"><Timer /></Route>
  <Route path="/log/:timeId" component={EditTimeEntry} />
  <Route path="/log/:period/:amount" component={Log} />
  <Route path="/log"><Log /></Route>
  <Route path="/user"><User /></Route>
  <Route path="/logout"><CreateAccount logout /></Route>
</Router>

<style>
  /*main {*/
  /*	text-align: center;*/
  /*	padding: 1em;*/
  /*	max-width: 240px;*/
  /*	margin: 0 auto;*/
  /*}*/

  /*h1 {*/
  /*	color: #ff3e00;*/
  /*	text-transform: uppercase;*/
  /*	font-size: 4em;*/
  /*	font-weight: 100;*/
  /*}*/

  /*@media (min-width: 640px) {*/
  /*	main {*/
  /*		max-width: none;*/
  /*	}*/
  /*}*/
</style>
