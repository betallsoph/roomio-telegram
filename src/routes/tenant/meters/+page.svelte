<script lang="ts">
	import { Camera, CheckCircle2, ChevronRight, UploadCloud, Zap, Droplet, Image as ImageIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	// Mock dữ liệu: Phòng này cần chốt Điện và Nước
	let pendingMeters = $state([
		{
			id: '1',
			serviceName: 'Điện',
			icon: Zap,
			prevValue: 511,
			unit: 'kWh',
			color: 'text-amber-500',
			bg: 'bg-amber-100',
			currValue: '',
			photoUrl: null as string | null,
			status: 'pending' // 'pending' | 'submitted'
		},
		{
			id: '2',
			serviceName: 'Nước',
			icon: Droplet,
			prevValue: 45,
			unit: 'đơn vị',
			color: 'text-blue-500',
			bg: 'bg-blue-100',
			currValue: '',
			photoUrl: null as string | null,
			status: 'pending'
		}
	]);

	let activeMeterId = $state<string | null>(null);

	const activeMeter = $derived(pendingMeters.find((m) => m.id === activeMeterId));

	function handlePhotoCapture(event: Event, meterId: string) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			// Mock tạo object URL tạm thời để hiển thị preview
			const previewUrl = URL.createObjectURL(file);
			
			const idx = pendingMeters.findIndex(m => m.id === meterId);
			if (idx !== -1) {
				pendingMeters[idx].photoUrl = previewUrl;
			}
		}
	}

	function handleSubmit() {
		if (!activeMeter) return;
		if (!activeMeter.currValue) {
			toast.error('Vui lòng nhập số cuối kỳ');
			return;
		}
		if (!activeMeter.photoUrl) {
			toast.error('Vui lòng chụp ảnh đồng hồ');
			return;
		}
		if (Number(activeMeter.currValue) < activeMeter.prevValue) {
			toast.error('Số cuối kỳ không hợp lý (nhỏ hơn số đầu kỳ)');
			return;
		}

		// Mock call API
		toast.success(`Đã gửi chỉ số ${activeMeter.serviceName} thành công!`);
		
		const idx = pendingMeters.findIndex(m => m.id === activeMeter.id);
		if (idx !== -1) {
			pendingMeters[idx].status = 'submitted';
		}
		activeMeterId = null;
	}
</script>

