export type EmployeeRecord = Record<string, unknown>;

export type AuthSession = {
	token: string;
	employee: EmployeeRecord;
	issuedAt: number;
	expiresAt: number;
};

export const AUTH_STORAGE_KEY = "evaluation01.auth.session";
// export const AUTH_SESSION_TTL_MS = Number((import.meta as any).env?.VITE_AUTH_SESSION_TTL_MS ??1 * 60 * 1000);
export const AUTH_SESSION_TTL_MS = Number((import.meta as any).env?.VITE_AUTH_SESSION_TTL_MS ?? 8 * 60 * 60 * 1000);
export const AUTH_STATIC_EMAIL = (import.meta as any).env?.VITE_AUTH_STATIC_EMAIL ?? "eddourandria@gmail.com";
export const AUTH_STATIC_PASSWORD = (import.meta as any).env?.VITE_AUTH_STATIC_PASSWORD ?? "randrianarison";

function stripSecrets(employee: EmployeeRecord): EmployeeRecord {
	const { password, motDePasse, passwd, passwordHash, hash, ...safeEmployee } = employee;
	return safeEmployee;
}

function isSessionExpired(session: AuthSession): boolean {
	return session.expiresAt <= Date.now();
}

export function clearAuthSession(): void {
	window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredAuthSession(): AuthSession | null {
	const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
	if (!rawSession) return null;

	try {
		const session = JSON.parse(rawSession) as AuthSession;
		if (!session?.token || !session.employee || isSessionExpired(session)) {
			clearAuthSession();
			return null;
		}

		return session;
	} catch {
		clearAuthSession();
		return null;
	}
}

export const logoutEmployee = clearAuthSession;

export function isAuthenticated(): boolean {
	return getStoredAuthSession() !== null;
}

export async function loginEmployee(identifier: string, password: string): Promise<AuthSession> {
	const email = identifier.trim();
	if (!email) throw new Error("Veuillez renseigner l'identifiant de l'employé.");
	if (!password) throw new Error("Veuillez renseigner le mot de passe.");

	if (email.toLowerCase() !== AUTH_STATIC_EMAIL.toLowerCase() || password !== AUTH_STATIC_PASSWORD) {
		throw new Error("Identifiant ou mot de passe incorrect.");
	}

	const session: AuthSession = {
		token: crypto.randomUUID(),
		employee: stripSecrets({
			email: AUTH_STATIC_EMAIL,
			firstname: "Admin",
			lastname: "Local",
			active: true,
			id_profile: 1,
		}),
		issuedAt: Date.now(),
		expiresAt: Date.now() + AUTH_SESSION_TTL_MS,
	};

	window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
	console.log("Session d'authentification créée:", session);
	return session;
}
