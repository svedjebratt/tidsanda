<script lang="ts">
	import EditTimeEntry from '$lib/components/EditTimeEntry.svelte';
	import { page } from '$app/state';
</script>

<EditTimeEntry timeId={Number(page.params.timeId)} />
