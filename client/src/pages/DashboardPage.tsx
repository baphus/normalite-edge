import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import RevieweeDashboard from './dashboards/RevieweeDashboard';
import ReviewerDashboard from './dashboards/ReviewerDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/dashboard/stats');
                setStats(response.data.data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
                    <Skeleton className="h-96 rounded-xl" />
                </div>
            </div>
        );
    }

    switch (user?.role) {
        case 'ADMIN':
            return <AdminDashboard stats={stats} />;
        case 'REVIEWER':
            return <ReviewerDashboard stats={stats} />;
        case 'REVIEWEE':
        default:
            return <RevieweeDashboard stats={stats} />;
    }
};

export default DashboardPage;
