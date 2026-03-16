export const AUTH_STORAGE_KEY = "bi_auth_user";

export type AuthUser = {
  email: string;
  token: string;
  loginAt: string;
};

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.email || !parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setAuthUser(email: string, token: string): void {
  if (typeof window === "undefined") return;

  const payload: AuthUser = {
    email,
    token,
    loginAt: new Date().toISOString(),
  };
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

export function clearAuthUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
