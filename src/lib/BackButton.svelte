<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { backButton, useSignal } from '@tma.js/sdk-svelte';
	import { get } from 'svelte/store';

	const isVisible = useSignal(backButton.isVisible);

	$effect(() => {
		console.log('The button is', get(isVisible) ? 'visible' : 'invisible');
	});

	onMount(() => {
		backButton.show();
	});

	onDestroy(() => {
		backButton.hide();
	});
</script>
