<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children } = $props<{ children?: Snippet }>();
</script>

<span>
	{#if children}
		{@render children()}
	{:else}
		unknown
	{/if}
</span>

<style lang="scss">
	span {
		display: inline-block;
		padding: var(--space-1) var(--space-3);
		border-radius: var(--space-1);
		border: 1px solid var(--col-grey-80);
		color: var(--col-white);
		background: var(--col-grey-60);
		font-size: 0.7rem;
	}
</style>
