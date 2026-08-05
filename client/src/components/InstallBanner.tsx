import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VISITS_KEY = 'pwa-visits';
const DISMISSED_KEY = 'pwa-dismissed';
const PROMPT_THRESHOLD = 3;

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const readVisits = (): number => {
    const raw = window.localStorage.getItem(VISITS_KEY);
    const value = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
};

const isStandalone = (): boolean => {
    try {
        if (
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(display-mode: standalone)').matches
        ) {
            return true;
        }
    } catch {
        // matchMedia unavailable (e.g. jsdom) — treat as not installed
    }

    if (typeof window.navigator !== 'undefined' && 'standalone' in window.navigator) {
        return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    }

    return false;
};

const InstallBanner: FC = () => {
    // Increment the visit counter on mount (unless the app is already installed).
    // Computed in the state initializer so StrictMode double-renders stay idempotent.
    const [visits] = useState<number>(() => {
        if (isStandalone()) {
            return readVisits();
        }
        return readVisits() + 1;
    });
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showFallback, setShowFallback] = useState(false);
    const [dismissed, setDismissed] = useState(
        () => window.localStorage.getItem(DISMISSED_KEY) === 'true',
    );
    const [installed, setInstalled] = useState<boolean>(isStandalone);

    useEffect(() => {
        if (isStandalone()) {
            return;
        }
        window.localStorage.setItem(VISITS_KEY, String(visits));
    }, [visits]);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            setInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            if (deferredPrompt.userChoice) {
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    setInstalled(true);
                }
            }
            setDeferredPrompt(null);
            return;
        }

        setShowFallback(true);
    };

    const handleDismiss = () => {
        window.localStorage.setItem(DISMISSED_KEY, 'true');
        setDismissed(true);
    };

    if (dismissed || installed || visits < PROMPT_THRESHOLD) {
        return null;
    }

    return (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
            <div className="flex w-full max-w-lg items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg dark:bg-slate-800">
                <p className="min-w-0 truncate text-sm font-semibold">Install Normalite EDGE</p>
                {showFallback ? (
                    <p className="shrink-0 text-xs text-slate-300">
                        Use your browser&apos;s menu to install
                    </p>
                ) : (
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleInstall()}
                        className="shrink-0 bg-white text-slate-900 hover:bg-slate-100"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Install
                    </Button>
                )}
                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss install prompt"
                    className="shrink-0 rounded-md p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default InstallBanner;
