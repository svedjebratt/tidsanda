<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { getAccount } from '$lib/api/AccountApi';
	import { page } from '$app/state';

	let { children } = $props<{ children: Snippet }>();

	onMount(async () => {
		const account = getAccount();
		if (account && page.url.pathname === '/') {
			await goto('/timer', { replaceState: true });
		} else if (!account && page.url.pathname !== '/' && page.url.pathname !== '/logout') {
			await goto('/');
		}
	});
</script>

{@render children()}
