import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
    const { user, status } = useAuth();
    const location = useLocation();

    if (status === 'loading') {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (status === 'signedOut') {
        return <Navigate to="/login" replace />;
    }

    // Signed in with Supabase but no application account yet — every new user
    // passes through this on their first visit. Sending them to /login would
    // loop, because Google would silently sign them straight back in.
    if (status === 'needsProfile') {
        return <Navigate to="/complete-profile" replace />;
    }

    if (!user || user.status === 'DISABLED') {
        return <Navigate to="/login" replace />;
    }

    const isOnboardingPage = location.pathname === '/onboarding';
    const isReviewee = user.role === 'REVIEWEE';

    if (!isReviewee && isOnboardingPage) {
        return <Navigate to="/dashboard" replace />;
    }

    if (isReviewee && user.isOnboarded === false && !isOnboardingPage) {
        return <Navigate to="/onboarding" replace />;
    }

    if (isReviewee && user.isOnboarded && isOnboardingPage) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
