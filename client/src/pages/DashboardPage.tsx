import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import RevieweeDashboard from './dashboards/RevieweeDashboard';
import ManagementDashboard from './dashboards/ManagementDashboard';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { stats, loading } = useDashboardStats(user?.id);

    if (loading) {
        return (
            <div className="flex flex-col gap-5 pb-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-9 w-32" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                    <Skeleton className="h-80 xl:col-span-3 rounded-xl" />
                    <Skeleton className="h-80 xl:col-span-2 rounded-xl" />
                </div>
            </div>
        );
    }

    switch (user?.role) {
        case 'ADMIN':
            return <ManagementDashboard stats={stats} role="ADMIN" displayName={user?.name || 'Admin'} firstName={user?.name?.split(' ')[0] || 'Admin'} profilePicture={user?.picture} />;
        case 'REVIEWER':
            return <ManagementDashboard stats={stats} role="REVIEWER" displayName={user?.name || 'Reviewer'} firstName={user?.name?.split(' ')[0] || 'Reviewer'} profilePicture={user?.picture} />;
        case 'REVIEWEE':
        default:
            return <RevieweeDashboard stats={stats} />;
    }
};

export default DashboardPage;
