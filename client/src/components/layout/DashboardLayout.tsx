import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-lexend">
            {/* Sidebar - Fixed on desktop */}
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-y-auto">
                <div className="container mx-auto p-6 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
