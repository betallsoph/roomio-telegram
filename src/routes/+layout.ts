import { redirect } from '@sveltejs/kit';
import { resolveRouteAccess } from '$lib/route-policy';
import type { LayoutLoad } from './$types';

// SPA tĩnh: tắt SSR và prerender, mọi thứ render phía client rồi gọi API qua /api
export const ssr = false;
export const prerender = false;

// UX-001 — Mini App chỉ có bề mặt người thuê.
// Lớp này chạy TRƯỚC khi render nên deep link tới dashboard chủ trọ/nhân viên/super admin
// (kể cả khi mở lại trang trực tiếp) không kịp hiện một khung hình nào rồi mới chuyển.
// Không phụ thuộc phiên: quyết định thuần theo đường dẫn nên luôn tất định.
export const load: LayoutLoad = ({ url }) => {
	const decision = resolveRouteAccess(url.pathname);
	if (decision.kind === 'redirect') {
		redirect(307, decision.to);
	}
	return {};
};
