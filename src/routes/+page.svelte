<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		// Trang chính của Mini App là cổng khách thuê; bot có thể deep-link riêng tới /tenant/meters.
		goto('/tenant', { replaceState: true });
	});
</script>

<div class="flex h-screen items-center justify-center bg-gray-50">
	<div
		class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
	></div>
</div>
