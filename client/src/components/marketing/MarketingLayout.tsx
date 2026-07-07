import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type NavItem = { label: string; href: string; router?: boolean };

const NAV: NavItem[] = [
    { label: 'Features', href: '/#features' },
    { label: 'How it works', href: '/#how' },
    { label: 'FAQ', href: '/faq', router: true },
    { label: 'About', href: '/about', router: true },
    { label: 'Contact', href: '/contact', router: true },
];

const NavLink: React.FC<{ item: NavItem; onClick?: () => void; className?: string }> = ({
    item,
    onClick,
    className,
}) => {
    const base =
        'font-lexend text-sm font-medium text-[#3a2727] transition-colors hover:text-primary dark:text-gray-300 dark:hover:text-secondary';
    return item.router ? (
        <Link to={item.href} onClick={onClick} className={`${base} ${className ?? ''}`}>
            {item.label}
        </Link>
    ) : (
        <a href={item.href} onClick={onClick} className={`${base} ${className ?? ''}`}>
            {item.label}
        </a>
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
                Digital Guide to Excellence
            </span>
        </div>
    </Link>
);

const MarketingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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
                <div className={`fixed inset-0 z-[100] lg:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeMenu} />
                    <div
                        className={`fixed right-0 top-0 h-full w-72 bg-[#F7F4EE] p-6 shadow-xl transition-transform duration-300 dark:bg-background-dark ${
                            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
                        }`}
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
                        </nav>
                    </div>
                </div>

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
                                    @cnu.edu.ph accounts · admin-approved
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
