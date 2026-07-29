import assert from 'node:assert/strict';
import test from 'node:test';

import {
	NON_TENANT_ROUTES,
	ROLES,
	TENANT_ROOT,
	TENANT_ROUTES,
	canRenderTenantContent,
	isTenantSurface,
	normalizePathname,
	parseRole,
	resolveRouteAccess,
	resolveTenantGate,
	type Role
} from './route-policy.ts';

// UX-001 — Mini App tenant-only. Test phủ hai lớp:
//   lớp đường dẫn (chạy trong `load`, trước render) và lớp role (chạy sau khi có phiên).

const ACTORS: (Role | null)[] = [null, ...ROLES];

function isAllowed(pathname: string): boolean {
	return resolveRouteAccess(pathname).kind === 'allow';
}

// --- Lớp đường dẫn: khóa toàn bộ bề mặt không phải người thuê --------------------

test('every non-tenant route in the repo is redirected away from the Mini App', () => {
	for (const route of NON_TENANT_ROUTES) {
		const decision = resolveRouteAccess(route);
		assert.equal(decision.kind, 'redirect', `${route} must not be reachable in TMA`);
		assert.equal(decision.kind === 'redirect' && decision.to, TENANT_ROOT, route);
		assert.equal(decision.kind === 'redirect' && decision.reason, 'NOT_TENANT_SURFACE', route);
	}
});

test('landlord, staff and super-admin deep links are all blocked', () => {
	for (const route of [
		'/dashboard',
		'/dashboard/invoices',
		'/dashboard/invoices/bulk',
		'/dashboard/finance',
		'/dashboard/tenants',
		'/dashboard/workspace/property-123',
		'/staff',
		'/super-admin',
		'/login'
	]) {
		assert.equal(isAllowed(route), false, `${route} leaked into the tenant Mini App`);
	}
});

test('tenant routes stay reachable', () => {
	for (const route of TENANT_ROUTES) {
		assert.equal(isAllowed(route), true, route);
	}
	assert.equal(isAllowed('/tenant/anything-new'), true, 'future tenant subroutes stay open');
});

test('root dispatches into the tenant surface', () => {
	const decision = resolveRouteAccess('/');
	assert.equal(decision.kind, 'redirect');
	assert.equal(decision.kind === 'redirect' && decision.to, TENANT_ROOT);
	assert.equal(decision.kind === 'redirect' && decision.reason, 'ROOT_DISPATCH');
});

test('direct refresh with trailing slashes is judged the same way', () => {
	for (const variant of ['/tenant/', '/tenant//', '/tenant/meters/']) {
		assert.equal(isAllowed(variant), true, variant);
	}
	for (const variant of ['/dashboard/', '/staff//', '/super-admin/']) {
		assert.equal(isAllowed(variant), false, variant);
	}
});

test('lookalike paths do not sneak past the tenant prefix', () => {
	assert.equal(isTenantSurface('/tenant'), true);
	assert.equal(isTenantSurface('/tenant/meters'), true);
	assert.equal(isTenantSurface('/tenants'), false);
	assert.equal(isTenantSurface('/tenant-admin'), false);
	assert.equal(isAllowed('/tenants'), false);
	assert.equal(isAllowed('/tenant-admin'), false);
});

test('path decisions never depend on who is logged in', () => {
	// Lớp đường dẫn phải tất định để chạy được trong `load` trước khi có phiên.
	for (const route of [...TENANT_ROUTES, ...NON_TENANT_ROUTES, '/']) {
		const first = resolveRouteAccess(route);
		const second = resolveRouteAccess(route);
		assert.deepEqual(first, second, route);
	}
});

test('normalizePathname handles empty and malformed input', () => {
	assert.equal(normalizePathname(''), '/');
	assert.equal(normalizePathname('no-leading-slash'), '/');
	assert.equal(normalizePathname('/tenant///'), '/tenant');
});

// --- Lớp role: chỉ người thuê được thấy nội dung riêng tư ------------------------

test('unauthenticated session cannot render private content', () => {
	assert.equal(canRenderTenantContent(null), false);
	assert.equal(resolveTenantGate(null).kind, 'block');
	const gate = resolveTenantGate(null);
	assert.equal(gate.kind === 'block' && gate.reason, 'UNAUTHENTICATED');
});

test('landlord, staff and super-admin sessions cannot render private content', () => {
	for (const role of ['LANDLORD', 'STAFF', 'SUPER_ADMIN'] as Role[]) {
		assert.equal(canRenderTenantContent(role), false, role);
		const gate = resolveTenantGate(role);
		assert.equal(gate.kind, 'block', role);
		assert.equal(gate.kind === 'block' && gate.reason, 'NOT_A_TENANT', role);
	}
});

test('only the tenant role renders private content', () => {
	assert.equal(canRenderTenantContent('TENANT'), true);
	assert.equal(resolveTenantGate('TENANT').kind, 'render');
	const renderers = ACTORS.filter((actor) => canRenderTenantContent(actor));
	assert.deepEqual(renderers, ['TENANT']);
});

test('an unknown or forged role value is treated as no role', () => {
	for (const bad of ['tenant', 'ADMIN', '', null, undefined, 7, {}, []]) {
		assert.equal(parseRole(bad), null, String(bad));
		assert.equal(canRenderTenantContent(parseRole(bad)), false, String(bad));
	}
});

// --- Hai lớp cộng lại -------------------------------------------------------------

test('no actor can combine a non-tenant route with rendering private content', () => {
	for (const route of NON_TENANT_ROUTES) {
		for (const actor of ACTORS) {
			const reachable = isAllowed(route);
			const renders = canRenderTenantContent(actor);
			assert.equal(reachable && renders, false, `${actor ?? 'anon'} @ ${route}`);
		}
	}
});

test('the declared non-tenant list still covers the routes shipped in this repo', () => {
	// Nếu thêm route mới ngoài /tenant mà quên khai báo, luật đường dẫn vẫn chặn.
	assert.equal(isAllowed('/some-route-added-later'), false);
	assert.ok(NON_TENANT_ROUTES.length >= 20, 'non-tenant inventory looks truncated');
});
