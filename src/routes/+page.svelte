<script lang="ts">
	// UX-001: điều hướng về cổng khách thuê đã chuyển sang `+layout.ts` (`resolveRouteAccess`).
	// Làm trong `load` thay vì `onMount` để không render một khung hình nào trước khi chuyển;
	// bot vẫn deep-link thẳng được tới /tenant/meters. Đây chỉ còn là màn chờ.
</script>

<div class="flex h-screen items-center justify-center bg-gray-50">
	<div
		class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
	></div>
</div>
