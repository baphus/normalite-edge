import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

/**
 * Attach the current Supabase access token.
 *
 * `getSession()` returns the cached session and transparently refreshes it
 * when it is close to expiry, so the manual refresh endpoint and the
 * retry-on-401 dance are gone — that is Supabase's job now.
 */
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;

        // A 401 means the token could not be verified and refreshing had
        // already failed — the session is genuinely dead.
        //
        // Note what is deliberately NOT handled here: a 403 "Profile setup
        // required", returned for a perfectly valid session belonging to
        // someone who has not finished registering. Treating that as a
        // sign-out would bounce them to /login, where Google would silently
        // sign them back in, straight into the same state — an infinite loop
        // on every new user's first visit. AuthContext routes that case to
        // profile completion instead.
        if (status === 401 && !window.location.pathname.startsWith('/login')) {
            await supabase.auth.signOut();
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