<div class="min-h-screen bg-gray-50 pb-20">
	<!-- Header -->
	<div class="bg-white px-5 pt-6 pb-4 shadow-sm">
		<h1 class="text-xl font-black text-black">Chốt số điện nước</h1>
		<p class="mt-1 text-sm font-medium text-zinc-500">Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()} - P.503</p>
	</div>

	{#if !activeMeterId}
		<!-- List View -->
		<div class="p-5 space-y-4">
			{#each pendingMeters as meter}
				<button 
					class="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left transition-all active:scale-[0.98] {meter.status === 'submitted' ? 'opacity-70 grayscale-[0.5]' : ''}"
					onclick={() => meter.status === 'pending' && (activeMeterId = meter.id)}
					disabled={meter.status === 'submitted'}
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<div class="h-12 w-12 rounded-xl {meter.bg} {meter.color} flex items-center justify-center">
								<meter.icon class="h-6 w-6" />
							</div>
							<div>
								<h3 class="font-bold text-black text-lg">{meter.serviceName}</h3>
								{#if meter.status === 'submitted'}
									<p class="text-sm text-green-600 font-medium flex items-center gap-1 mt-0.5">
										<CheckCircle2 class="h-4 w-4" /> Đã gửi (Chờ duyệt)
									</p>
								{:else}
									<p class="text-sm text-zinc-500 font-medium mt-0.5">Số cũ: {meter.prevValue}</p>
								{/if}
							</div>
						</div>
						
						{#if meter.status === 'pending'}
							<ChevronRight class="h-5 w-5 text-zinc-400" />
						{/if}
					</div>
				</button>
			{/each}

			{#if pendingMeters.every(m => m.status === 'submitted')}
				<div class="text-center pt-8 px-4">
					<div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
						<CheckCircle2 class="h-8 w-8" />
					</div>
					<h3 class="font-bold text-lg text-black">Hoàn tất!</h3>
					<p class="text-zinc-500 mt-2 text-sm">Bạn đã gửi đầy đủ chỉ số cho tháng này. Chủ nhà sẽ kiểm tra và chốt hóa đơn.</p>
				</div>
			{/if}
		</div>
	{:else if activeMeter}
		<!-- Form View -->
		<div class="p-5 animate-in slide-in-from-right-4 duration-200">
			<button 
				class="text-blue-500 font-bold mb-4 flex items-center gap-1 text-sm"
				onclick={() => activeMeterId = null}
			>
				&larr; Trở lại
			</button>

			<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
				<div class="flex items-center gap-3 mb-6">
					<div class="h-10 w-10 rounded-lg {activeMeter.bg} {activeMeter.color} flex items-center justify-center">
						<activeMeter.icon class="h-5 w-5" />
					</div>
					<h2 class="font-black text-xl text-black">Ghi số {activeMeter.serviceName}</h2>
				</div>

				<div class="space-y-6">
					<!-- Số liệu -->
					<div class="grid grid-cols-2 gap-4">
						<div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
							<p class="text-xs font-bold text-zinc-500 mb-1 uppercase">Đầu kỳ</p>
							<p class="text-2xl font-black text-black">{activeMeter.prevValue}</p>
							<p class="text-xs text-zinc-400 font-medium mt-1">{activeMeter.unit}</p>
						</div>
						
						<div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
							<p class="text-xs font-bold text-blue-500 mb-1 uppercase">Cuối kỳ</p>
							<input 
								type="number" 
								bind:value={activeMeter.currValue}
								class="w-full bg-transparent text-2xl font-black text-black outline-none placeholder:text-blue-200"
								placeholder="0"
							/>
							<p class="text-xs text-blue-400 font-medium mt-1">{activeMeter.unit}</p>
						</div>
					</div>

					<!-- Upload ảnh -->
					<div>
						<p class="text-sm font-bold text-black mb-3">Hình chụp đồng hồ minh chứng</p>
						
						{#if activeMeter.photoUrl}
							<div class="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-black/5 bg-gray-100 group">
								<img src={activeMeter.photoUrl} alt="Đồng hồ" class="w-full h-full object-cover" />
								<div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 transition-opacity">
									<label class="cursor-pointer bg-white text-black px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
										<Camera class="h-4 w-4" /> Chụp lại
										<input type="file" accept="image/*" capture="environment" class="hidden" onchange={(e) => handlePhotoCapture(e, activeMeter!.id)} />
									</label>
								</div>
							</div>
							<!-- Mobile explicit re-take button since hover doesn't work well -->
							<div class="mt-3 text-center">
								<label class="inline-flex cursor-pointer text-blue-500 font-bold text-sm items-center gap-1 active:scale-95 transition-transform">
									<Camera class="h-4 w-4" /> Chụp lại ảnh khác
									<input type="file" accept="image/*" capture="environment" class="hidden" onchange={(e) => handlePhotoCapture(e, activeMeter!.id)} />
								</label>
							</div>
						{:else}
							<label class="cursor-pointer flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100 transition-colors active:scale-[0.98]">
								<div class="h-12 w-12 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mb-3">
									<Camera class="h-6 w-6" />
								</div>
								<span class="font-bold text-black">Mở Camera chụp</span>
								<span class="text-xs font-medium text-zinc-500 mt-1">Đảm bảo rõ nét chữ số</span>
								<input type="file" accept="image/*" capture="environment" class="hidden" onchange={(e) => handlePhotoCapture(e, activeMeter!.id)} />
							</label>
						{/if}
					</div>

					<!-- Nút Gửi -->
					<div class="pt-4">
						<button 
							onclick={handleSubmit}
							class="w-full bg-black text-white rounded-xl py-4 font-black text-lg shadow-xl shadow-black/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
						>
							<UploadCloud class="h-5 w-5" /> Gửi chỉ số
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
