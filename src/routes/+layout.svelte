<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { retrieveLaunchParams } from '@tma.js/sdk';
	import { authState, setAuthUser, setAuthError } from '$lib/auth.svelte';

	let { children } = $props();
	let isInitializing = $state(true);

	onMount(async () => {
		try {
			let initDataRaw = '';
			let startParam = '';

			try {
				const launchParams = retrieveLaunchParams();
				initDataRaw = typeof launchParams.initDataRaw === 'string' ? launchParams.initDataRaw : '';
				startParam =
					typeof launchParams.initDataParam === 'string' ? launchParams.initDataParam : '';
			} catch (e) {
				console.warn('TMA SDK init failed (likely running outside Telegram):', e);
			}

			// Nếu đang dev local không có Telegram, tạm mock một cái error để test giao diện lỗi
			if (!initDataRaw && import.meta.env.DEV) {
				// Tạm gỡ comment dòng này nếu muốn mock login thành công khi dev
				// setAuthUser({ id: 'dev', name: 'Dev User', role: 'TENANT', tenantProfileId: 'tenant-1' });
				// isInitializing = false; return;
			}

			const res = await fetch('/api/auth/telegram', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ initData: initDataRaw, startParam })
			});

			const data = await res.json();

			if (res.ok) {
				setAuthUser(data);
			} else {
				setAuthError(data.message || data.error || 'Lỗi đăng nhập', data.error);
			}
		} catch (err) {
			console.error('Auth error:', err);
			setAuthError('Không thể kết nối đến máy chủ');
		} finally {
			isInitializing = false;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Roomio - Quản Lý Trọ Thông Minh</title>
</svelte:head>

<Toaster position="top-right" richColors />

{#if isInitializing}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="flex flex-col items-center gap-3">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
			></div>
			<p class="text-sm font-medium text-zinc-500">Đang đồng bộ dữ liệu...</p>
		</div>
	</div>
{:else if authState.isError}
	<div class="flex min-h-screen items-center justify-center bg-gray-50 px-5">
		<div
			class="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm"
		>
			{#if authState.errorType === 'NEEDS_INVITE'}
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path
							d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
						></path></svg
					>
				</div>
				<h2 class="mb-2 text-xl font-bold text-black">Chưa liên kết</h2>
				<p class="mb-6 text-sm text-zinc-500">{authState.errorMessage}</p>
				<p class="text-xs font-medium text-zinc-400">
					Vui lòng yêu cầu chủ nhà gửi link kết nối vào Zalo/Tin nhắn và bấm vào link đó để tiếp
					tục.
				</p>
			{:else}
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"
						></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg
					>
				</div>
				<h2 class="mb-2 text-xl font-bold text-black">Lỗi truy cập</h2>
				<p class="text-sm text-zinc-500">{authState.errorMessage}</p>
			{/if}
		</div>
	</div>
{:else if authState.isAuthenticated}
	{@render children()}
{/if}
