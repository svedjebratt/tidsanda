<script lang="ts">
	import { addMinutes, format, isAfter, subMinutes } from 'date-fns';
	import { onMount } from 'svelte';
	import Select from 'svelte-select';
	import Button from './Button.svelte';
	import LogList from './LogList.svelte';
	import MenuBar from './MenuBar.svelte';
	import {
		getActive,
		getTags,
		getTimeEntries,
		start,
		stop,
		updateTimeEntry
	} from '$lib/api/TimeApi';
	import { current, formatSecs, getDates } from '$lib/stores/timerStore';
	import { shouldIgnoreShortcut } from '$lib/keyboard';
	import type { TimeEntry } from '$lib/types';

	let tags = $state<string[]>([]);
	let selectedTags = $state<string[]>([]);
	let tagFilter = $state('');
	let logs = $state<TimeEntry[]>([]);
	let tagInput = $state<HTMLInputElement | null>(null);
	let activeTimerLoaded = $state(false);
	let selectableTags = $derived(
		tagFilter.trim() && !tags.includes(tagFilter.trim()) ? [...tags, tagFilter.trim()] : tags
	);
	let selectableTagOptions = $derived(
		selectableTags.map((tag) => ({ value: tag, label: tag }))
	);

	async function updateLogs() {
		try {
			const [start, stop] = getDates(0, 'day');
			logs = await getTimeEntries(start, stop);
		} catch (err) {
			console.log('error fetching logs', err);
			logs = [];
		}
	}

	async function init() {
		try {
			const active = await getActive();
			current.set(active);
			selectedTags = active.tags ?? [];
		} catch {
			console.log('no active clock');
			current.set(null);
		} finally {
			activeTimerLoaded = true;
		}

		try {
			tags = await getTags();
		} catch {
			console.log('Could not get tags');
		}

		await updateLogs();
	}

	onMount(() => {
		void init();
		const interval = setInterval(() => {
			init().catch((err) => console.error(err));
		}, 60000);

		return () => {
			clearInterval(interval);
		};
	});

	function updateStart(increase: boolean) {
		if (!$current) return;

		const change = $current.start.getMinutes() % 5;
		let start;
		if (increase) {
			start = addMinutes($current.start, 5 - change);
			if (isAfter(start, new Date())) {
				start = new Date();
			}
		} else {
			start = subMinutes($current.start, change > 0 ? change : 5);
		}
		updateTimeEntry($current.id, { ...$current, start })
			.then(current.set)
			.catch(() => console.log('could not update current timer'));
	}

	onMount(() => {
		function keyDown(e: KeyboardEvent) {
			if (shouldIgnoreShortcut(e, true)) {
				return;
			}

			if (e.shiftKey) {
				if (e.key === 'ArrowUp' && $current) {
					updateStart(true);
				} else if (e.key === 'ArrowDown' && $current) {
					updateStart(false);
				}
			} else {
				switch (e.key) {
					case ' ':
						e.preventDefault();
						if ($current) {
							stopTimer();
						} else {
							startTimer();
						}
						break;
					case 'g':
						e.preventDefault();
						tagInput?.focus();
						break;
				}
			}
		}

		document.addEventListener('keydown', keyDown);

		return () => {
			document.removeEventListener('keydown', keyDown);
		};
	});

	const elapsed = current.elapsed;

	function setTags(value: string[] | null) {
		if (!activeTimerLoaded) return;

		const newTags = value ?? [];
		selectedTags = newTags;
		if (
			$current &&
			($current.tags.length !== newTags.length || newTags.some((tag) => !$current?.tags.includes(tag)))
		) {
			updateTimeEntry($current.id, {
				...$current,
				tags: newTags
			})
				.then(current.set)
				.catch(() => console.log('could not update current timer'));
		}

		tags = newTags.reduce((all, tag) => {
			if (all.indexOf(tag) === -1) {
				return [...all, tag];
			}
			return all;
		}, tags);
	}

	async function stopTimer() {
		try {
			await stop();
			current.set(null);
			await updateLogs();
		} catch (err) {
			console.log('error stopping timer', err);
		}
	}

	async function startTimer() {
		try {
			console.log('start with tags', selectedTags);
			current.set(await start(selectedTags));
		} catch (err) {
			console.log('error starting timer', err);
		}
	}

</script>

<main>
	<div>
		<MenuBar active="timer" />
		<div class="timer">
			{#if $current}
				<div>
					{formatSecs($elapsed)}
					<div class="edit-start-time">
						Started {format($current.start, 'HH:mm')}
					</div>
				</div>
				<div class="play-control">
					<button
						type="button"
						class="skip-start"
						onclick={() => updateStart(false)}
						aria-label="Move start time back"
						><i class="bi bi-skip-start"></i></button
					>
					<button
						type="button"
						class="skip-end"
						onclick={() => updateStart(true)}
						aria-label="Move start time forward"
						><i class="bi bi-skip-end"></i></button
					>
					<Button onclick={stopTimer} large><i class="bi bi-pause"></i></Button>
				</div>
			{:else}
				<div>
					{formatSecs(0)}
				</div>
				<Button onclick={startTimer} large><i class="bi bi-play"></i></Button>
			{/if}
		</div>

		<div class="edit-tags">
			<Select
				oninput={setTags}
				bind:filterText={tagFilter}
				bind:input={tagInput}
				value={selectedTags.length ? selectedTags : null}
				items={selectableTagOptions}
				valueMode="id"
				multiple
				disabled={!activeTimerLoaded}
				placeholder="Set tags"
				inputAttributes={{ id: 'TagInput' }}
			/>
		</div>

		<LogList {logs} activeElapsed={$elapsed} referrer="/timer" hideDateLabel={true} />
	</div>
</main>

<style lang="scss">
	.timer {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		font-size: 1.8rem;
		> div:first-child {
			line-height: 1;
		}
	}

	.play-control {
		display: flex;
		align-items: center;
		.skip-start,
		.skip-end {
			background: var(--col-grey-20);
			border: 1px solid var(--col-grey-50);
			cursor: pointer;
		}
		.skip-start {
			margin-right: var(--space-3);
		}
		.skip-end {
			margin-right: var(--space-5);
		}
	}

	.edit-start-time {
		font-size: 0.7rem;
		color: var(--col-grey-60);
	}

	.edit-tags {
		margin: 1rem 0;
	}
</style>
