/**
 * In-memory token store.
 * Access tokens are kept in memory only — never persisted to localStorage.
 * This prevents XSS attacks from stealing the token.
 *
 * On page refresh, the token is lost and must be re-obtained via
 * the refresh token (stored as an HTTP-only cookie).
 */

let accessToken: string | null = null;

export const tokenStore = {
    getToken(): string | null {
        return accessToken;
    },

    setToken(token: string | null): void {
        accessToken = token;
    },

    clearToken(): void {
        accessToken = null;
    },
};
