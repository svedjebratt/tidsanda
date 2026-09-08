<script lang="ts">
	import { getAccount, logoutAccount } from '$lib/api/AccountApi';
	import MenuBar from '$lib/components/MenuBar.svelte';
	import Button from '$lib/components/Button.svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	const account = browser ? getAccount() : null;
</script>

<main>
	<div>
		<MenuBar active="user" />
		<p>
			Account id: {account}
		</p>
		<p>
			<Button
				onclick={() => {
					logoutAccount();
					void goto('/logout');
				}}>Logout</Button
			>
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

<style>
	main {
		padding: 1rem;
	}
</style>
