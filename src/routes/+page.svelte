<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		// Tự động chuyển hướng khách vào thẳng trang chốt số điện nước
		goto('/tenant/meters', { replaceState: true });
	});
</script>

<div class="flex h-screen items-center justify-center bg-gray-50">
	<div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
</div>
