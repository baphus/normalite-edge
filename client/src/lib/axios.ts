import axios from 'axios';
import { tokenStore } from './tokenStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
    withCredentials: true, // Required for refresh token cookie
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // CSRF protection
    },
});

// Interceptor to attach access token from memory to requests
api.interceptors.request.use((config) => {
    const token = tokenStore.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor to handle token refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Don't try to refresh if it's already a refresh request or a login request
        const isAuthRequest = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
            originalRequest._retry = true;

            try {
                const response = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    {},
                    {
                        withCredentials: true,
                        headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    }
                );

                const { accessToken } = response.data.data;
                tokenStore.setToken(accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh token failed, clear memory and redirect to login
                tokenStore.clearToken();
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
