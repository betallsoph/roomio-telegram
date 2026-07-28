// UX-001 — chính sách route/role cho Telegram Mini App.
//
// Quyết định sản phẩm đã khóa (`PLAN-production-hardening.md` §2 và
// `10-canonical-contracts.md` §10): **TMA chỉ phục vụ NGƯỜI THUÊ**.
// Bản build hiện tại vẫn còn route dashboard chủ trọ, `/staff`, `/super-admin` và `/login`
// — đó là bề mặt sai. Module này là nơi duy nhất chặn chúng.
//
// Hai lớp, cố ý tách bạch:
//  1. Lớp ĐƯỜNG DẪN (`resolveRouteAccess`) — tất định, không cần biết đã đăng nhập hay chưa,
//     nên chạy được trong `load` TRƯỚC khi render. Mọi route ngoài `/tenant` bị đẩy về `/tenant`.
//  2. Lớp ROLE (`resolveTenantGate`) — chỉ chạy được sau khi Telegram initData đổi lấy phiên;
//     quyết định có render nội dung riêng tư hay hiện màn lỗi.
//
// GIỚI HẠN: đây là guard trải nghiệm. API vẫn là nguồn quyền cuối cùng và vẫn phải từ chối
// nếu ai đó gọi tay bằng phiên không phải người thuê.

export const ROLES = ['SUPER_ADMIN', 'LANDLORD', 'STAFF', 'TENANT'] as const;
export type Role = (typeof ROLES)[number];

const ROLE_VALUES = new Set<string>(ROLES);

/** Bề mặt duy nhất được phép tồn tại trong Mini App. */
export const TENANT_ROOT = '/tenant';

/** Route người thuê hợp lệ; bot deep-link thẳng tới `/tenant/meters`. */
export const TENANT_ROUTES = ['/tenant', '/tenant/meters'] as const;

/**
 * Route đang có trong repo nhưng KHÔNG thuộc Mini App người thuê.
 * Giữ danh sách tường minh để reviewer thấy đúng bề mặt đang bị khóa.
 */
export const NON_TENANT_ROUTES = [
	'/login',
	'/staff',
	'/super-admin',
	'/dashboard',
	'/dashboard/automation',
	'/dashboard/buildings',
	'/dashboard/contracts',
	'/dashboard/finance',
	'/dashboard/invoices',
	'/dashboard/invoices/bulk',
	'/dashboard/messages',
	'/dashboard/meters',
	'/dashboard/notifications',
	'/dashboard/requests',
	'/dashboard/rooms',
	'/dashboard/services',
	'/dashboard/settings',
	'/dashboard/staff',
	'/dashboard/tenants',
	'/dashboard/workspace'
] as const;

export type AccessDecision =
	| { kind: 'allow' }
	| { kind: 'redirect'; to: string; reason: 'NOT_TENANT_SURFACE' | 'ROOT_DISPATCH' };

export type TenantGate =
	| { kind: 'render' }
	| { kind: 'block'; reason: 'UNAUTHENTICATED' | 'NOT_A_TENANT' };

export function parseRole(value: unknown): Role | null {
	return typeof value === 'string' && ROLE_VALUES.has(value) ? (value as Role) : null;
}

export function normalizePathname(pathname: string): string {
	if (!pathname.startsWith('/')) return '/';
	const trimmed = pathname.replace(/\/+$/, '');
	return trimmed === '' ? '/' : trimmed;
}

/** Đúng bề mặt người thuê, so khớp theo ranh giới đoạn (`/tenants-x` không tính). */
export function isTenantSurface(pathname: string): boolean {
	const path = normalizePathname(pathname);
	return path === TENANT_ROOT || path.startsWith(`${TENANT_ROOT}/`);
}

/**
 * Lớp đường dẫn. Chạy được trước khi biết phiên, nên đặt trong `load` để không bao giờ
 * render một khung hình nào của bề mặt sai.
 */
export function resolveRouteAccess(pathname: string): AccessDecision {
	const path = normalizePathname(pathname);

	// `/` là cổng vào Mini App: đẩy thẳng sang bề mặt người thuê.
	if (path === '/') {
		return { kind: 'redirect', to: TENANT_ROOT, reason: 'ROOT_DISPATCH' };
	}

	if (isTenantSurface(path)) return { kind: 'allow' };

	// Mọi thứ còn lại — dashboard chủ trọ, nhân viên, super admin, login — không thuộc
	// Mini App. Chọn redirect thay vì 404 vì trong Telegram không có bề mặt nào khác để đi.
	return { kind: 'redirect', to: TENANT_ROOT, reason: 'NOT_TENANT_SURFACE' };
}

/**
 * Lớp role. Gọi sau khi đổi initData lấy phiên; chỉ `TENANT` mới được render nội dung riêng tư.
 */
export function resolveTenantGate(role: Role | null): TenantGate {
	if (!role) return { kind: 'block', reason: 'UNAUTHENTICATED' };
	if (role !== 'TENANT') return { kind: 'block', reason: 'NOT_A_TENANT' };
	return { kind: 'render' };
}

/** Dạng boolean tiện dùng trong component. */
export function canRenderTenantContent(role: Role | null): boolean {
	return resolveTenantGate(role).kind === 'render';
}
