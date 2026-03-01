import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout: React.FC = () => {
    return (
        <div className="flex h-screen bg-[#f4f5f7] overflow-hidden font-lexend">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
                <div className="w-full max-w-screen-2xl mx-auto px-5 py-4">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
