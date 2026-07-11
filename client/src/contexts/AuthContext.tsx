import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../lib/axios';
import { tokenStore } from '../lib/tokenStore';
import { formatUserDisplayName } from '../lib/formatUserDisplayName';

interface User {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    middleInitial?: string;
    suffix?: string;
    role: 'ADMIN' | 'REVIEWER' | 'REVIEWEE';
    status: 'PENDING' | 'ACTIVE' | 'DISABLED';
    picture?: string;
    program?: string;
    program_track?: string;
    programTrack?: string;
    track_id?: string;
    campus?: string;
    campus_id?: string;
    major?: string;
    yearLevel?: string;
    section?: string;
    isOnboarded?: boolean;
    completedTours?: string[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (accessToken: string, user: User) => void;
    logout: () => Promise<void>;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (userData: User): User => {
    const normalized = { ...userData };
    normalized.name = formatUserDisplayName(normalized);
    return normalized;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            // On page load, attempt to restore session via refresh token cookie.
            // Access token is memory-only and lost on refresh, so we always
            // try to get a fresh one via the refresh endpoint.
            try {
                const refreshRes = await api.post('/auth/refresh');
                const { accessToken, user: userData } = refreshRes.data.data;
                tokenStore.setToken(accessToken);
                const normalizedUser = normalizeUser(userData as User);
                setUser(normalizedUser);
                localStorage.setItem('user', JSON.stringify(normalizedUser));
            } catch {
                // No valid refresh token — user needs to log in
                tokenStore.clearToken();
                localStorage.removeItem('user');
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = (accessToken: string, userData: User) => {
        const normalizedUser = normalizeUser(userData);
        tokenStore.setToken(accessToken);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        setUser(normalizedUser);
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Ignore logout errors — clear state regardless
        } finally {
            tokenStore.clearToken();
            localStorage.removeItem('user');
            setUser(null);
            window.location.href = '/login';
        }
    };

    const updateUser = (userData: User) => {
        const normalizedUser = normalizeUser(userData);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        setUser(normalizedUser);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
