<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { backButton, useSignal } from '@tma.js/sdk-svelte';

  const isVisible = useSignal(backButton.isVisible);

  $effect(() => {
    console.log('The button is', isVisible.value ? 'visible' : 'invisible');
  });

  onMount(() => {
    backButton.show();
  });

  onDestroy(() => {
    backButton.hide();
  });
</script>
