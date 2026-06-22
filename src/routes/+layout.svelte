<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { Toaster } from 'svelte-sonner';
  import { onMount } from 'svelte';

  // Chú ý: Tạm thời bỏ BackButton và init() của tma.js để tránh sập Svelte hydration
  // khi chạy ở môi trường ngoài hoặc chưa load kịp.
  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Roomio - Quản Lý Trọ Thông Minh</title>
</svelte:head>

<Toaster position="top-right" richColors />
{@render children()}
