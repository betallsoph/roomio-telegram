<script lang="ts">
	import { X } from '@lucide/svelte';

	interface Props {
		src: string | null;
		alt?: string;
		onClose: () => void;
	}

	let { src, alt = 'Ảnh', onClose }: Props = $props();

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClose();
		}
	}
</script>

<svelte:window onkeydown={(e) => src && e.key === 'Escape' && onClose()} />

{#if src}
	<div
		class="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		onclick={onClose}
		onkeydown={handleBackdropKeydown}
		role="presentation"
	>
		<div
			class="relative max-h-full max-w-full animate-[scale-up_0.18s_ease-out]"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-label={alt}
		>
			<button
				type="button"
				onclick={onClose}
				class="absolute -top-2 -right-2 z-10 rounded-full border-2 border-black bg-white p-1.5 text-black shadow-secondary transition-colors hover:bg-zinc-100"
				aria-label="Đóng"
			>
				<X class="h-4 w-4" />
			</button>
			<img
				{src}
				{alt}
				class="max-h-[85vh] max-w-[min(100vw-2rem,36rem)] rounded-lg border-2 border-black bg-white object-contain shadow-secondary"
			/>
		</div>
	</div>
{/if}
