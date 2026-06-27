export const authState = $state({
	user: null as {
		id: string;
		name: string;
		role: string;
		tenantProfileId?: string;
	} | null,
	isAuthenticated: false,
	isError: false,
	errorMessage: '',
	errorType: ''
});

export function setAuthUser(userData: any) {
	authState.user = userData;
	authState.isAuthenticated = true;
	authState.isError = false;
	authState.errorMessage = '';
	authState.errorType = '';
}

export function setAuthError(message: string, type: string = '') {
	authState.user = null;
	authState.isAuthenticated = false;
	authState.isError = true;
	authState.errorMessage = message;
	authState.errorType = type;
}
