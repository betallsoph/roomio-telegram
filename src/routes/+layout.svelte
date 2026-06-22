<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { Toaster } from 'svelte-sonner';
  import ConfirmPopup from '$lib/ConfirmPopup.svelte';
  import { init } from '@tma.js/sdk-svelte';
  import BackButton from '$lib/BackButton.svelte';

  // Initialize the TMA SDK.
  init();

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Roomio - Quản Lý Trọ Thông Minh</title>
</svelte:head>

<Toaster position="top-right" richColors />
<ConfirmPopup />
<BackButton />
{@render children()}
