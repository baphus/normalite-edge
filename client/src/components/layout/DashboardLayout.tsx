import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PageGuideOverlay from './PageGuideOverlay';
import { useAuth } from '@/contexts/AuthContext';

const DashboardLayout: React.FC = () => {
    const { user } = useAuth();
    const showGuideOverlay = user?.role === 'REVIEWEE';

    return (
        <div className="flex min-h-screen items-start bg-[#f4f5f7] font-lexend">
            <Sidebar />
            <main className="min-w-0 flex-1">
                <div data-guide="page-content" className="w-full max-w-screen-2xl mx-auto px-5 py-4">
                    <Outlet />
                </div>
            </main>
            {showGuideOverlay ? <PageGuideOverlay /> : null}
        </div>
    );
};

export default DashboardLayout;
