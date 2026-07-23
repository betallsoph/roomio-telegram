export type MeterUtility = 'electric' | 'water';

export interface RoomServiceConfig {
	serviceId: string;
	service: { name: string; type: string };
}

export interface MeterReadingRow {
	serviceId: string;
	month: string;
	prevValue: number;
	currValue: number;
	submittedValue?: number | null;
	status: string;
	photoUrl: string | null;
	recordedAt: string;
}

export function isWaterServiceName(name: string): boolean {
	return name.toLowerCase().includes('nước');
}

export function isElectricServiceName(name: string): boolean {
	return name.toLowerCase().includes('điện');
}

export function getUtilityServiceConfig(
	services: RoomServiceConfig[] | undefined,
	utility: MeterUtility
): RoomServiceConfig | null {
	if (!services) return null;
	return (
		services.find((s) =>
			utility === 'water'
				? isWaterServiceName(s.service.name)
				: isElectricServiceName(s.service.name)
		) ?? null
	);
}

/** Flat-rate (khoán): any service type other than METERED */
export function isUtilityKhoan(
	services: RoomServiceConfig[] | undefined,
	utility: MeterUtility
): boolean {
	const config = getUtilityServiceConfig(services, utility);
	return config != null && config.service.type !== 'METERED';
}

export function getUtilityMeterReadings(
	services: RoomServiceConfig[] | undefined,
	readings: MeterReadingRow[] | undefined,
	utility: MeterUtility
): MeterReadingRow[] {
	const config = getUtilityServiceConfig(services, utility);
	if (!config || config.service.type !== 'METERED' || !readings) return [];
	return readings.filter((r) => r.serviceId === config.serviceId);
}

export function getMeteredServiceConfigs(services: RoomServiceConfig[] | undefined) {
	return services?.filter((s) => s.service.type === 'METERED') ?? [];
}
