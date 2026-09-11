<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { getAccount } from '$lib/api/AccountApi';
	import { page } from '$app/state';
	import { current } from '$lib/stores/timerStore';
	import { pomodoro } from '$lib/stores/pomodoroStore';
	import { getTimerTitle } from '$lib/timerTitle';

	let { children } = $props<{ children: Snippet }>();
	const elapsed = current.elapsed;
	let title = $derived(getTimerTitle($pomodoro, $current !== null, $elapsed));

	function notifyCompletion(update: ReturnType<typeof pomodoro.update>) {
		if (
			!update ||
			!('Notification' in window) ||
			Notification.permission !== 'granted' ||
			!pomodoro.claimNotification(update)
		) {
			return;
		}

		const completedFocus = update.completedPhase === 'focus';
		const notification = new Notification(completedFocus ? 'Focus complete' : 'Break complete', {
			body: completedFocus ? 'Time for a break' : 'Time to focus'
		});
		notification.onclick = () => window.focus();
	}

	onMount(() => {
		let activeAccount: string | null | undefined;

		async function loadRegularTimer(force = false) {
			await current.refresh(force);
		}

		function syncAccount() {
			const account = getAccount();
			if (account === activeAccount) return;

			activeAccount = account;
			current.set(null);
			if (account) {
				pomodoro.initialize(account, localStorage);
				void loadRegularTimer(true);
			} else {
				pomodoro.clear();
			}
		}

		function handleStorage(event: StorageEvent) {
			pomodoro.sync(event.key);
		}

		syncAccount();
		const stopListeningForCompletions = pomodoro.onCompletion(notifyCompletion);
		const pomodoroInterval = setInterval(() => {
			syncAccount();
			if (activeAccount) pomodoro.update();
		}, 250);
		const regularTimerInterval = setInterval(() => {
			if (activeAccount) void loadRegularTimer();
		}, 60000);
		window.addEventListener('storage', handleStorage);

		const account = getAccount();
		if (account && page.url.pathname === '/') {
			void goto('/timer', { replaceState: true });
		} else if (!account && page.url.pathname !== '/' && page.url.pathname !== '/logout') {
			void goto('/');
		}

		return () => {
			clearInterval(pomodoroInterval);
			clearInterval(regularTimerInterval);
			stopListeningForCompletions();
			window.removeEventListener('storage', handleStorage);
		};
	});
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

{@render children()}
