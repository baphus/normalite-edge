import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import api from '../lib/axios';
import { supabase, OAUTH_REDIRECT_URL } from '../lib/supabase';
import { formatUserDisplayName } from '../lib/formatUserDisplayName';

export interface User {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    middleInitial?: string;
    suffix?: string;
    role: 'ADMIN' | 'REVIEWER' | 'REVIEWEE';
    status: 'ACTIVE' | 'DISABLED';
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

/**
 * `needsProfile` is the state that did not exist before Supabase: signed in
 * successfully, but with no application account yet. Every new user passes
 * through it on their first visit, so it has to be a first-class state rather
 * than an error.
 */
export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

interface PendingRegistration {
    email: string;
    /** False when the address is outside the institution's Workspace. */
    eligible: boolean;
    firstName: string | null;
    lastName: string | null;
}

interface AuthContextType {
    user: User | null;
    status: AuthStatus;
    /** Retained so existing pages that read `loading` keep working. */
    loading: boolean;
    pending: PendingRegistration | null;
    signInWithGoogle: (redirectPath?: string) => Promise<void>;
    signInWithPassword: (email: string, password: string) => Promise<void>;
    refreshProfile: () => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (userData: User): User => ({
    ...userData,
    name: formatUserDisplayName(userData),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [sessionResolved, setSessionResolved] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [pending, setPending] = useState<PendingRegistration | null>(null);
    const [profileResolved, setProfileResolved] = useState(false);

    // Sign-ins are recorded once per session so a re-render or a token refresh
    // does not produce duplicate audit entries.
    const reportedSessionRef = useRef<string | null>(null);

    useEffect(() => {
        let active = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!active) return;
            setSession(data.session);
            setSessionResolved(true);
        });

        // The callback is kept deliberately trivial: calling back into
        // supabase-js from inside it can deadlock. All the real work happens
        // in the effect below, keyed on the resulting session.
        const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!active) return;
            setSession(nextSession);
            setSessionResolved(true);
        });

        return () => {
            active = false;
            subscription.subscription.unsubscribe();
        };
    }, []);

    const loadProfile = useCallback(async (currentSession: Session | null) => {
        if (!currentSession) {
            setUser(null);
            setPending(null);
            setProfileResolved(true);
            reportedSessionRef.current = null;
            return;
        }

        try {
            const response = await api.get('/auth/me');
            const state = response.data.data;

            if (state.profileComplete) {
                setUser(normalizeUser(state.user as User));
                setPending(null);

                // Authentication happens between the browser and Supabase, so
                // the API never sees it. Reporting it here is what keeps LOGIN
                // events in the application audit log.
                if (reportedSessionRef.current !== currentSession.access_token) {
                    reportedSessionRef.current = currentSession.access_token;
                    api.post('/auth/session-start').catch(() => undefined);
                }
            } else {
                setUser(null);
                setPending({
                    email: state.email,
                    eligible: Boolean(state.eligible),
                    firstName: state.suggested?.firstName ?? null,
                    lastName: state.suggested?.lastName ?? null,
                });
            }
        } catch {
            // A disabled account or an unreachable API. Treat as no profile
            // rather than crashing the tree; the guards send them onward.
            setUser(null);
            setPending(null);
        } finally {
            setProfileResolved(true);
        }
    }, []);

    useEffect(() => {
        if (!sessionResolved) return;
        setProfileResolved(false);
        void loadProfile(session);
    }, [sessionResolved, session?.user?.id, loadProfile]);

    const signInWithGoogle = useCallback(async (redirectPath?: string) => {
        const redirectTo = redirectPath
            ? `${OAUTH_REDIRECT_URL}?next=${encodeURIComponent(redirectPath)}`
            : OAUTH_REDIRECT_URL;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                // A hint for the account chooser only. The actual domain
                // restriction is enforced server-side at profile creation,
                // because this parameter can simply be omitted by anyone
                // crafting the authorization request themselves.
                queryParams: { hd: 'cnu.edu.ph', prompt: 'select_account' },
            },
        });

        if (error) throw new Error(error.message);
    }, []);

    const signInWithPassword = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
    }, []);

    const refreshProfile = useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        await loadProfile(data.session);
    }, [loadProfile]);

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Recording the sign-out is best-effort; never block it.
        } finally {
            await supabase.auth.signOut();
            setUser(null);
            setPending(null);
            reportedSessionRef.current = null;
            window.location.href = '/login';
        }
    }, []);

    const updateUser = useCallback((userData: User) => {
        setUser(normalizeUser(userData));
    }, []);

    const resolved = sessionResolved && profileResolved;
    const status: AuthStatus = !resolved
        ? 'loading'
        : user
            ? 'ready'
            : session
                ? 'needsProfile'
                : 'signedOut';

    return (
        <AuthContext.Provider
            value={{
                user,
                status,
                loading: status === 'loading',
                pending,
                signInWithGoogle,
                signInWithPassword,
                refreshProfile,
                logout,
                updateUser,
            }}
        >
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
