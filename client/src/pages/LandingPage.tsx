import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div className="font-display bg-background-light dark:bg-background-dark text-[#1d0c0c] dark:text-white antialiased">
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
                {/* Header */}
                <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#e5e7eb] bg-background-light px-3 py-2 md:px-8 dark:border-b-gray-800">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-sm md:h-12 md:w-12">
                            <img
                                src="/NormaliteEdgeLogo.png"
                                alt="Normalite EDGE logo mark"
                                className="h-full w-auto max-w-none object-cover object-left"
                            />
                        </div>
                        <div className="flex flex-col leading-tight">
                            <h2 className="text-primary text-base font-extrabold tracking-tight md:text-2xl md:leading-none">Normalite EDGE</h2>
                            <p className="text-primary/90 text-[10px] font-medium md:text-sm">Everyday Digital Guide to Excellence</p>
                        </div>
                    </div>
                    <div className="hidden flex-1 justify-end gap-8 md:flex">
                        <div className="flex items-center gap-9">
                            <a className="text-[#1d0c0c] dark:text-gray-200 text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Home</a>
                            <a className="text-[#1d0c0c] dark:text-gray-200 text-sm font-medium leading-normal hover:text-primary transition-colors" href="#features">Features</a>
                            <a className="text-[#1d0c0c] dark:text-gray-200 text-sm font-medium leading-normal hover:text-primary transition-colors" href="#testimonials">Reviewee Journey</a>
                        </div>
                        <button
                            className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#600000] transition-colors shadow-md shadow-primary/20"
                            onClick={() => navigate('/login')}
                        >
                            <span className="truncate">Login</span>
                        </button>
                    </div>
                    <button className="md:hidden text-[#1d0c0c] dark:text-white" onClick={toggleMenu}>
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </header>

                {/* Mobile Menu */}
                <div className={`fixed inset-0 z-[100] ${isMenuOpen ? 'block' : 'hidden'}`}>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={toggleMenu}></div>
                    <div className={`fixed right-0 top-0 h-full w-64 bg-background-light dark:bg-background-dark p-6 shadow-xl transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="flex flex-col gap-6">
                            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-800 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 overflow-hidden rounded-sm">
                                        <img
                                            src="/NormaliteEdgeLogo.png"
                                            alt="Normalite EDGE logo mark"
                                            className="h-full w-auto max-w-none object-cover object-left"
                                        />
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-primary text-xs font-bold">Normalite EDGE</span>
                                        <span className="text-primary/90 text-[9px]">Everyday Digital Guide to Excellence</span>
                                    </div>
                                </div>
                                <button className="text-[#1d0c0c] dark:text-white" onClick={toggleMenu}>
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <nav className="flex flex-col gap-4">
                                <a className="text-[#1d0c0c] dark:text-white text-lg font-medium hover:text-primary transition-colors" href="#" onClick={toggleMenu}>Home</a>
                                <a className="text-[#1d0c0c] dark:text-white text-lg font-medium hover:text-primary transition-colors" href="#features" onClick={toggleMenu}>Features</a>
                                <a className="text-[#1d0c0c] dark:text-white text-lg font-medium hover:text-primary transition-colors" href="#testimonials" onClick={toggleMenu}>Reviewee Journey</a>
                                <hr className="border-gray-200 dark:border-gray-800 my-2" />
                                <button
                                    className="flex w-full cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold shadow-md"
                                    onClick={() => { navigate('/login'); toggleMenu(); }}
                                >
                                    <span className="truncate">Login</span>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>

                {/* Hero Section */}
                <div className="relative w-full">
                    <div className="absolute inset-0 z-0">
                        <div
                            className="h-full w-full bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBRR9ik7du_NN8BbhtzHgmEFdhEHHeTgNy3cjFn5wc_jkOz-DyKEK0AIWtwt7eZ94ewuUkYZnauRden46dcPtskCS-idsL1gtyT_pDO5L7nfb4loDomydtkseoggtMqYofqbSaaO2mbAX55oC73yjWODFtUhFvGxez8zYKcp84AkYgzV9N7Val59FVsTgdLanh7_8mQOQBSJ-CpRNhapJAQ3uDP_hvUddV78bfd9MbjLFzUssku_cO_N-TUvosJrdLyAeNPAKFjpIhs")' }}
                        >
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40 mix-blend-multiply"></div>
                        <div className="absolute inset-0 bg-black/30"></div>
                    </div>
                    <div className="relative z-10 flex min-h-[600px] items-center justify-center px-4 py-20">
                        <div className="flex max-w-[960px] flex-col items-center gap-8 text-center">
                            <div className="flex flex-col gap-4">
                                <span className="mx-auto w-fit rounded-full bg-secondary/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary ring-1 ring-secondary/50 backdrop-blur-sm">
                                    For CNU Reviewees
                                </span>
                                <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] md:text-6xl drop-shadow-sm">
                                    Prepare smarter for the LET with <span className="text-secondary">Normalite EDGE</span>
                                </h1>
                                <h2 className="text-gray-100 text-lg font-normal leading-relaxed md:text-xl max-w-2xl mx-auto">
                                    Access study materials, take timed mock exams with rationalizations, resume auto-saved attempts, and join conferences based on your program track. Self-registration is for <span className="font-semibold">@cnu.edu.ph</span> accounts.
                                </h2>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    className="flex min-w-[160px] cursor-pointer items-center justify-center rounded-lg h-12 px-8 bg-secondary text-primary text-base font-bold leading-normal hover:bg-[#ffe033] transition-transform hover:-translate-y-0.5 shadow-lg shadow-secondary/20"
                                    onClick={() => navigate('/register')}
                                >
                                    <span className="truncate">Get Started</span>
                                </button>
                                <button
                                    className="flex min-w-[160px] cursor-pointer items-center justify-center rounded-lg h-12 px-8 bg-white/10 backdrop-blur-sm border border-white/30 text-white text-base font-bold leading-normal hover:bg-white/20 transition-colors"
                                    onClick={() => navigate('/login')}
                                >
                                    <span className="truncate">Login</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="flex flex-col items-center justify-center py-20 bg-background-light dark:bg-background-dark" id="features">
                    <div className="layout-content-container flex flex-col max-w-[960px] w-full px-6">
                        <div className="mb-16 flex flex-col gap-3 text-center">
                            <h2 className="text-primary text-sm font-bold uppercase tracking-[0.2em]">Built for Reviewees</h2>
                            <h3 className="text-[#1d0c0c] dark:text-white text-3xl font-extrabold leading-tight md:text-4xl">
                                Everything you need to prepare and pass
                            </h3>
                            <div className="h-1 w-20 bg-secondary mx-auto mt-2"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="group flex flex-col items-center text-center gap-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#2a1212] p-8 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="flex size-16 items-center justify-center rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-3xl">edit_note</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h4 className="text-[#1d0c0c] dark:text-white text-xl font-bold">Timed Mock Exams</h4>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                        Take exams with multiple sections and clear rationalizations to strengthen your test strategy.
                                    </p>
                                </div>
                            </div>
                            <div className="group flex flex-col items-center text-center gap-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#2a1212] p-8 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="flex size-16 items-center justify-center rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-3xl">auto_stories</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h4 className="text-[#1d0c0c] dark:text-white text-xl font-bold">Autosave + Resume</h4>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                        Continue where you left off after interruptions with automatic saving and resume support.
                                    </p>
                                </div>
                            </div>
                            <div className="group flex flex-col items-center text-center gap-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#2a1212] p-8 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="flex size-16 items-center justify-center rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                    <span className="material-symbols-outlined text-3xl">insights</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h4 className="text-[#1d0c0c] dark:text-white text-xl font-bold">Materials, Conferences, Results</h4>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                        Access program-track materials, join conference links, and view your own exam performance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Testimonials Section */}
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1a0a0a]" id="testimonials">
                    <div className="layout-content-container flex flex-col max-w-[960px] w-full px-6">
                        <div className="mb-12 text-center">
                            <h2 className="text-[#1d0c0c] dark:text-white text-3xl font-bold leading-tight tracking-[-0.015em]">Reviewee Success Stories</h2>
                            <p className="mt-4 text-gray-600 dark:text-gray-400">See how fellow reviewees stayed consistent and exam-ready.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="flex flex-col justify-between rounded-xl bg-background-light dark:bg-[#230f0f] p-6 border border-gray-100 dark:border-gray-800">
                                <div>
                                    <div className="flex gap-1 mb-4 text-secondary">
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                    </div>
                                    <p className="text-[#1d0c0c] dark:text-gray-200 text-sm italic leading-relaxed">
                                        "The adaptive exams were a game changer. I felt so prepared walking into the testing center. This portal helped me top the boards!"
                                    </p>
                                </div>
                                <div className="mt-6 flex items-center gap-3">
                                    <div
                                        className="h-10 w-10 overflow-hidden rounded-full bg-gray-200 bg-cover bg-center"
                                        style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAKn061WQl7nb2w-pA7CxNk32iNmnmhhkcfTVBvVr8Fi7sknyMzZn4FrCaomPqkZmmGcwMGhdyLfje-D9op5qClyPi9lRRwuLpNq_u_kfe0JABnluNSUd3w7l3lj1Rjju9MMxDstBgWdujsEQPYMlltuLvqapq7Vdw9oVs07wtK_N2OvU3w16FgtfLxnPCFuHgrH41Hsb2D5oFa7n7BzVKfxjNUbhOYGH8aovRieI0TiCN77uPUXu5Vh3HlFR_a-TRJKM8bQcXObsQn")' }}
                                    >
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#1d0c0c] dark:text-white">Maria Santos, LPT</p>
                                        <p className="text-xs text-primary font-medium">Top 4, LET 2023</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between rounded-xl bg-background-light dark:bg-[#230f0f] p-6 border border-gray-100 dark:border-gray-800">
                                <div>
                                    <div className="flex gap-1 mb-4 text-secondary">
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                    </div>
                                    <p className="text-[#1d0c0c] dark:text-gray-200 text-sm italic leading-relaxed">
                                        "The review materials helped me master Gen Ed concepts during my commute. Highly recommended for every Normalite."
                                    </p>
                                </div>
                                <div className="mt-6 flex items-center gap-3">
                                    <div
                                        className="h-10 w-10 overflow-hidden rounded-full bg-gray-200 bg-cover bg-center"
                                        style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD4tLIhBtGP40gGIruajYZshf4ajOcCoHxWBysah8GEp8QI6VtHOMomajeJIIAvEHZSoeYVaMDdN6vRwfVj-oaYJUnH4To0NCFzvl1mSOWpD-6xqNHRf0KR0QYxZwGpyzwlCTkL5AZue7wGChbKsGSAoKWkz4-fSoQ1VwsqvJO_5Q2z32xW1vOzzgBEhZr0S1xrv6J1Ey4WWYIMABOS_7GM1P6-JVHOls-l1VrhQPEdEptcosqUaSRSInadrjYeIcSiye-PvIMy9MW4")' }}
                                    >
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#1d0c0c] dark:text-white">Juan Dela Cruz, LPT</p>
                                        <p className="text-xs text-primary font-medium">BSED Math</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between rounded-xl bg-background-light dark:bg-[#230f0f] p-6 border border-gray-100 dark:border-gray-800">
                                <div>
                                    <div className="flex gap-1 mb-4 text-secondary">
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                                        <span className="material-symbols-outlined text-[20px] fill-current">star_half</span>
                                    </div>
                                    <p className="text-[#1d0c0c] dark:text-gray-200 text-sm italic leading-relaxed">
                                        "The analytics showed me exactly where I was weak in Prof Ed. I focused my review there and it paid off big time."
                                    </p>
                                </div>
                                <div className="mt-6 flex items-center gap-3">
                                    <div
                                        className="h-10 w-10 overflow-hidden rounded-full bg-gray-200 bg-cover bg-center"
                                        style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDoJ6rrB8dp2GuOiA_5S7dZNqeYUZk_4YirEaoijgK-Zf5fsAk7pSl16uAYs1niySSQdCI9oQ-TAf0vSGMyCoY85pimHyjXydF2AzcbhUEZCqtasqS2EkNvX5L_yrngqvpjN-Xd8R3ZPQnMg4c0MOgkg_c455RPgvs-Eb-bIpUY4cOmSMRXdApVV-Wq4M2kPjty93WcsxJnhfJb9Wyu4gM5aX8NaGQBfyIWY5n9ZO0loq47A2_loPs-I65QwdPzxnvWFycsOMch244p")' }}
                                    >
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#1d0c0c] dark:text-white">Anna Reyes, LPT</p>
                                        <p className="text-xs text-primary font-medium">BEED Generalist</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="bg-primary py-16 text-center">
                    <div className="layout-content-container mx-auto flex max-w-[960px] flex-col items-center gap-6 px-6">
                        <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to start your review journey?</h2>
                        <p className="max-w-xl text-lg text-white/90">Register with your CNU account, access your track materials, and begin your LET preparation today.</p>
                        <button
                            className="mt-2 rounded-lg bg-secondary px-8 py-3 text-base font-bold text-primary shadow-lg hover:bg-[#ffe033] transition-colors"
                            onClick={() => navigate('/register')}
                        >
                            I'm In!
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <footer className="bg-background-dark text-white pt-16 pb-8 border-t border-primary/20">
                    <div className="layout-content-container mx-auto max-w-[960px] px-6">
                        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
                            <div className="col-span-1 md:col-span-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-3xl text-primary">school</span>
                                    <h3 className="text-xl font-bold">Normalite EDGE</h3>
                                </div>
                                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                                    The official LET reviewer platform designed exclusively for the students and alumni of Cebu Normal University.
                                </p>
                            </div>
                            <div>
                                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-secondary">Platform</h4>
                                <ul className="flex flex-col gap-2 text-sm text-gray-400">
                                    <li><a className="hover:text-white transition-colors" href="#">Mock Exams</a></li>
                                    <li><a className="hover:text-white transition-colors" href="#">Study Materials</a></li>
                                    <li><a className="hover:text-white transition-colors" href="#">Conferences</a></li>
                                    <li><a className="hover:text-white transition-colors" href="#">My Results</a></li>
                                    <li><a className="hover:text-white transition-colors" href="/login">Login</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-secondary">Contact</h4>
                                <ul className="flex flex-col gap-2 text-sm text-gray-400">
                                    <li>Osmeña Blvd, Cebu City</li>
                                    <li>6000 Philippines</li>
                                    <li>support@cnu.edu.ph</li>
                                    <li className="flex gap-4 mt-2">
                                        <a className="text-gray-400 hover:text-white" href="#"><span className="material-symbols-outlined text-xl">public</span></a>
                                        <a className="text-gray-400 hover:text-white" href="#"><span className="material-symbols-outlined text-xl">mail</span></a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-12 border-t border-gray-800 pt-8 text-center text-xs text-gray-500">
                            <p>© 2024 Cebu Normal University. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
