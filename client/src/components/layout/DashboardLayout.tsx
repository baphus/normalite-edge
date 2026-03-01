import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

const DashboardLayout: React.FC = () => {
    const { user } = useAuth();
    const isStaff = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-lexend">
            {/* Sidebar - Fixed on desktop */}
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-y-auto">
                <div className={`w-full mx-auto ${isStaff ? 'max-w-screen-2xl px-4 py-4 md:px-5 md:py-5' : 'max-w-screen-2xl px-5 py-5 md:px-6 md:py-6'}`}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
