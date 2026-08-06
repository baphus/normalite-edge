import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useMotionPreference } from '@/contexts/MotionContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

type NavItem = { label: string; href: string; router?: boolean };

const NAV: NavItem[] = [
    { label: 'Features', href: '/#features' },
    { label: 'How it works', href: '/#how' },
    { label: 'FAQ', href: '/faq', router: true },
    { label: 'About', href: '/about', router: true },
    { label: 'Contact', href: '/contact', router: true },
];

const MotionLink = motion.create(Link);
const MotionA = motion.create('a');

const NavLink: React.FC<{ item: NavItem; onClick?: () => void; className?: string }> = ({
    item,
    onClick,
    className,
}) => {
    const base =
        'font-lexend text-sm font-medium text-[#3a2727] transition-colors hover:text-primary dark:text-gray-300 dark:hover:text-secondary';

    return item.router ? (
        <MotionLink
            to={item.href}
            onClick={onClick}
            className={`${base} ${className ?? ''}`}
            whileHover={{ y: -1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
            {item.label}
        </MotionLink>
    ) : (
        <MotionA
            href={item.href}
            onClick={onClick}
            className={`${base} ${className ?? ''}`}
            whileHover={{ y: -1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
            {item.label}
        </MotionA>
    );
};

const Wordmark: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
    <Link to="/" className="flex items-center gap-2.5 md:gap-3">
        <div
            className={`overflow-hidden rounded-sm ${size === 'md' ? 'h-10 w-10 md:h-11 md:w-11' : 'h-8 w-8'}`}
        >
            <img
                src="/NormaliteEdgeLogo.png"
                alt="Normalite EDGE logo"
                className="h-full w-auto max-w-none object-cover object-left"
            />
        </div>
        <div className="flex flex-col leading-tight">
            <span
                className={`font-serif font-semibold tracking-tight text-primary dark:text-secondary ${
                    size === 'md' ? 'text-lg md:text-xl' : 'text-sm'
                }`}
            >
                Normalite EDGE
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary/70 dark:text-secondary/70">
                Everyday Digital Guide to Excellence
            </span>
        </div>
    </Link>
);

const MarketingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const { user, status, logout } = useAuth();
    const { reducedMotion } = useMotionPreference();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <div className="min-h-screen bg-[#F7F4EE] font-lexend text-[#1A0E0E] antialiased dark:bg-background-dark dark:text-gray-100">
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
                {/* Header */}
                <header className="sticky top-0 z-50 border-b border-[#e6ddd3] bg-[#F7F4EE]/85 backdrop-blur-md dark:border-white/10 dark:bg-background-dark/85">
                    <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-3 md:px-8">
                        <Wordmark />
                        <nav className="hidden items-center gap-8 lg:flex">
                            {NAV.map((item) => (
                                <NavLink key={item.label} item={item} />
                            ))}
                        </nav>
                        <div className="hidden items-center gap-3 lg:flex">
                            {status === 'ready' && user ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setProfileOpen(!profileOpen)}
                                        className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                                        aria-label="Open profile menu"
                                    >
                                        {user.picture ? (
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={user.picture} alt={user.name} className="object-cover" />
                                                <AvatarFallback className="bg-primary text-xs text-white">
                                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                                                {user.firstName?.[0]}{user.lastName?.[0]}
                                            </div>
                                        )}
                                        <svg
                                            className={`h-4 w-4 text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {profileOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                                            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-background-dark">
                                                <div className="px-4 py-3">
                                                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                                                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                                                </div>
                                                <hr className="border-gray-100 dark:border-white/10" />
                                                <Link
                                                    to="/dashboard"
                                                    onClick={() => setProfileOpen(false)}
                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">dashboard</span>
                                                    Dashboard
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        setProfileOpen(false);
                                                        logout();
                                                    }}
                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">logout</span>
                                                    Sign out
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="font-lexend text-sm font-semibold text-primary transition-colors hover:text-[#5a1010] dark:text-secondary"
                                    >
                                        Log in
                                    </button>
                                    <button
                                        onClick={() => navigate('/register')}
                                        className="rounded-lg bg-primary px-5 py-2.5 font-lexend text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#5a1010]"
                                    >
                                        Register
                                    </button>
                                </>
                            )}
                        </div>
                        <button
                            className="text-[#1A0E0E] lg:hidden dark:text-white"
                            onClick={() => setIsMenuOpen(true)}
                            aria-label="Open menu"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    </div>
                </header>

                {/* Mobile menu */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <>
                            <motion.div
                                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm lg:hidden"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: reducedMotion ? 0 : 0.2 }}
                                onClick={closeMenu}
                            />
                            <motion.div
                                className="fixed right-0 top-0 z-[100] h-full w-72 bg-[#F7F4EE] p-6 shadow-xl dark:bg-background-dark lg:hidden"
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={
                                    reducedMotion
                                        ? { duration: 0 }
                                        : { type: 'spring', stiffness: 380, damping: 30 }
                                }
                            >
                                <div className="mb-6 flex items-center justify-between border-b border-[#e6ddd3] pb-4 dark:border-white/10">
                                    <Wordmark size="sm" />
                                    <button onClick={closeMenu} aria-label="Close menu" className="dark:text-white">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <nav className="flex flex-col gap-5">
                                    {NAV.map((item) => (
                                        <NavLink key={item.label} item={item} onClick={closeMenu} className="text-lg" />
                                    ))}
                                    <hr className="border-[#e6ddd3] dark:border-white/10" />
                                    {status === 'ready' && user ? (
                                        <>
                                            <div className="flex items-center gap-3 rounded-lg bg-primary/5 px-3 py-3 dark:bg-white/5">
                                                {user.picture ? (
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={user.picture} alt={user.name} className="object-cover" />
                                                        <AvatarFallback className="bg-primary text-sm text-white">
                                                            {user.firstName?.[0]}{user.lastName?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ) : (
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-[#3a2727] dark:text-white">{user.name}</p>
                                                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigate('/dashboard');
                                                    closeMenu();
                                                }}
                                                className="rounded-lg bg-primary py-3 font-semibold text-white"
                                            >
                                                Go to Dashboard
                                            </button>
                                            <button
                                                onClick={() => {
                                                    closeMenu();
                                                    logout();
                                                }}
                                                className="rounded-lg border border-primary/30 py-3 font-semibold text-primary dark:border-secondary/40 dark:text-secondary"
                                            >
                                                Sign out
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    navigate('/login');
                                                    closeMenu();
                                                }}
                                                className="rounded-lg border border-primary/30 py-3 font-semibold text-primary dark:border-secondary/40 dark:text-secondary"
                                            >
                                                Log in
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigate('/register');
                                                    closeMenu();
                                                }}
                                                className="rounded-lg bg-primary py-3 font-semibold text-white"
                                            >
                                                Register
                                            </button>
                                        </>
                                    )}
                                </nav>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Page content */}
                <main className="flex-1">{children}</main>

                {/* Footer */}
                <footer className="border-t border-primary/20 bg-[#1A0E0E] pt-16 pb-8 text-white">
                    <div className="mx-auto max-w-[1200px] px-6">
                        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">
                            <div className="col-span-2 lg:col-span-2">
                                <div className="mb-4 flex items-center gap-2.5">
                                    <div className="h-9 w-9 overflow-hidden rounded-sm">
                                        <img
                                            src="/NormaliteEdgeLogo.png"
                                            alt="Normalite EDGE logo"
                                            className="h-full w-auto max-w-none object-cover object-left"
                                        />
                                    </div>
                                    <span className="font-serif text-lg font-semibold">Normalite EDGE</span>
                                </div>
                                <p className="max-w-xs text-sm leading-relaxed text-gray-400">
                                    A Licensure Examination for Teachers review platform built for the reviewees of
                                    Cebu Normal University. Study, take mock exams, and track your readiness in one
                                    place.
                                </p>
                                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-secondary/80">
                                    @cnu.edu.ph accounts · Google sign-in
                                </p>
                            </div>

                            <div>
                                <h4 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-secondary">
                                    Platform
                                </h4>
                                <ul className="flex flex-col gap-2.5 text-sm text-gray-400">
                                    <li><a className="transition-colors hover:text-white" href="/#features">Features</a></li>
                                    <li><a className="transition-colors hover:text-white" href="/#how">How it works</a></li>
                                    <li><Link className="transition-colors hover:text-white" to="/login">Log in</Link></li>
                                    <li><Link className="transition-colors hover:text-white" to="/register">Register</Link></li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-secondary">
                                    Company
                                </h4>
                                <ul className="flex flex-col gap-2.5 text-sm text-gray-400">
                                    <li><Link className="transition-colors hover:text-white" to="/about">About</Link></li>
                                    <li><Link className="transition-colors hover:text-white" to="/faq">FAQ</Link></li>
                                    <li><Link className="transition-colors hover:text-white" to="/contact">Contact</Link></li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-secondary">
                                    Legal
                                </h4>
                                <ul className="flex flex-col gap-2.5 text-sm text-gray-400">
                                    <li><Link className="transition-colors hover:text-white" to="/privacy">Privacy Policy</Link></li>
                                    <li><Link className="transition-colors hover:text-white" to="/terms">Terms &amp; Conditions</Link></li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-8 text-center font-mono text-[11px] tracking-wide text-gray-400 md:flex-row md:justify-between md:text-left">
                            <p>© 2026 Cebu Normal University · Normalite EDGE. All rights reserved.</p>
                            <p>Osmeña Blvd, Cebu City 6000, Philippines</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default MarketingLayout;
