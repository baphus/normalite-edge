import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../lib/axios';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    picture?: string;
    program?: string;
    major?: string;
    yearLevel?: string;
    section?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (accessToken: string, user: User) => void;
    logout: () => Promise<void>;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('accessToken');
            if (token && token !== 'undefined' && token !== 'null') {
                try {
                    const response = await api.get('/auth/me');
                    setUser(response.data.data);
                } catch (error) {
                    console.error('Failed to restore session', error);
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = (accessToken: string, userData: User) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error', error);
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            setUser(null);
            window.location.href = '/login';
        }
    };

    const updateUser = (userData: User) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
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
