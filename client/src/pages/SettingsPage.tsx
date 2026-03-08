import React, { useEffect, useState } from 'react';
import {
    Lock,
    Globe,
    Shield,
    Trash2,
    Eye,
    EyeOff,
    MonitorSmartphone,
    CheckCircle2,
    ChevronRight,
    RefreshCw,
    ToggleRight,
    Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { toast } from 'sonner';

type Section = 'security' | 'system';

interface NavItem {
    id: Section;
    label: string;
    description: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
}

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [activeSection, setActiveSection] = useState<Section>('security');

    // Password state
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // System settings state
    const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
    const [enforceExamSingleTab, setEnforceExamSingleTab] = useState(false);
    const [tabSwitchGraceSeconds, setTabSwitchGraceSeconds] = useState(5);
    const [systemLoading, setSystemLoading] = useState(false);
    const [systemSaving, setSystemSaving] = useState(false);
    const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<string | null>(null);

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

    const handlePasswordUpdate = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) return;
        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match.');
            return;
        }
        setPasswordSaving(true);
        try {
            // TODO: wire to /auth/change-password endpoint when available
            await new Promise((r) => setTimeout(r, 900));
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch {
            toast.error('Failed to update password. Please try again.');
        } finally {
            setPasswordSaving(false);
        }
    };

    const navItems: NavItem[] = [
        {
            id: 'security',
            label: 'Security',
            description: 'Password & sessions',
            icon: <Shield size={16} />,
        },
        ...(isAdmin
            ? [
                  {
                      id: 'system' as Section,
                      label: 'System',
                      description: 'Global configuration',
                      icon: <Globe size={16} />,
                      adminOnly: true,
                  },
              ]
            : []),
    ];

    const roleBadgeConfig: Record<string, { label: string; className: string }> = {
        ADMIN: { label: 'Administrator', className: 'bg-primary/10 text-primary' },
        REVIEWER: { label: 'Reviewer', className: 'bg-indigo-50 text-indigo-600' },
        REVIEWEE: { label: 'Reviewee', className: 'bg-emerald-50 text-emerald-600' },
    };
    const roleBadge = user?.role ? roleBadgeConfig[user.role] : null;

    return (
        <div className="flex flex-col gap-0 font-lexend pb-10 min-h-full">
            {/* Page Header */}
            <header className="flex flex-col gap-1 mb-8">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Settings</h1>
                <p className="text-gray-500 font-medium tracking-tight">
                    Manage your account preferences and configurations.
                </p>
            </header>

            {/* Settings Layout */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Sidebar Navigation */}
                <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-4">
                    {/* Account Card */}
                    <div className="mb-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-base shrink-0">
                            {user?.firstName?.[0] ?? '?'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-black text-gray-900 truncate">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-[11px] text-gray-400 font-medium truncate">{user?.email}</p>
                        </div>
                        {roleBadge && (
                            <Badge className={cn('ml-auto shrink-0 border-none font-black text-[8px] uppercase tracking-widest px-2 py-1', roleBadge.className)}>
                                {roleBadge.label}
                            </Badge>
                        )}
                    </div>

                    {/* Nav Items */}
                    <nav className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        {navItems.map((item, idx) => (
                            <React.Fragment key={item.id}>
                                {idx > 0 && <div className="border-t border-gray-50" />}
                                <button
                                    onClick={() => setActiveSection(item.id)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-4 py-3.5 transition-all group text-left',
                                        activeSection === item.id
                                            ? 'bg-primary/5 text-primary'
                                            : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all',
                                            activeSection === item.id
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600',
                                        )}
                                    >
                                        {item.icon}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={cn('text-sm font-black leading-none mb-0.5', activeSection === item.id ? 'text-primary' : '')}>
                                            {item.label}
                                        </p>
                                        <p className="text-[10px] font-medium text-gray-400 truncate">{item.description}</p>
                                    </div>
                                    <ChevronRight
                                        size={14}
                                        className={cn('shrink-0 transition-all', activeSection === item.id ? 'text-primary translate-x-0.5' : 'text-gray-300')}
                                    />
                                </button>
                            </React.Fragment>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <div className="flex-1 min-w-0 space-y-4">
                    {/* === SECURITY === */}
                    {activeSection === 'security' && (
                        <div className="animate-in fade-in-0 slide-in-from-right-2 duration-300 space-y-4">
                            <SectionHeader
                                icon={<Lock size={18} />}
                                title="Account Security"
                                description="Manage your password and active login sessions."
                            />

                            {/* Change Password */}
                            <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden bg-white">
                                <CardContent className="p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-black text-gray-900">Change Password</p>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">Use a strong, unique password for your account.</p>
                                        </div>
                                        {passwordSuccess && (
                                            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl animate-in fade-in-0 duration-300">
                                                <CheckCircle2 size={13} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Updated</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-gray-50" />

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
                                                <Input
                                                    type={showCurrent ? 'text' : 'password'}
                                                    placeholder="Enter current password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="pl-10 pr-10 h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white shadow-none transition-colors"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrent((v) => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                                >
                                                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">New Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        type={showNew ? 'text' : 'password'}
                                                        placeholder="New password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="pr-10 h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white shadow-none transition-colors"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNew((v) => !v)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                                    >
                                                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Confirm Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        type={showConfirm ? 'text' : 'password'}
                                                        placeholder="Confirm new password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className={cn(
                                                            'pr-10 h-11 rounded-xl bg-gray-50/50 focus:bg-white shadow-none border-gray-100 transition-colors',
                                                            confirmPassword && newPassword !== confirmPassword && 'border-red-200 bg-red-50/30',
                                                        )}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirm((v) => !v)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                                    >
                                                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                                    </button>
                                                </div>
                                                {confirmPassword && newPassword !== confirmPassword && (
                                                    <p className="text-[10px] text-red-500 font-semibold">Passwords do not match.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <Button
                                                onClick={() => void handlePasswordUpdate()}
                                                disabled={
                                                    passwordSaving ||
                                                    !currentPassword ||
                                                    !newPassword ||
                                                    !confirmPassword ||
                                                    newPassword !== confirmPassword
                                                }
                                                className="h-10 rounded-xl px-6 bg-primary hover:bg-primary/90 text-white font-black shadow-sm shadow-primary/20 uppercase tracking-widest text-[10px] gap-2 disabled:opacity-50"
                                            >
                                                {passwordSaving ? (
                                                    <>
                                                        <RefreshCw size={13} className="animate-spin" /> Updating...
                                                    </>
                                                ) : (
                                                    'Update Password'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Active Sessions */}
                            <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden bg-white">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-black text-gray-900">Active Sessions</p>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">Devices currently signed in to your account.</p>
                                        </div>
                                        <Badge className="bg-gray-100 text-gray-500 border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-1">
                                            <MonitorSmartphone size={10} className="mr-1" /> 1 Active
                                        </Badge>
                                    </div>

                                    <div className="border-t border-gray-50" />

                                    {/* Current session placeholder */}
                                    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/40">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <MonitorSmartphone size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-black text-gray-900">This Device</p>
                                                <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[8px] uppercase tracking-widest px-1.5 py-0.5">
                                                    Current
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] font-medium text-gray-400 mt-0.5 uppercase tracking-widest">Web Browser</p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full h-10 rounded-xl border-gray-100 font-black uppercase tracking-widest text-[10px] text-gray-500 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all"
                                    >
                                        Sign out of all other devices
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Danger Zone */}
                            <Card className="rounded-2xl border-red-100 shadow-sm overflow-hidden bg-red-50/20">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-black text-red-600">Delete Account</p>
                                            <p className="text-xs text-gray-500 font-medium mt-1 max-w-sm">
                                                Permanently delete your account and all associated data. This action cannot be undone.
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            className="shrink-0 h-10 rounded-xl text-red-500 hover:bg-red-600 hover:text-white font-black uppercase tracking-widest text-[10px] gap-1.5 border border-red-100 hover:border-red-600 transition-all"
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* === SYSTEM (ADMIN ONLY) === */}
                    {activeSection === 'system' && isAdmin && (
                        <div className="animate-in fade-in-0 slide-in-from-right-2 duration-300 space-y-4">
                            <SectionHeader
                                icon={<Globe size={18} />}
                                title="System Settings"
                                description="Global configuration applied across the entire platform."
                                badge={
                                    <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] uppercase tracking-widest px-2.5 py-1">
                                        Admin Only
                                    </Badge>
                                }
                            />

                            {/* Exam Configuration */}
                            <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden bg-white">
                                <CardContent className="p-0">
                                    <div className="px-5 py-4 border-b border-gray-50">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Exam Configuration</p>
                                    </div>

                                    {systemLoading ? (
                                        <div className="p-6 flex items-center gap-3 text-gray-400">
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span className="text-xs font-semibold uppercase tracking-widest">Loading settings...</span>
                                        </div>
                                    ) : (
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-6 pb-5 border-b border-gray-100">
                                                <div className="space-y-1.5 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <ToggleRight size={15} className="text-gray-400 shrink-0" />
                                                        <p className="text-sm font-black text-gray-900">Allow Multiple Exam Attempts</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium leading-relaxed pl-5">
                                                        When <strong>disabled</strong>, reviewees may submit each exam only once. When{' '}
                                                        <strong>enabled</strong>, reviewees can retake exams up to the configured limit.
                                                    </p>
                                                    <div className="flex items-center gap-2 pl-5 pt-1">
                                                        <Badge
                                                            className={cn(
                                                                'border-none font-black text-[9px] uppercase tracking-widest px-2 py-1',
                                                                allowMultipleAttempts
                                                                    ? 'bg-emerald-50 text-emerald-600'
                                                                    : 'bg-gray-100 text-gray-500',
                                                            )}
                                                        >
                                                            {allowMultipleAttempts ? 'Enabled' : 'Disabled'}
                                                        </Badge>
                                                        {settingsUpdatedAt && (
                                                            <span className="text-[9px] font-medium text-gray-400">
                                                                Last updated {new Date(settingsUpdatedAt).toLocaleString()}
                                                            </span>
                                                        )}
                                                        {systemSaving && (
                                                            <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-gray-400">
                                                                <RefreshCw size={9} className="animate-spin" /> Saving...
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
                                                        <MonitorSmartphone size={15} className="text-gray-400 shrink-0" />
                                                        <p className="text-sm font-black text-gray-900">Enforce Single-Tab Exam Focus</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium leading-relaxed pl-5">
                                                        When <strong>enabled</strong>, switching to another browser tab during an exam immediately resets the current attempt to the beginning and clears all saved answers.
                                                    </p>
                                                    <div className="flex items-center gap-2 pl-5 pt-1">
                                                        <Badge
                                                            className={cn(
                                                                'border-none font-black text-[9px] uppercase tracking-widest px-2 py-1',
                                                                enforceExamSingleTab
                                                                    ? 'bg-red-50 text-red-600'
                                                                    : 'bg-gray-100 text-gray-500',
                                                            )}
                                                        >
                                                            {enforceExamSingleTab ? 'Enabled' : 'Disabled'}
                                                        </Badge>
                                                        {systemSaving && (
                                                            <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-gray-400">
                                                                <RefreshCw size={9} className="animate-spin" /> Saving...
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

                                            <div className="pt-5 mt-5 border-t border-gray-100">
                                                <div className="space-y-2">
                                                    <p className="text-sm font-black text-gray-900">Tab Switch Countdown (Seconds)</p>
                                                    <p className="text-xs text-gray-500 font-medium">
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
                                                            className="h-10"
                                                        />
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 font-medium">Allowed range: 1 to 30 seconds.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                                <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                    System settings affect all users on the platform. Changes take effect immediately.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Sub-components ── */

interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    badge?: React.ReactNode;
}
const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, description, badge }) => (
    <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                {icon}
            </div>
            <div>
                <h2 className="text-lg font-black text-gray-900">{title}</h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{description}</p>
            </div>
        </div>
        {badge}
    </div>
);

export default SettingsPage;
