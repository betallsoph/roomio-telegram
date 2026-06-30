<script lang="ts">
	import {
		Camera,
		CheckCircle2,
		ChevronRight,
		UploadCloud,
		Zap,
		Droplet,
		Image as ImageIcon
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { authState } from '$lib/auth.svelte';
	import { compressImage, uploadBlobToR2 } from '$lib/upload';

	let pendingMeters = $state<any[]>([]);
	let roomData = $state<any>(null);
	let isLoading = $state(true);
	let activeMeterId = $state<string | null>(null);
	let isUploading = $state(false);

	const activeMeter = $derived(pendingMeters.find((m) => m.id === activeMeterId));

	onMount(async () => {
		if (!authState.isAuthenticated) {
			isLoading = false;
			return;
		}

		try {
			const res = await fetch('/api/rooms');
			const rooms = await res.json();

			if (rooms && rooms.length > 0) {
				roomData = rooms[0];

				const meteredServices = roomData.services.filter((s: any) => s.service.type === 'METERED');
				const currentMonth = new Date().getMonth() + 1;
				const currentYear = new Date().getFullYear();
				const monthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

				pendingMeters = meteredServices.map((sConfig: any) => {
					const service = sConfig.service;

					const history = roomData.meterReadings.filter(
						(r: any) => r.serviceId === service.id && r.status === 'approved'
					);
					const latest = history.length > 0 ? history[0] : null;
					const prevValue = latest ? latest.currValue : 0;

					const thisMonthReading = roomData.meterReadings.find(
						(r: any) => r.serviceId === service.id && r.month === monthStr
					);

					let status = 'pending';
					let currValue = '';
					if (thisMonthReading) {
						status = 'submitted';
						currValue = thisMonthReading.currValue.toString();
					}

					let icon = Zap;
					let color = 'text-amber-500';
					let bg = 'bg-amber-100';
					let unit = 'kWh';
					const nameLower = service.name.toLowerCase();
					if (nameLower.includes('nước')) {
						icon = Droplet;
						color = 'text-blue-500';
						bg = 'bg-blue-100';
						unit = 'm³';
					}

					return {
						id: service.id,
						serviceName: service.name,
						icon,
						color,
						bg,
						unit,
						prevValue,
						currValue,
						photoUrl: null,
						status
					};
				});
			}
		} catch (err) {
			console.error(err);
			toast.error('Lỗi khi tải dữ liệu phòng');
		} finally {
			isLoading = false;
		}
	});

	async function handlePhotoCapture(event: Event, meterId: string) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];

			toast.info('Đang nén ảnh...');
			try {
				const meter = pendingMeters.find((m) => m.id === meterId);
				const compressedBlob = await compressImage(
					file,
					`Phòng ${roomData?.roomNumber || ''} - ${meter?.serviceName || 'Đồng hồ'}`
				);
				console.log(
					`Dung lượng gốc: ${(file.size / 1024).toFixed(1)}KB. Dung lượng nén: ${(compressedBlob.size / 1024).toFixed(1)}KB`
				);

				const previewUrl = URL.createObjectURL(compressedBlob);

				const idx = pendingMeters.findIndex((m) => m.id === meterId);
				if (idx !== -1) {
					if (pendingMeters[idx].photoUrl?.startsWith('blob:')) {
						URL.revokeObjectURL(pendingMeters[idx].photoUrl);
					}
					pendingMeters[idx].photoUrl = previewUrl;
					(pendingMeters[idx] as any).compressedBlob = compressedBlob;
				}
				toast.success(
					`Nén ảnh siêu nhẹ thành công! (${(compressedBlob.size / 1024).toFixed(0)}KB)`
				);
			} catch (error: any) {
				toast.error(error.message || 'Lỗi khi nén ảnh');
				console.error(error);
			} finally {
				input.value = '';
			}
		}
	}

	async function handleSubmit() {
		if (!activeMeter || !roomData) return;
		if (!activeMeter.currValue) {
			toast.error('Vui lòng nhập số cuối kỳ');
			return;
		}
		if (!activeMeter.photoUrl) {
			toast.error('Vui lòng chụp ảnh đồng hồ');
			return;
		}
		if (!activeMeter.compressedBlob) {
			toast.error('Ảnh đồng hồ chưa sẵn sàng, vui lòng chụp lại');
			return;
		}
		if (Number(activeMeter.currValue) < activeMeter.prevValue) {
			toast.error('Số cuối kỳ không hợp lý (nhỏ hơn số đầu kỳ)');
			return;
		}

		isUploading = true;
		const meterToSubmit = activeMeter;
		const monthStr = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;

		try {
			toast.loading('Đang upload ảnh đồng hồ...', { id: 'upload' });
			const finalPhotoUrl = await uploadBlobToR2(meterToSubmit.compressedBlob, 'meter-reading');

			toast.loading('Đang lưu chỉ số...', { id: 'upload' });
			const meterRes = await fetch('/api/meter-readings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					roomId: roomData.id,
					serviceId: meterToSubmit.id,
					month: monthStr,
					currValue: Number(meterToSubmit.currValue),
					photoUrl: finalPhotoUrl
				})
			});

			const result = await meterRes.json();
			if (!meterRes.ok) throw new Error(result.error || 'Không lưu được chỉ số');

			toast.success(`Đã gửi chỉ số ${meterToSubmit.serviceName} thành công!`, { id: 'upload' });

			const idx = pendingMeters.findIndex((m) => m.id === meterToSubmit.id);
			if (idx !== -1) {
				pendingMeters[idx].status = 'submitted';
				if (pendingMeters[idx].photoUrl?.startsWith('blob:')) {
					URL.revokeObjectURL(pendingMeters[idx].photoUrl);
				}
				pendingMeters[idx].photoUrl = finalPhotoUrl;
				delete pendingMeters[idx].compressedBlob;
			}
			activeMeterId = null;
		} catch (error: any) {
			console.error('Lỗi chi tiết:', error);
			toast.error(error.message || 'Có lỗi xảy ra khi gửi dữ liệu', {
				id: 'upload',
				duration: 5000
			});
		} finally {
			isUploading = false;
		}
	}

	function handleMeterClick(meter: any) {
		if (meter.status === 'pending') {
			activeMeterId = meter.id;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 pb-20">
	<!-- Header -->
	<div class="bg-white px-5 pt-6 pb-4 shadow-sm">
		<h1 class="text-xl font-black text-black">Chốt số điện nước</h1>
		<p class="mt-1 text-sm font-medium text-zinc-500">
			Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()} - P.{roomData?.roomNumber ||
				'...'}
		</p>
	</div>

	{#if isLoading}
		<div class="flex justify-center p-5 pt-20">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
			></div>
		</div>
	{:else if !activeMeterId}
		<!-- List View -->
		<div class="space-y-4 p-5">
			{#each pendingMeters as meter (meter.id)}
				<button
					class="w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all active:scale-[0.98] {meter.status ===
					'submitted'
						? 'opacity-70 grayscale-[0.5]'
						: ''}"
					onclick={() => handleMeterClick(meter)}
					disabled={meter.status === 'submitted'}
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<div
								class="h-12 w-12 rounded-xl {meter.bg} {meter.color} flex items-center justify-center"
							>
								<meter.icon class="h-6 w-6" />
							</div>
							<div>
								<h3 class="text-lg font-bold text-black">{meter.serviceName}</h3>
								{#if meter.status === 'submitted'}
									<p class="mt-0.5 flex items-center gap-1 text-sm font-medium text-green-600">
										<CheckCircle2 class="h-4 w-4" /> Đã gửi (Chờ duyệt)
									</p>
								{:else}
									<p class="mt-0.5 text-sm font-medium text-zinc-500">Số cũ: {meter.prevValue}</p>
								{/if}
							</div>
						</div>

						{#if meter.status === 'pending'}
							<ChevronRight class="h-5 w-5 text-zinc-400" />
						{/if}
					</div>
				</button>
			{/each}

			{#if pendingMeters.every((m) => m.status === 'submitted')}
				<div class="px-4 pt-8 text-center">
					<div
						class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600"
					>
						<CheckCircle2 class="h-8 w-8" />
					</div>
					<h3 class="text-lg font-bold text-black">Hoàn tất!</h3>
					<p class="mt-2 text-sm text-zinc-500">
						Bạn đã gửi đầy đủ chỉ số cho tháng này. Chủ nhà sẽ kiểm tra và chốt hóa đơn.
					</p>
				</div>
			{/if}
		</div>
	{:else if activeMeter}
		<!-- Form View -->
		<div class="animate-in slide-in-from-right-4 p-5 duration-200">
			<button
				class="mb-4 flex items-center gap-1 text-sm font-bold text-blue-500"
				onclick={() => (activeMeterId = null)}
			>
				&larr; Trở lại
			</button>

			<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
				<div class="mb-6 flex items-center gap-3">
					<div
						class="h-10 w-10 rounded-lg {activeMeter.bg} {activeMeter.color} flex items-center justify-center"
					>
						<activeMeter.icon class="h-5 w-5" />
					</div>
					<h2 class="text-xl font-black text-black">Ghi số {activeMeter.serviceName}</h2>
				</div>

				<div class="space-y-6">
					<!-- Số liệu -->
					<div class="grid grid-cols-2 gap-4">
						<div class="rounded-xl border border-gray-100 bg-gray-50 p-4">
							<p class="mb-1 text-xs font-bold text-zinc-500 uppercase">Đầu kỳ</p>
							<p class="text-2xl font-black text-black">{activeMeter.prevValue}</p>
							<p class="mt-1 text-xs font-medium text-zinc-400">{activeMeter.unit}</p>
						</div>

						<div class="rounded-xl border border-blue-100 bg-blue-50 p-4">
							<p class="mb-1 text-xs font-bold text-blue-500 uppercase">Cuối kỳ</p>
							<input
								type="number"
								bind:value={activeMeter.currValue}
								class="w-full bg-transparent text-2xl font-black text-black outline-none placeholder:text-blue-200"
								placeholder="0"
							/>
							<p class="mt-1 text-xs font-medium text-blue-400">{activeMeter.unit}</p>
						</div>
					</div>

					<!-- Upload ảnh -->
					<div>
						<p class="mb-3 text-sm font-bold text-black">Hình chụp đồng hồ minh chứng</p>

						{#if activeMeter.photoUrl}
							<div
								class="group relative aspect-video w-full overflow-hidden rounded-xl border-2 border-black/5 bg-gray-100"
							>
								<img src={activeMeter.photoUrl} alt="Đồng hồ" class="h-full w-full object-cover" />
								<div
									class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity"
								>
									<label
										class="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black"
									>
										<Camera class="h-4 w-4" /> Chụp lại
										<input
											type="file"
											accept="image/*"
											capture="environment"
											class="hidden"
											onchange={(e) => handlePhotoCapture(e, activeMeter!.id)}
										/>
									</label>
								</div>
							</div>
							<!-- Mobile explicit re-take button since hover doesn't work well -->
							<div class="mt-3 text-center">
								<label
									class="inline-flex cursor-pointer items-center gap-1 text-sm font-bold text-blue-500 transition-transform active:scale-95"
								>
									<Camera class="h-4 w-4" /> Chụp lại ảnh khác
									<input
										type="file"
										accept="image/*"
										capture="environment"
										class="hidden"
										onchange={(e) => handlePhotoCapture(e, activeMeter!.id)}
									/>
								</label>
							</div>
						{:else}
							<label
								class="flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 transition-colors hover:bg-zinc-100 active:scale-[0.98]"
							>
								<div
									class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-500"
								>
									<Camera class="h-6 w-6" />
								</div>
								<span class="font-bold text-black">Mở Camera chụp</span>
								<span class="mt-1 text-xs font-medium text-zinc-500">Đảm bảo rõ nét chữ số</span>
								<input
									type="file"
									accept="image/*"
									capture="environment"
									class="hidden"
									onchange={(e) => handlePhotoCapture(e, activeMeter!.id)}
								/>
							</label>
						{/if}
					</div>

					<!-- Nút Gửi -->
					<div class="pt-4">
						<button
							onclick={handleSubmit}
							disabled={isUploading}
							class="w-full {isUploading
								? 'bg-zinc-400'
								: 'bg-black shadow-xl shadow-black/20 active:scale-[0.98]'} flex items-center justify-center gap-2 rounded-xl py-4 text-lg font-black text-white transition-all"
						>
							{#if isUploading}
								<div
									class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
								></div>
								Đang xử lý...
							{:else}
								<UploadCloud class="h-5 w-5" /> Gửi chỉ số
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
