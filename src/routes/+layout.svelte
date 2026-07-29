<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { retrieveLaunchParams, retrieveRawInitData } from '@tma.js/sdk-svelte';
	import { authState, setAuthUser, setAuthError } from '$lib/auth.svelte';
	import { canRenderTenantContent, parseRole } from '$lib/route-policy';

	let { children } = $props();
	let isInitializing = $state(true);

	// UX-001 — lớp role: Mini App chỉ render nội dung riêng tư cho NGƯỜI THUÊ.
	// Phiên hợp lệ nhưng không phải tenant (chủ trọ/nhân viên/super admin) vẫn bị chặn.
	const mayRenderTenantContent = $derived(canRenderTenantContent(parseRole(authState.user?.role)));

	onMount(async () => {
		try {
			const webApp = window.Telegram?.WebApp;
			let initDataRaw = webApp?.initData || '';
			let startParam = webApp?.initDataUnsafe?.start_param || '';

			try {
				// tma.js v3 exposes raw init data separately from parsed launch parameters.
				initDataRaw ||= retrieveRawInitData() || '';
				startParam ||= retrieveLaunchParams().tgWebAppStartParam || '';
			} catch (e) {
				if (!initDataRaw) {
					console.warn('Không đọc được Telegram launch parameters:', e);
				}
			}

			webApp?.ready();

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
			<img src="/brand/roomio-wordmark-blue600.png" alt="Roomio" class="mx-auto mb-5 h-auto w-36" />
			{#if authState.errorType === 'NEEDS_INVITE'}
				<h2 class="mb-2 text-xl font-bold text-black">Chưa liên kết</h2>
				<p class="mb-6 text-sm text-zinc-500">{authState.errorMessage}</p>
				<p class="text-xs font-medium text-zinc-400">
					Vui lòng yêu cầu chủ nhà gửi link kết nối vào Zalo/Tin nhắn và bấm vào link đó để tiếp
					tục.
				</p>
			{:else if authState.errorMessage?.includes('initData')}
				<h2 class="mb-2 text-xl font-bold text-black">Mở bằng Telegram</h2>
				<p class="mb-4 text-sm text-zinc-500">Ứng dụng này dành riêng cho cư dân trên Telegram.</p>
				<p class="text-xs font-medium text-zinc-400">
					Vui lòng mở ứng dụng này từ bên trong mục Chat của ứng dụng Telegram để tiếp tục.
				</p>
			{:else}
				<h2 class="mb-2 text-xl font-bold text-black">Lỗi truy cập</h2>
				<p class="text-sm text-zinc-500">{authState.errorMessage}</p>
			{/if}
		</div>
	</div>
{:else if authState.isAuthenticated && mayRenderTenantContent}
	{@render children()}
{:else if authState.isAuthenticated}
	<!-- Phiên hợp lệ nhưng không phải người thuê: dừng ở đây, không render nội dung riêng tư. -->
	<div class="flex min-h-screen items-center justify-center bg-gray-50 px-5">
		<div
			class="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm"
		>
			<img src="/brand/roomio-wordmark-blue600.png" alt="Roomio" class="mx-auto mb-5 h-auto w-36" />
			<h2 class="mb-2 text-xl font-bold text-black">Dành riêng cho người thuê</h2>
			<p class="text-sm text-zinc-500">
				Mini App này chỉ phục vụ người thuê. Vui lòng dùng trang quản lý trên trình duyệt cho tài
				khoản chủ trọ, nhân viên hoặc quản trị viên.
			</p>
		</div>
	</div>
{/if}
