import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import PageGuideOverlay from './PageGuideOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const DashboardLayout: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const showGuideOverlay = user?.role === 'REVIEWEE';
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!isMobileSidebarOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMobileSidebarOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileSidebarOpen]);

    return (
        <div className="flex h-dvh items-stretch overflow-hidden bg-[#f4f5f7] font-lexend">
            {showGuideOverlay ? (
                <>
                    <div className="hidden lg:flex">
                        <Sidebar />
                    </div>
                    <Sidebar
                        isMobile
                        isOpen={isMobileSidebarOpen}
                        onClose={() => setIsMobileSidebarOpen(false)}
                    />
                    {isMobileSidebarOpen && (
                        <button
                            type="button"
                            aria-label="Close navigation menu"
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] lg:hidden"
                        />
                    )}
                </>
            ) : (
                <Sidebar />
            )}
            <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
                {showGuideOverlay && (
                    <div className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur lg:hidden">
                        <div className="mx-auto flex h-13 w-full max-w-screen-2xl items-center justify-between px-3 sm:px-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg"
                                aria-label="Open navigation menu"
                                onClick={() => setIsMobileSidebarOpen(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            <span className="text-sm font-bold tracking-tight text-gray-900">Normalite EDGE</span>
                            <span className="w-9" aria-hidden="true" />
                        </div>
                    </div>
                )}
                <div data-guide="page-content" className="w-full max-w-screen-2xl mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
                    <Outlet />
                </div>
            </main>
            {showGuideOverlay ? <PageGuideOverlay /> : null}
        </div>
    );
};

export default DashboardLayout;
