<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { shouldIgnoreShortcut } from '$lib/keyboard';

	let { active = 'timer' } = $props<{ active?: 'timer' | 'pomodoro' | 'logs' | 'user' }>();

	onMount(() => {
		function listener(e: KeyboardEvent): void {
			if (shouldIgnoreShortcut(e)) {
				return;
			}
			switch (e.key.toLowerCase()) {
				case 't':
					e.preventDefault();
					goto('/timer');
					break;
				case 'p':
					e.preventDefault();
					goto('/pomodoro');
					break;
				case 'l':
					e.preventDefault();
					goto('/log/day/0');
					break;
			}
		}
		document.addEventListener('keydown', listener);
		return () => {
			document.removeEventListener('keydown', listener);
		};
	});
</script>

<nav>
	<a href="/timer" class={active === 'timer' ? 'active' : ''}>Timer</a>
	<a href="/pomodoro" class={active === 'pomodoro' ? 'active' : ''}>Pomodoro</a>
	<a href="/log/day/0" class={active === 'logs' ? 'active' : ''}>History</a>
	<a href="/user" class={active === 'user' ? 'active' : ''} aria-label="Account"
		><i class="bi bi-person"></i></a
	>
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
