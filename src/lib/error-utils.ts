export function getErrorMessage(error: unknown, fallback = 'Có lỗi xảy ra'): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	return fallback;
}
