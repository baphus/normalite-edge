import React, { useEffect, useState } from 'react';
import {
    Globe,
    Shield,
    RefreshCw,
    Info,
    ExternalLink,
    LogOut,
    AlertTriangle,
    ChevronRight,
    Loader2,
    Lock,
    ToggleRight,
    MonitorSmartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { toast } from 'sonner';

/* ── Types ── */

type Section = 'security' | 'account' | 'system';

/* ── Google "G" mark ── */

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

/* ══════════════════════════════════════════════════════════════════════════ */

const SettingsPage: React.FC = () => {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [activeSection, setActiveSection] = useState<Section>('security');

    /* ── Sessions state ── */
    const [revokeLoading, setRevokeLoading] = useState(false);

    /* ── Deactivate state ── */
    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [deactivateConfirmText, setDeactivateConfirmText] = useState('');
    const [deactivating, setDeactivating] = useState(false);

    /* ── System settings state ── */
    const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
    const [enforceExamSingleTab, setEnforceExamSingleTab] = useState(false);
    const [tabSwitchGraceSeconds, setTabSwitchGraceSeconds] = useState(5);
    const [systemLoading, setSystemLoading] = useState(false);
    const [systemSaving, setSystemSaving] = useState(false);
    const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<string | null>(null);

    /* ── Fetch system settings (admin only) ── */

    useEffect(() => {
        if (!isAdmin) return;
        const fetchSystemSettings = async () => {
            setSystemLoading(true);
            try {
                const response = await api.get('/settings/system');
                setAllowMultipleAttempts(Boolean(response.data?.data?.allowMultipleAttempts));
                setEnforceExamSingleTab(Boolean(response.data?.data?.enforceExamSingleTab));
                setTabSwitchGraceSeconds(Math.max(1, Math.min(30, Number(response.data?.data?.tabSwitchGraceSeconds || 5))));
                setSettingsUpdatedAt(response.data?.data?.updatedAt || null);
            } catch (error) {
                console.error('Failed to fetch system settings', error);
            } finally {
                setSystemLoading(false);
            }
        };
        void fetchSystemSettings();
    }, [isAdmin]);

    /* ── Security: revoke other sessions ── */

    const handleRevokeOthers = async () => {
        setRevokeLoading(true);
        try {
            await api.post('/auth/sessions/revoke-others');
            toast.success('Signed out of all other devices.');
        } catch (error: unknown) {
            const serverMessage =
                error && typeof error === 'object' && 'response' in error
                    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(serverMessage || 'Failed to sign out other sessions. Please try again.');
        } finally {
            setRevokeLoading(false);
        }
    };

    /* ── Account: deactivate ── */

    const handleDeactivate = async () => {
        setDeactivating(true);
        try {
            await api.patch('/auth/me/deactivate');
            await logout();
        } catch (error: unknown) {
            const serverMessage =
                error && typeof error === 'object' && 'response' in error
                    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(serverMessage || 'Failed to deactivate account. Please try again.');
        } finally {
            setDeactivating(false);
        }
    };

    /* ── System settings handlers (verbatim) ── */

    const handleToggleMultipleAttempts = async (checked: boolean) => {
        const previousValue = allowMultipleAttempts;
        setAllowMultipleAttempts(checked);
        setSystemSaving(true);
        try {
            const response = await api.patch('/settings/system', {
                allowMultipleAttempts: checked,
                enforceExamSingleTab,
                tabSwitchGraceSeconds,
            });
            setAllowMultipleAttempts(Boolean(response.data?.data?.allowMultipleAttempts));
            setEnforceExamSingleTab(Boolean(response.data?.data?.enforceExamSingleTab));
            setTabSwitchGraceSeconds(Math.max(1, Math.min(30, Number(response.data?.data?.tabSwitchGraceSeconds || 5))));
            setSettingsUpdatedAt(response.data?.data?.updatedAt || null);
            toast.success(checked ? 'Multiple attempts enabled.' : 'Multiple attempts disabled.');
        } catch (error) {
            console.error('Failed to update multiple attempts setting', error);
            setAllowMultipleAttempts(previousValue);
            toast.error('Failed to update multiple attempts setting. Please try again.');
        } finally {
            setSystemSaving(false);
        }
    };

    const handleToggleEnforceExamSingleTab = async (checked: boolean) => {
        const previousValue = enforceExamSingleTab;
        setEnforceExamSingleTab(checked);
        setSystemSaving(true);
        try {
            const response = await api.patch('/settings/system', {
                allowMultipleAttempts,
                enforceExamSingleTab: checked,
                tabSwitchGraceSeconds,
            });
            setAllowMultipleAttempts(Boolean(response.data?.data?.allowMultipleAttempts));
            setEnforceExamSingleTab(Boolean(response.data?.data?.enforceExamSingleTab));
            setTabSwitchGraceSeconds(Math.max(1, Math.min(30, Number(response.data?.data?.tabSwitchGraceSeconds || 5))));
            setSettingsUpdatedAt(response.data?.data?.updatedAt || null);
            toast.success(checked ? 'Exam focus lock enabled.' : 'Exam focus lock disabled.');
        } catch (error) {
            console.error('Failed to update exam focus lock setting', error);
            setEnforceExamSingleTab(previousValue);
            toast.error('Failed to update exam focus lock setting. Please try again.');
        } finally {
            setSystemSaving(false);
        }
    };

    const handleTabSwitchGraceSecondsChange = (raw: string) => {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return;
        setTabSwitchGraceSeconds(Math.max(1, Math.min(30, Math.round(parsed))));
    };

    const handleTabSwitchGraceSecondsBlur = async () => {
        setSystemSaving(true);
        try {
            const response = await api.patch('/settings/system', {
                allowMultipleAttempts,
                enforceExamSingleTab,
                tabSwitchGraceSeconds,
            });
            setAllowMultipleAttempts(Boolean(response.data?.data?.allowMultipleAttempts));
            setEnforceExamSingleTab(Boolean(response.data?.data?.enforceExamSingleTab));
            setTabSwitchGraceSeconds(Math.max(1, Math.min(30, Number(response.data?.data?.tabSwitchGraceSeconds || 5))));
            setSettingsUpdatedAt(response.data?.data?.updatedAt || null);
            toast.success('Tab switch countdown updated.');
        } catch (error) {
            console.error('Failed to update tab switch countdown', error);
            toast.error('Failed to update tab switch countdown. Please try again.');
        } finally {
            setSystemSaving(false);
        }
    };

    /* ── Role badge ── */

    const roleBadgeConfig: Record<string, { label: string; className: string }> = {
        ADMIN: { label: 'Administrator', className: 'bg-primary/10 text-primary' },
        REVIEWER: { label: 'Reviewer', className: 'bg-indigo-50 text-indigo-600' },
        REVIEWEE: { label: 'Reviewee', className: 'bg-emerald-50 text-emerald-600' },
    };
    const roleBadge = user?.role ? roleBadgeConfig[user.role] : null;

    /* ══════════════════════════════════════════════════════════════════════ */
    /*  Render                                                              */
    /* ══════════════════════════════════════════════════════════════════════ */

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            {/* ── Header ── */}
            <header className="rounded-xl border border-slate-100 bg-linear-to-br from-white via-white to-slate-50 shadow-sm p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 mb-2">Account Center</p>
                        <h1 className="text-[18px] font-semibold text-slate-900 tracking-tight">Settings</h1>
                        <p className="text-xs text-slate-500 mt-1.5">
                            Manage security preferences, account details, and platform behavior.
                        </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-white flex items-center gap-3 min-w-0 sm:min-w-70">
                        {user?.picture ? (
                            <img
                                src={user.picture}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-base shrink-0">
                                {user?.firstName?.[0] ?? '?'}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                        </div>
                        {roleBadge && (
                            <Badge className={cn('ml-auto shrink-0 border-none font-semibold text-[11px] px-2 py-0.5', roleBadge.className)}>
                                {roleBadge.label}
                            </Badge>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Pill tabs ── */}
            <div className="rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm flex items-center gap-1.5 w-full sm:w-fit">
                <button
                    onClick={() => setActiveSection('security')}
                    className={cn(
                        'h-9 px-4 rounded-lg text-[11px] font-semibold uppercase tracking-[0.06em] transition-all flex items-center gap-2',
                        activeSection === 'security'
                            ? 'bg-primary text-white shadow-sm shadow-primary/20'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    )}
                >
                    <Shield size={14} /> Security &amp; Sign-in
                </button>
                <button
                    onClick={() => setActiveSection('account')}
                    className={cn(
                        'h-9 px-4 rounded-lg text-[11px] font-semibold uppercase tracking-[0.06em] transition-all flex items-center gap-2',
                        activeSection === 'account'
                            ? 'bg-primary text-white shadow-sm shadow-primary/20'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    )}
                >
                    <Lock size={14} /> Account
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveSection('system')}
                        className={cn(
                            'h-9 px-4 rounded-lg text-[11px] font-semibold uppercase tracking-[0.06em] transition-all flex items-center gap-2',
                            activeSection === 'system'
                                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        )}
                    >
                        <Globe size={14} /> System
                    </button>
                )}
            </div>

            {/* ── Tab content ── */}
            <div>
                {/* ═══ TAB 1: SECURITY & SIGN-IN ═══ */}
                {activeSection === 'security' && (
                    <div className="animate-in fade-in-0 slide-in-from-right-2 duration-300 space-y-3">
                        <SectionHeader
                            icon={<Shield size={18} />}
                            title="Security &amp; Sign-in"
                            description="Your sign-in method, sessions, and security guidance."
                        />

                        {/* ── Connected account card ── */}
                        <Card className="rounded-xl border-slate-100 shadow-sm overflow-hidden bg-white">
                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Connected account</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        You sign in with Google. Password changes and 2-step verification are managed through your Google account.
                                    </p>
                                </div>

                                <div className="border-t border-slate-100" />

                                <div className="flex items-center gap-3">
                                    {user?.picture ? (
                                        <img src={user.picture} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-sm shrink-0">
                                            {user?.firstName?.[0] ?? '?'}
                                        </div>
                                    )}
                                    <GoogleIcon className="w-5 h-5 shrink-0" />
                                    <p className="text-sm font-medium text-slate-900 truncate min-w-0">{user?.email}</p>
                                </div>

                                <a
                                    href="https://myaccount.google.com/security"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                                >
                                    Manage Google account security <ExternalLink size={12} />
                                </a>
                            </CardContent>
                        </Card>

                        {/* ── Sessions card ── */}
                        <Card className="rounded-xl border-slate-100 shadow-sm overflow-hidden bg-white">
                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Sessions</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Your current session stays signed in. Other sessions are signed out immediately.
                                    </p>
                                </div>

                                <div className="border-t border-slate-100" />

                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900">Sign out of all other devices</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Forcefully end every other active session.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => void handleRevokeOthers()}
                                        disabled={revokeLoading}
                                        className="shrink-0 h-9 rounded-lg px-4 text-xs font-semibold border-slate-200 gap-1.5"
                                    >
                                        {revokeLoading ? (
                                            <>
                                                <Loader2 size={13} className="animate-spin" /> Signing out…
                                            </>
                                        ) : (
                                            <>
                                                <LogOut size={13} /> Sign out all other devices
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Security tips card ── */}
                        <Card className="rounded-xl border-slate-100 shadow-sm overflow-hidden bg-white">
                            <CardContent className="p-5 space-y-4">
                                <p className="text-sm font-semibold text-slate-900">Security tips</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 mb-1">Google account</p>
                                        <p className="text-xs text-slate-600">
                                            Keep your Google account protected with a strong password and two-factor authentication.
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 mb-1">Shared devices</p>
                                        <p className="text-xs text-slate-600">
                                            Always sign out when using a shared or public computer.
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 mb-1">Contact email</p>
                                        <p className="text-xs text-slate-600">
                                            Keep your email up to date so you can recover your account if needed.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ═══ TAB 2: ACCOUNT ═══ */}
                {activeSection === 'account' && (
                    <div className="animate-in fade-in-0 slide-in-from-right-2 duration-300 space-y-3">
                        <SectionHeader
                            icon={<Lock size={18} />}
                            title="Account"
                            description="Your profile details and account management."
                        />

                        {/* ── Profile card ── */}
                        <Card className="rounded-xl border-slate-100 shadow-sm overflow-hidden bg-white">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                    {user?.picture ? (
                                        <img src={user.picture} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                                            {user?.firstName?.[0] ?? '?'}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-900 truncate">
                                            {user?.firstName} {user?.lastName}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                    </div>
                                    {roleBadge && (
                                        <Badge className={cn('shrink-0 border-none font-semibold text-[11px] px-2 py-0.5', roleBadge.className)}>
                                            {roleBadge.label}
                                        </Badge>
                                    )}
                                </div>

                                <div className="border-t border-slate-100" />

                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-xs text-slate-500">
                                        Edit your name, avatar, and school information.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => { window.location.href = '/profile'; }}
                                        className="shrink-0 h-9 rounded-lg px-4 text-xs font-semibold border-slate-200 gap-1.5"
                                    >
                                        Go to profile <ChevronRight size={13} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Danger zone card ── */}
                        <Card className="rounded-xl border-red-200 shadow-sm overflow-hidden bg-white">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={15} className="text-red-500 shrink-0" />
                                    <p className="text-sm font-semibold text-red-700">Danger zone</p>
                                </div>

                                <div className="border-t border-red-100" />

                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900">Deactivate account</p>
                                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                            Deactivating your account will revoke your access immediately. Your data
                                            is retained and an administrator can reactivate your account. This action
                                            cannot be undone by you.
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => { setDeactivateConfirmText(''); setDeactivateOpen(true); }}
                                        className="shrink-0 h-9 rounded-lg px-4 text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                        Deactivate account
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ═══ TAB 3: SYSTEM (ADMIN ONLY) ═══ */}
                {activeSection === 'system' && isAdmin && (
                    <div className="animate-in fade-in-0 slide-in-from-right-2 duration-300 space-y-3">
                        <SectionHeader
                            icon={<Globe size={18} />}
                            title="System settings"
                            description="Global configuration applied across the entire platform."
                            badge={
                                <Badge className="bg-primary/10 text-primary border-none font-semibold text-[11px] px-2.5 py-0.5">
                                    Admin Only
                                </Badge>
                            }
                        />

                        {/* ── Exam Configuration ── */}
                        <Card className="rounded-xl border-slate-100 shadow-sm overflow-hidden bg-white">
                            <CardContent className="p-0">
                                <div className="px-5 py-4 border-b border-slate-100">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Exam Configuration</p>
                                </div>

                                {systemLoading ? (
                                    <div className="p-6 flex items-center gap-3 text-slate-400">
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span className="text-xs font-semibold uppercase tracking-[0.06em]">Loading settings…</span>
                                    </div>
                                ) : (
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-6 pb-5 border-b border-slate-100">
                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <ToggleRight size={15} className="text-slate-400 shrink-0" />
                                                    <p className="text-sm font-semibold text-slate-900">Allow multiple exam attempts</p>
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed pl-5">
                                                    When <strong>disabled</strong>, reviewees may submit each exam only once. When{' '}
                                                    <strong>enabled</strong>, reviewees can retake exams up to the configured limit.
                                                </p>
                                                <div className="flex items-center gap-2 pl-5 pt-1">
                                                    <Badge
                                                        className={cn(
                                                            'border-none font-semibold text-[11px] px-2 py-0.5',
                                                            allowMultipleAttempts
                                                                ? 'bg-emerald-50 text-emerald-600'
                                                                : 'bg-slate-100 text-slate-500',
                                                        )}
                                                    >
                                                        {allowMultipleAttempts ? 'Enabled' : 'Disabled'}
                                                    </Badge>
                                                    {settingsUpdatedAt && (
                                                        <span className="text-[11px] text-slate-400">
                                                            Last updated {new Date(settingsUpdatedAt).toLocaleString()}
                                                        </span>
                                                    )}
                                                    {systemSaving && (
                                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                                            <RefreshCw size={10} className="animate-spin" /> Saving…
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Switch
                                                checked={allowMultipleAttempts}
                                                onCheckedChange={(v) => void handleToggleMultipleAttempts(v)}
                                                disabled={systemLoading || systemSaving}
                                                className="data-[state=checked]:bg-primary shrink-0 mt-1"
                                            />
                                        </div>

                                        <div className="flex items-start justify-between gap-6 pt-5">
                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <MonitorSmartphone size={15} className="text-slate-400 shrink-0" />
                                                    <p className="text-sm font-semibold text-slate-900">Enforce single-tab exam focus</p>
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed pl-5">
                                                    When <strong>enabled</strong>, switching to another browser tab during an exam
                                                    immediately resets the current attempt to the beginning and clears all saved answers.
                                                </p>
                                                <div className="flex items-center gap-2 pl-5 pt-1">
                                                    <Badge
                                                        className={cn(
                                                            'border-none font-semibold text-[11px] px-2 py-0.5',
                                                            enforceExamSingleTab
                                                                ? 'bg-red-50 text-red-600'
                                                                : 'bg-slate-100 text-slate-500',
                                                        )}
                                                    >
                                                        {enforceExamSingleTab ? 'Enabled' : 'Disabled'}
                                                    </Badge>
                                                    {systemSaving && (
                                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                                            <RefreshCw size={10} className="animate-spin" /> Saving…
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Switch
                                                checked={enforceExamSingleTab}
                                                onCheckedChange={(v) => void handleToggleEnforceExamSingleTab(v)}
                                                disabled={systemLoading || systemSaving}
                                                className="data-[state=checked]:bg-red-600 shrink-0 mt-1"
                                            />
                                        </div>

                                        <div className="pt-5 mt-5 border-t border-slate-100">
                                            <div className="space-y-2">
                                                <p className="text-sm font-semibold text-slate-900">Tab switch countdown (seconds)</p>
                                                <p className="text-xs text-slate-500">
                                                    Set how long reviewees have to return to the exam tab before their attempt resets.
                                                </p>
                                                <div className="max-w-45">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={30}
                                                        step={1}
                                                        value={tabSwitchGraceSeconds}
                                                        onChange={(e) => handleTabSwitchGraceSecondsChange(e.target.value)}
                                                        onBlur={() => void handleTabSwitchGraceSecondsBlur()}
                                                        disabled={systemLoading || systemSaving}
                                                        className="h-10 rounded-lg"
                                                    />
                                                </div>
                                                <p className="text-[11px] text-slate-400">Allowed range: 1 to 30 seconds.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50/60 border border-amber-100">
                            <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 leading-relaxed">
                                System settings affect all users on the platform. Changes take effect immediately.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ DEACTIVATE ACCOUNT DIALOG ═══ */}
            <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
                <AlertDialogContent className="max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate account</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will immediately revoke your access to the platform. Your data will be
                            retained and an administrator can reactivate your account. This action
                            cannot be undone by you.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">
                            Type <span className="font-mono text-slate-900">DEACTIVATE</span> to confirm
                        </Label>
                        <Input
                            value={deactivateConfirmText}
                            onChange={(e) => setDeactivateConfirmText(e.target.value)}
                            placeholder="DEACTIVATE"
                            className="h-9 rounded-lg border-slate-200 text-xs font-mono"
                            autoFocus
                            aria-label="Type DEACTIVATE to confirm"
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deactivating}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void handleDeactivate();
                            }}
                            disabled={deactivating || deactivateConfirmText !== 'DEACTIVATE'}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white"
                        >
                            {deactivating && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                            Deactivate account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════════════════════ */

interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    badge?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, description, badge }) => (
    <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                {icon}
            </div>
            <div>
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
        </div>
        {badge}
    </div>
);

export default SettingsPage;
