import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RoleRouteProps {
    allowedRoles: string[];
}

const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
    const { user } = useAuth();

    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default RoleRoute;
