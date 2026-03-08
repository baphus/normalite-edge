import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.status === 'PENDING') {
        return <Navigate to="/pending" replace />;
    }

    if (user.status === 'DISABLED') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
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
