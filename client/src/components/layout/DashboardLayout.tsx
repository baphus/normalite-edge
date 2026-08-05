import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Sidebar from './Sidebar';
import BottomTabBar from '@/components/nav/BottomTabBar';
import PageGuideOverlay from './PageGuideOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { useMotionPreference } from '@/contexts/MotionContext';

const DashboardLayout: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const { reducedMotion: shouldReduceMotion } = useMotionPreference();
    const showGuideOverlay = user?.role === 'REVIEWEE';

    return (
        <div className="flex h-dvh items-stretch overflow-hidden bg-slate-50 dark:bg-slate-900 font-lexend">
            {/* ── Desktop sidebar (lg+) ── */}
            <div className="hidden lg:flex">
                <Sidebar />
            </div>

            {/* ── Main content ── */}
            <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">

                {/* Page content with transition */}
                <div
                    data-guide="page-content"
                    className="w-full max-w-screen-2xl mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5"
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={shouldReduceMotion ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={shouldReduceMotion ? {} : { opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* ── Mobile bottom tab bar (below lg, reviewee only) ── */}
            {showGuideOverlay && <BottomTabBar />}

            {/* ── Page guide overlay (reviewee only) ── */}
            {showGuideOverlay ? <PageGuideOverlay /> : null}
        </div>
    );
};

export default DashboardLayout;
