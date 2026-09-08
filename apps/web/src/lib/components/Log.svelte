<script lang="ts">
	import { subDays, subMonths, subWeeks, subYears, format } from 'date-fns';
	import { goto } from '$app/navigation';
	import Select from 'svelte-select';
	import LogList from './LogList.svelte';
	import MenuBar from './MenuBar.svelte';
	import { getTags, getTimeEntries } from '$lib/api/TimeApi';
	import type { Period } from '$lib/stores/timerStore';
	import { getDates } from '$lib/stores/timerStore';
	import type { TimeEntry } from '$lib/types';

	let { period = 'day', amount = '0' }: { period: Period; amount: string } = $props();

	let amountNum = $derived(Number(amount) >= 0 ? Number(amount) : 0);
	let isValidNext = $derived(amountNum > 0);
	let filterTags = $state<string[]>([]);
	let tags = $state<string[]>([]);
	let tagOptions = $derived(tags.map((tag) => ({ value: tag, label: tag })));
	let logs = $state<TimeEntry[]>([]);
	let filteredLogs = $derived(
		logs.filter((log) => filterTags.every((tag) => log.tags.includes(tag)))
	);
	let label = $derived(getLabel(period, amountNum));

	function getLabel(period: Period, amountNum: number): string {
		const now = new Date();
		switch (period) {
			case 'day':
				return format(subDays(now, amountNum), 'MMMM do');
			case 'week':
				return 'week ' + format(subWeeks(now, amountNum), 'w');
			case 'month':
				return format(subMonths(now, amountNum), 'LLLL yyyy');
			case 'year':
				return format(subYears(now, amountNum), 'yyyy');
			default:
				return '';
		}
	}

	async function updateLogs(targetPeriod: Period, targetAmount: number): Promise<void> {
		try {
			const [start, stop] = getDates(targetAmount, targetPeriod);
			const allLogs = await getTimeEntries(start, stop);
			logs = allLogs;

			const allTags = await getTags();
			tags = allTags;
		} catch (error) {
			console.error('Failed to update logs:', error);
			tags = [];
		}
	}

	$effect(() => {
		void updateLogs(period, amountNum);
	});

	function setFilter(value: string[] | null): void {
		filterTags = value ?? [];
	}

	function goBack(): void {
		void goto(`/log/${period}/${amountNum + 1}`);
	}

	function goForward(): void {
		if (isValidNext) {
			void goto(`/log/${period}/${amountNum - 1}`);
		}
	}

	function periodChange(event: Event): void {
		const select = event.target as HTMLSelectElement;
		void goto(`/log/${select.value as Period}/0`);
	}
</script>

<main>
	<div>
		<MenuBar active="logs" />
		<div class="period">
			<div>
				<button onclick={goBack} aria-label="Show previous period"
					><i class="bi bi-chevron-down"></i></button
				>
				{label}
				<button onclick={goForward} disabled={!isValidNext} aria-label="Show next period"
					><i class="bi bi-chevron-up"></i></button
				>
			</div>
			<select value={period} onchange={periodChange}>
				<option value="day">Day</option>
				<option value="week">Week</option>
				<option value="month">Month</option>
				<option value="year">Year</option>
			</select>
		</div>

		<div class="edit-tags">
			<Select
				oninput={setFilter}
				items={tagOptions}
				value={filterTags.length ? filterTags : null}
				valueMode="id"
				multiple
				placeholder="Filter on tags"
			/>
		</div>

		<LogList
			logs={filteredLogs}
			referrer={`/log/${period}/${amountNum}`}
			hideDateLabel={period === 'day'}
		/>
	</div>
</main>

<style lang="scss">
	.edit-tags {
		margin: 1rem 0;
	}

	.period {
		display: flex;
		justify-content: center;
		align-items: center;
		> div:first-child {
			flex: 1;
		}
		select {
			width: auto;
			padding: var(--space-2) var(--space-2);
		}
		button {
			background: none;
			padding: 0;
			border: none;
			margin: 0 var(--space-4);
			cursor: pointer;
			&:disabled {
				color: var(--col-grey-50);
			}
		}
	}
</style>
