<script lang="ts">
	import {
		addDays,
		format,
		isAfter,
		isBefore,
		isSameDay,
		parse,
		startOfDay,
		subDays
	} from 'date-fns';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Select from 'svelte-select';
	import Button from './Button.svelte';
	import MenuBar from './MenuBar.svelte';
	import { deleteTimeEntry, getTags, getTimeEntry, updateTimeEntry } from '$lib/api/TimeApi';
	import { current, formatSecsNatural } from '$lib/stores/timerStore';
	import type { TimeEntry } from '$lib/types';

	let { timeId } = $props<{ timeId: number }>();

	let timeEntry = $state<TimeEntry | null>(null);
	let tags = $state<string[]>([]);
	let selectedTagsDerived = $derived(timeEntry?.tags?.length ? timeEntry.tags : []);
	let tagOptions = $derived(tags.map((tag) => ({ value: tag, label: tag })));
	let sameDay = $derived(
		timeEntry ? isSameDay(timeEntry.start as Date, timeEntry.stop as Date) : false
	);

	let start = $state('00:00');
	let stop = $state('00:00');
	let isInvalidTimeSpan = $derived(
		!start || !stop || (sameDay && Number(start.replace(':', '')) >= Number(stop.replace(':', '')))
	);
	let isValidNextStartDay = $derived(
		timeEntry
			? isBefore(startOfDay(timeEntry.start as Date), startOfDay(timeEntry.stop as Date))
			: false
	);
	let isValidPrevStopDay = $derived(
		timeEntry
			? isAfter(startOfDay(timeEntry.stop as Date), startOfDay(timeEntry.start as Date))
			: false
	);
	let duration = $derived(timeEntry ? calcDuration(timeEntry, start, stop) : '');
	let prevUrl = $state<string>('');
	let isLog = $derived(prevUrl && prevUrl.startsWith('/log'));

	function calcDuration(timeEntry: TimeEntry, start: string, stop: string): string {
		const startTime = parse(start, 'HH:mm', timeEntry.start as Date);
		const stopTime = parse(stop, 'HH:mm', timeEntry.stop as Date);
		return formatSecsNatural((stopTime.getTime() - startTime.getTime()) / 1000);
	}

	async function init(): Promise<void> {
		try {
			const te = await getTimeEntry(timeId);
			timeEntry = te;
			if (timeEntry) {
				start = format(timeEntry.start as Date, 'HH:mm');
				stop = format(timeEntry.stop as Date, 'HH:mm');
			}
		} catch (error) {
			console.error('Time entry not found:', error);
		}

		try {
			const allTags = await getTags();
			tags = allTags;
		} catch (error) {
			console.error('Could not get tags:', error);
			tags = [];
		}

		prevUrl = history.state?.prevUrl ?? '';
	}

	onMount(init);

	function setTags(value: string[] | null): void {
		if (!timeEntry) return;
		const newTags = value ?? [];
		timeEntry = { ...timeEntry, tags: newTags };

		tags = newTags.reduce((all, tag) => {
			if (!all.includes(tag)) {
				return [...all, tag];
			}
			return all;
		}, tags);
	}

	async function saveEntry(): Promise<void> {
		if (!timeEntry) return;
		try {
			const newTimeEntry = {
				...timeEntry,
				start: parse(start, 'HH:mm', timeEntry.start as Date),
				stop: parse(stop, 'HH:mm', timeEntry.stop as Date)
			};

			await updateTimeEntry(timeEntry.id, newTimeEntry);
			await goto(prevUrl || '/timer');
		} catch (error) {
			console.error('Could not update time entry:', error);
		}
	}

	async function deleteEntry(): Promise<void> {
		if (!timeEntry) return;
		if (confirm('Delete current time entry?')) {
			try {
				await deleteTimeEntry(timeEntry.id);
				await goto('/timer');
			} catch (error) {
				console.error('Could not delete time entry:', error);
			}
		}
	}

	async function restartEntry(): Promise<void> {
		if (!timeEntry) return;
		try {
			await current.restart(timeEntry.tags);
			await goto('/timer');
		} catch (error) {
			console.error('Could not restart time entry:', error);
		}
	}

	function addStartDay(): void {
		if (!timeEntry || !isValidNextStartDay) return;
		timeEntry = { ...timeEntry, start: addDays(timeEntry.start as Date, 1) };
	}

	function addStopDay(): void {
		if (!timeEntry) return;
		timeEntry = { ...timeEntry, stop: addDays(timeEntry.stop as Date, 1) };
	}

	function subStartDay(): void {
		if (!timeEntry) return;
		timeEntry = { ...timeEntry, start: subDays(timeEntry.start as Date, 1) };
	}

	function subStopDay(): void {
		if (!timeEntry || !isValidPrevStopDay) return;
		timeEntry = { ...timeEntry, stop: subDays(timeEntry.stop as Date, 1) };
	}
