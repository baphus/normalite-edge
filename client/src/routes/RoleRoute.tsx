import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RoleRouteProps {
    allowedRoles: Array<'ADMIN' | 'REVIEWER' | 'REVIEWEE'>;
}

const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
    const { user } = useAuth();
    const normalizedRole = (user?.role || '').trim().toUpperCase() as 'ADMIN' | 'REVIEWER' | 'REVIEWEE';

    if (!user || !allowedRoles.includes(normalizedRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default RoleRoute;
