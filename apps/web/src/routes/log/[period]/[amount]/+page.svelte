<script lang="ts">
	import Log from '$lib/components/Log.svelte';
	import type { Period } from '$lib/stores/timerStore';
	import { page } from '$app/state';
</script>

<Log period={page.params.period as Period} amount={page.params.amount as string} />