</script>

<main>
	<div>
		<MenuBar active={isLog ? 'logs' : 'timer'} />
		{#if timeEntry}
			<div class="duration-row">
				<h2 class="duration">{duration}</h2>
				<Button onclick={restartEntry} ariaLabel="Restart time entry" large
					><i class="bi bi-play"></i></Button
				>
			</div>
			<form
				action=""
				onsubmit={(event) => {
					event.preventDefault();
					saveEntry();
				}}
			>
				<div class="edit-tags">
					<Select
						items={tagOptions}
						oninput={setTags}
						value={selectedTagsDerived.length ? selectedTagsDerived : undefined}
						valueMode="id"
						multiple
						placeholder="Set tags"
					/>
				</div>
				<div class="edit-duration">
					<div>
						<div class="edit-date">
							<button type="button" onclick={subStartDay} aria-label="Move start date back"
								><i class="bi bi-chevron-down"></i></button
							>
							{format(timeEntry.start as Date, 'yyyy-MM-dd')}
							<button
								type="button"
								onclick={addStartDay}
								disabled={!isValidNextStartDay}
								aria-label="Move start date forward"
								><i class="bi bi-chevron-up"></i></button
							>
						</div>
						<div class="edit-time">
							<input type="time" class="form-control" bind:value={start} />
						</div>
					</div>
					<div>
						<div class="edit-date">
							<button type="button" onclick={subStopDay} disabled={!isValidPrevStopDay}
								aria-label="Move stop date back"><i class="bi bi-chevron-down"></i></button
							>
							{format(timeEntry.stop as Date, 'yyyy-MM-dd')}
							<button type="button" onclick={addStopDay} aria-label="Move stop date forward"
								><i class="bi bi-chevron-up"></i></button
							>
						</div>
						<div class="edit-time">
							<input type="time" class="form-control" bind:value={stop} />
						</div>
					</div>
				</div>
				<div class="buttons">
					<Button type="submit" disabled={isInvalidTimeSpan}>Save</Button>
					<Button onclick={deleteEntry}>Delete</Button>
				</div>
				{#if isInvalidTimeSpan}
					<div>Not a valid time span</div>
				{/if}
			</form>
		{:else}
			<div>Time entry not found</div>
		{/if}
	</div>
</main>

<style lang="scss">
	.edit-tags {
		margin: 1rem 0;
	}

	h2.duration {
		font-weight: normal;
		margin: 0;
		padding: 0;
		font-size: 1.8rem;
	}

	.duration-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.edit-duration {
		display: flex;
		margin-bottom: var(--space-5);
		> div {
			flex: 1;
			&:first-child {
				margin-right: var(--space-3);
			}
		}
	}

	.edit-date {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: var(--space-4);
		button {
			border: none;
			background: none;
			cursor: pointer;
			padding: 0;
			margin: 0 var(--space-3);
			color: var(--col-black);
			text-decoration: none;
			&:hover {
				color: var(--col-grey-60);
			}
			&:disabled {
				color: var(--col-grey-50);
			}
		}
	}

	.buttons {
		display: flex;
		justify-content: space-between;
	}
</style>
