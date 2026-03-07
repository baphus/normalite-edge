import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout: React.FC = () => {
    return (
        <div className="flex min-h-screen items-start bg-[#f4f5f7] font-lexend">
            <Sidebar />
            <main className="min-w-0 flex-1">
                <div className="w-full max-w-screen-2xl mx-auto px-5 py-4">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
