export const RENTAL_TYPES = ['APARTMENT', 'MOTEL', 'DORM', 'WHOLE_UNIT'] as const;
export type RentalType = (typeof RENTAL_TYPES)[number];

const RENTAL_TYPE_ALIASES: Record<string, RentalType> = {
	COLIVING: 'APARTMENT',
	SERVICED_APARTMENT: 'MOTEL'
};

export function canonicalRentalType(value: unknown): string {
	if (typeof value !== 'string') return '';
	const normalized = value.trim().toUpperCase();
	if (!normalized) return '';
	return RENTAL_TYPE_ALIASES[normalized] ?? normalized;
}

export function isValidRentalType(value: string): value is RentalType {
	return (RENTAL_TYPES as readonly string[]).includes(value);
}

export const RENTAL_TYPE_OPTIONS: {
	value: RentalType;
	label: string;
	lines: string[];
}[] = [
	{
		value: 'APARTMENT',
		label: 'Share phòng chung cư / Co-living',
		lines: ['Share phòng chung cư', 'Co-living']
	},
	{
		value: 'MOTEL',
		label: 'Phòng trọ truyền thống / Căn hộ dịch vụ',
		lines: ['Phòng trọ truyền thống', 'Căn hộ dịch vụ']
	},
	{ value: 'DORM', label: 'KTX / Sleepbox', lines: ['KTX', 'Sleepbox'] },
	{
		value: 'WHOLE_UNIT',
		label: 'Căn hộ chung cư nguyên căn / Nhà nguyên căn',
		lines: ['Căn hộ chung cư nguyên căn', 'Nhà nguyên căn']
	}
];

const RENTAL_TYPE_LABELS: Record<RentalType, string> = {
	APARTMENT: 'Share phòng chung cư / Co-living',
	MOTEL: 'Phòng trọ truyền thống / Căn hộ dịch vụ',
	DORM: 'KTX / Sleepbox',
	WHOLE_UNIT: 'Căn hộ chung cư nguyên căn / Nhà nguyên căn'
};

const RENTAL_TYPE_SHORT_LABELS: Record<RentalType, string> = {
	APARTMENT: 'Co-living',
	MOTEL: 'Trọ / CHDV',
	DORM: 'KTX / Sleepbox',
	WHOLE_UNIT: 'Nguyên căn'
};

function resolveRentalType(type: string): RentalType {
	const canonical = canonicalRentalType(type);
	return isValidRentalType(canonical) ? canonical : 'APARTMENT';
}

export function rentalTypeLabel(type: string): string {
	const resolved = resolveRentalType(type);
	return RENTAL_TYPE_LABELS[resolved] ?? type;
}

export function rentalTypeShortLabel(type: string): string {
	const resolved = resolveRentalType(type);
	return RENTAL_TYPE_SHORT_LABELS[resolved] ?? type;
}

export function propertyLabel(type: string): string {
	const resolved = resolveRentalType(type);
	if (resolved === 'MOTEL') return 'khu trọ';
	if (resolved === 'DORM') return 'khu KTX / sleepbox';
	if (resolved === 'WHOLE_UNIT') return 'bất động sản nguyên căn';
	return 'căn co-living';
}

export function propertyHeadingLabel(type: string): string {
	return rentalTypeShortLabel(type);
}

export function blockLabel(type: string): string {
	const resolved = resolveRentalType(type);
	if (resolved === 'MOTEL') return 'Dãy';
	if (resolved === 'DORM') return 'Phòng / khu';
	if (resolved === 'WHOLE_UNIT') return 'Cụm / dự án';
	return 'Block';
}

export function propertyNamePlaceholder(type: string): string {
	const resolved = resolveRentalType(type);
	if (resolved === 'MOTEL') return 'Ví dụ: Khu trọ An Bình';
	if (resolved === 'DORM') return 'Ví dụ: Sleepbox Cầu Giấy';
	if (resolved === 'WHOLE_UNIT') return 'Ví dụ: Căn A1205 Masteri / Nhà nguyên căn Bình Thạnh';
	return 'Ví dụ: Co-living Thảo Điền';
}

export function blockPlaceholder(type: string): string {
	const resolved = resolveRentalType(type);
	if (resolved === 'MOTEL') return 'Ví dụ: Dãy A, Dãy B, Dãy sau';
	if (resolved === 'DORM') return 'Ví dụ: Phòng nam, Phòng nữ, Khu yên tĩnh';
	if (resolved === 'WHOLE_UNIT') return 'Ví dụ: Masteri Thảo Điền, Nhà phố Quận 7';
	return 'Ví dụ: A1, A2, B1, B2';
}

export function roomCodeLabel(type: string): string {
	const resolved = resolveRentalType(type);
	if (resolved === 'MOTEL') return 'Mã phòng';
	if (resolved === 'DORM') return 'Mã giường / box';
	if (resolved === 'WHOLE_UNIT') return 'Mã căn/nhà';
	return 'Mã căn hộ';
}

export function unitNoun(type: string): string {
	const resolved = resolveRentalType(type);
	if (resolved === 'WHOLE_UNIT') return 'căn / nhà';
	return 'phòng';
}

export function parseRentalTypes(value: string | null | undefined): RentalType[] {
	const parsed = (value || 'APARTMENT')
		.split(',')
		.map((type) => canonicalRentalType(type.trim()))
		.filter((type): type is RentalType => isValidRentalType(type));
	const deduped = [...new Set(parsed)];
	return deduped.length > 0 ? deduped : ['APARTMENT'];
}

export function isColivingPricingType(type: string): boolean {
	const resolved = resolveRentalType(type);
	return resolved === 'APARTMENT';
}

export function isApartmentRentalType(type: string): boolean {
	return resolveRentalType(type) === 'APARTMENT';
}
