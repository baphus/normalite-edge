import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Calendar as CalendarIcon,
    Clock3,
    ExternalLink,
    Plus,
    Video,
    Loader2,
    LinkIcon,
    Users2,
    AlignLeft,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Timer,
    Pencil,
    Trash2,
    Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */
interface Session {
    id: string;
    title: string;
    description?: string;
    meetingLink?: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    programTrack?: string | null;
    creator?: { id?: string; name: string };
}

/* ------------------------------------------------------------------ */
/* Constants                                                             */
/* ------------------------------------------------------------------ */
const PROGRAM_TRACKS = [
    { id: 'BEED', label: 'BEED' },
    { id: 'BSED-English', label: 'BSED – English' },
    { id: 'BSED-Math', label: 'BSED – Math' },
    { id: 'BSED-Science', label: 'BSED – Science' },
    { id: 'BSED-Filipino', label: 'BSED – Filipino' },
    { id: 'BSED-Social Studies', label: 'BSED – Social Studies' },
    { id: 'BSED-TLE', label: 'BSED – TLE' },
    { id: 'BSED-MAPEH', label: 'BSED – MAPEH' },
];

const WIZARD_STEPS = [
    { id: 1, label: 'Date', icon: CalendarIcon },
    { id: 2, label: 'Time', icon: Clock3 },
    { id: 3, label: 'Details', icon: AlignLeft },
];

/* ------------------------------------------------------------------ */
/* Wizard form state                                                     */
/* ------------------------------------------------------------------ */
interface WizardState {
    date: Date | undefined;
    startTime: string;
    endTime: string;
    title: string;
    description: string;
    meetingLink: string;
    programTracks: string[];
    allPrograms: boolean;
}

const INITIAL_WIZARD: WizardState = {
    date: undefined,
    startTime: '',
    endTime: '',
    title: '',
    description: '',
    meetingLink: '',
    programTracks: [],
    allPrograms: true,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */
const mapSession = (s: any): Session => {
    const startAt = s.startAt ? new Date(s.startAt) : null;
    const endAt = s.endAt ? new Date(s.endAt) : null;
    const rawScheduled = s.scheduledDate || s.startAt;
    const parsedScheduled = rawScheduled ? new Date(rawScheduled) : null;
    const scheduledDate = parsedScheduled && !Number.isNaN(parsedScheduled.getTime())
        ? parsedScheduled.toISOString().split('T')[0]
        : '';
    const normalizeTime = (value: unknown) => {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        if (!trimmed) return '';
        return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
    };

    return {
        id: s.id,
        title: s.title,
        description: s.description,
        meetingLink: s.meetingLink,
        scheduledDate,
        startTime: startAt
            ? `${startAt.getHours().toString().padStart(2, '0')}:${startAt.getMinutes().toString().padStart(2, '0')}`
            : normalizeTime(s.startTime),
        endTime: endAt
            ? `${endAt.getHours().toString().padStart(2, '0')}:${endAt.getMinutes().toString().padStart(2, '0')}`
            : normalizeTime(s.endTime),
        programTrack: s.programTrack ?? s.program_track ?? null,
        creator: s.creator,
    };
};

const formatDisplayDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const formatDisplayTime = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
};

const formatCalendarDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

const calcDuration = (start: string, end: string): string => {
    if (!start || !end || end <= start) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const total = (eh * 60 + em) - (sh * 60 + sm);
    if (total <= 0) return '';
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

const isValidTimeHHMM = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const normalizeMeetingLink = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return withProtocol;
};

const toUtcMidnightIso = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0)).toISOString();
};

const TIME_SLOTS: { value: string; label: string }[] = (() => {
    const slots = [];
    for (let h = 6; h <= 22; h++) {
        for (const m of [0, 30]) {
            if (h === 22 && m === 30) continue;
            const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            slots.push({ value, label: formatDisplayTime(value) });
        }
    }
    return slots;
})();

/* ------------------------------------------------------------------ */
/* Wizard Step Indicator                                                 */
/* ------------------------------------------------------------------ */
const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
    <div className="flex items-center gap-0 mb-6">
        {WIZARD_STEPS.map((step, idx) => {
            const isDone = step.id < current;
            const isActive = step.id === current;
            return (
                <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className={cn(
                                'h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors',
                                isDone && 'bg-primary text-white',
                                isActive && 'bg-primary text-white ring-4 ring-primary/20',
                                !isDone && !isActive && 'bg-gray-100 text-gray-400',
                            )}
                        >
                            {isDone ? <CheckCircle2 size={14} /> : step.id}
                        </div>
                        <span
                            className={cn(
                                'text-[10px] font-semibold uppercase tracking-wider transition-colors',
                                isActive ? 'text-primary' : isDone ? 'text-primary/60' : 'text-gray-400',
                            )}
                        >
                            {step.label}
                        </span>
                    </div>
                    {idx < WIZARD_STEPS.length - 1 && (
                        <div
                            className={cn(
                                'flex-1 h-px mx-2 mt-[-12px] transition-colors',
                                isDone ? 'bg-primary/40' : 'bg-gray-200',
                            )}
                        />
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

/* ------------------------------------------------------------------ */
/* Time Select                                                           */
/* ------------------------------------------------------------------ */
interface TimeSelectProps {
    value: string;
    onChange: (v: string) => void;
    label: string;
    placeholder?: string;
}

const TimeSelect: React.FC<TimeSelectProps> = ({ value, onChange, label, placeholder = 'Select time' }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Scroll selected item into view when dropdown opens
    useEffect(() => {
        if (open && value && listRef.current) {
            const el = listRef.current.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
    }, [open, value]);

    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            onChange(e.target.value);
            setOpen(false);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">{label}</p>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    'h-9 w-full rounded-md border flex items-center justify-between px-3 text-sm font-medium transition-colors bg-white',
                    value ? 'text-gray-900' : 'text-gray-400',
                    open ? 'border-primary/50 ring-2 ring-primary/20' : 'border-gray-200 hover:border-gray-300',
                )}
            >
                <div className="flex items-center gap-2">
                    <Clock3 size={13} className="text-gray-400 shrink-0" />
                    <span>{value ? formatDisplayTime(value) : placeholder}</span>
                </div>
                <ChevronDown size={13} className={cn('text-gray-400 transition-transform duration-150', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="absolute z-30 top-full mt-1 left-0 right-0 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden">
                    {/* Custom time input */}
                    <div className="px-2.5 pt-2.5 pb-2 border-b border-gray-100 space-y-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Custom time</p>
                        <input
                            type="time"
                            defaultValue={value}
                            onChange={handleNativeChange}
                            className="h-8 w-full rounded-md border border-gray-200 px-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                        />
                    </div>
                    {/* Preset slots */}
                    <div className="max-h-44 overflow-y-auto py-1" ref={listRef}>
                        {TIME_SLOTS.map((slot) => (
                            <button
                                key={slot.value}
                                data-value={slot.value}
                                type="button"
                                onClick={() => { onChange(slot.value); setOpen(false); }}
                                className={cn(
                                    'w-full px-3 py-1.5 text-left text-xs font-medium transition-colors',
                                    value === slot.value
                                        ? 'bg-primary/8 text-primary font-semibold'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary',
                                )}
                            >
                                {slot.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Session Card                                                          */
/* ------------------------------------------------------------------ */
interface SessionCardProps {
    session: Session;
    dimmed?: boolean;
    canManage?: boolean;
    currentUserId?: string;
    currentUserRole?: string;
    onView?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, dimmed, canManage, currentUserId, currentUserRole, onView, onEdit, onDelete }) => (
    <div
        className={cn(
            'group rounded-lg border border-gray-100 bg-white p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all hover:border-primary/20 hover:shadow-sm',
            dimmed && 'opacity-60',
        )}
    >
        <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/[0.08] flex items-center justify-center text-primary mt-0.5">
                <Video size={16} />
            </div>
            <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-gray-900 truncate">{session.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-medium">
                    <span className="inline-flex items-center gap-1">
                        <CalendarIcon size={11} /> {formatDisplayDate(session.scheduledDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Clock3 size={11} /> {formatDisplayTime(session.startTime)} – {formatDisplayTime(session.endTime)}
                    </span>
                    {session.creator?.name && (
                        <span className="inline-flex items-center gap-1">
                            <Users2 size={11} /> {session.creator.id && currentUserRole === 'REVIEWER' && session.creator.id === currentUserId ? 'You' : session.creator.name}
                        </span>
                    )}
                </div>
                {session.description && (
                    <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">{session.description}</p>
                )}
            </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            {session.programTrack && (
                <Badge
                    variant="outline"
                    className="text-[9px] font-semibold uppercase tracking-wider text-primary border-primary/20 bg-primary/5 rounded px-1.5 hidden sm:inline-flex"
                >
                    {session.programTrack}
                </Badge>
            )}
            {canManage && (
                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={onView}
                        title="View details"
                        className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/8 transition-colors"
                    >
                        <Eye size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={onEdit}
                        title="Edit conference"
                        className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/8 transition-colors"
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        title="Delete conference"
                        className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            )}
            {!dimmed && (
                session.meetingLink ? (
                    <a href={session.meetingLink} target="_blank" rel="noreferrer">
                        <Button
                            size="sm"
                            className="h-8 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5 px-3"
                        >
                            Join <ExternalLink size={12} />
                        </Button>
                    </a>
                ) : (
                    <Button variant="outline" size="sm" disabled className="h-8 rounded-md text-xs font-semibold">
                        No link
                    </Button>
                )
            )}
        </div>
    </div>
);

/* ------------------------------------------------------------------ */
/* Session Section                                                       */
/* ------------------------------------------------------------------ */
const SessionSection: React.FC<{
    title: string;
    subtitle: string;
    sessions: Session[];
    empty: string;
    dimmed?: boolean;
    canManage?: boolean;
    currentUserId?: string;
    currentUserRole?: string;
    onView?: (s: Session) => void;
    onEdit?: (s: Session) => void;
    onDelete?: (s: Session) => void;
}> = ({ title, subtitle, sessions, empty, dimmed, canManage, currentUserId, currentUserRole, onView, onEdit, onDelete }) => (
    <div className="space-y-2">
        <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{title}</span>
            <Badge className="bg-gray-100 text-gray-500 border-none text-[10px] font-semibold px-1.5 py-0 h-4">
                {sessions.length}
            </Badge>
            <div className="flex-1 h-px bg-gray-100" />
        </div>
        <p className="text-[11px] text-gray-400 font-medium -mt-1">{subtitle}</p>
        {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-5 text-center">
                <p className="text-xs text-gray-400 font-medium">{empty}</p>
            </div>
        ) : (
            <div className="space-y-2">
                {sessions.map((s) => (
                    <SessionCard
                        key={s.id}
                        session={s}
                        dimmed={dimmed}
                        canManage={canManage}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                        onView={() => onView?.(s)}
                        onEdit={() => onEdit?.(s)}
                        onDelete={() => onDelete?.(s)}
                    />
                ))}
            </div>
        )}
    </div>
);

/* ================================================================== */
/* Main Page Component                                                   */
/* ================================================================== */
const VideoConferencePage: React.FC = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [wizard, setWizard] = useState<WizardState>(INITIAL_WIZARD);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [viewingSession, setViewingSession] = useState<Session | null>(null);
    const [deletingSession, setDeletingSession] = useState<Session | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const canCreate = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

    /* ---------- fetch ---------- */
    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/sessions');
            const payload = res.data?.data;
            const list = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.items)
                    ? payload.items
                    : [];
            setSessions(list.map(mapSession));
        } catch {
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSessions(); }, []);

    /* ---------- grouping ---------- */
    const grouped = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const toStart = (s: Session) => new Date(`${s.scheduledDate}T${s.startTime}:00`);
        const toEnd = (s: Session) => new Date(`${s.scheduledDate}T${s.endTime}:00`);
        const hasValidDateTime = (s: Session) => {
            if (!s.scheduledDate || !s.startTime || !s.endTime) return false;
            const start = toStart(s);
            const end = toEnd(s);
            return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime());
        };
        const validSessions = sessions.filter(hasValidDateTime);

        return {
            today: validSessions
                .filter((s) => { const d = toStart(s); return d >= todayStart && d <= todayEnd; })
                .sort((a, b) => toStart(a).getTime() - toStart(b).getTime()),
            upcoming: validSessions
                .filter((s) => toStart(s) > todayEnd)
                .sort((a, b) => toStart(a).getTime() - toStart(b).getTime()),
            previous: validSessions
                .filter((s) => toEnd(s) < todayStart)
                .sort((a, b) => toStart(b).getTime() - toStart(a).getTime()),
        };
    }, [sessions]);

    /* ---------- wizard helpers ---------- */
    const resetWizard = () => { setWizard(INITIAL_WIZARD); setStep(1); setCreateError(''); };
    const openSheet = () => { resetWizard(); setEditingSession(null); setSheetOpen(true); };
    const closeSheet = () => { setSheetOpen(false); setTimeout(() => { resetWizard(); setEditingSession(null); }, 300); };

    const openEditSheet = (session: Session) => {
        const [year, month, day] = session.scheduledDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const tracks = session.programTrack
            ? session.programTrack.split(',').map((t) => t.trim()).filter(Boolean)
            : [];
        setWizard({
            date,
            startTime: session.startTime,
            endTime: session.endTime,
            title: session.title,
            description: session.description || '',
            meetingLink: session.meetingLink || '',
            programTracks: tracks,
            allPrograms: tracks.length === 0,
        });
        setEditingSession(session);
        setStep(1);
        setCreateError('');
        setSheetOpen(true);
    };

    const canAdvance = () => {
        if (step === 1) return wizard.date !== undefined;
        if (step === 2) return wizard.startTime !== '' && wizard.endTime !== '' && wizard.endTime > wizard.startTime;
        return true;
    };

    const toggleTrack = (id: string) => {
        setWizard((prev) => {
            const has = prev.programTracks.includes(id);
            return { ...prev, allPrograms: false, programTracks: has ? prev.programTracks.filter((t) => t !== id) : [...prev.programTracks, id] };
        });
    };

    const toggleAll = () => setWizard((prev) => ({ ...prev, allPrograms: !prev.allPrograms, programTracks: [] }));

    /* ---------- submit ---------- */
    const handleSubmit = async () => {
        setCreateError('');
        if (!wizard.title.trim()) { setCreateError('Please enter a conference title.'); return; }
        if (!wizard.meetingLink.trim()) { setCreateError('Please enter a meeting link.'); return; }
        if (!wizard.date) { setCreateError('Please select a date.'); return; }
        if (!isValidTimeHHMM(wizard.startTime) || !isValidTimeHHMM(wizard.endTime)) {
            setCreateError('Please provide valid start and end times.');
            return;
        }
        if (wizard.endTime <= wizard.startTime) {
            setCreateError('End time must be after start time.');
            return;
        }

        const normalizedMeetingLink = normalizeMeetingLink(wizard.meetingLink);
        try {
            new URL(normalizedMeetingLink);
        } catch {
            setCreateError('Please enter a valid meeting link (e.g. https://meet.google.com/...).');
            return;
        }

        setCreating(true);
        try {
            const scheduledDateIso = toUtcMidnightIso(wizard.date);
            const programTrackValue = wizard.allPrograms
                ? undefined
                : wizard.programTracks.length > 0 ? wizard.programTracks.join(', ') : undefined;

            const payload = {
                title: wizard.title.trim(),
                description: wizard.description.trim() || undefined,
                meetingLink: normalizedMeetingLink,
                platform: 'ONLINE',
                scheduledDate: scheduledDateIso,
                startTime: wizard.startTime,
                endTime: wizard.endTime,
                program_track: programTrackValue,
            };

            if (editingSession) {
                await api.put(`/sessions/${editingSession.id}`, payload);
            } else {
                await api.post('/sessions', payload);
            }

            closeSheet();
            await fetchSessions();
        } catch (err: any) {
            const apiMessage = err?.response?.data?.message as string | undefined;
            const fieldErrors = err?.response?.data?.errors as Array<{ field?: string; message?: string }> | undefined;
            const firstFieldError = Array.isArray(fieldErrors) && fieldErrors.length > 0
                ? fieldErrors[0]?.message
                : undefined;
            setCreateError(firstFieldError || apiMessage || 'Failed to schedule conference.');
        } finally {
            setCreating(false);
        }
    };

    /* ---------- delete ---------- */
    const handleDeleteConfirm = async () => {
        if (!deletingSession) return;
        setIsDeleting(true);
        try {
            await api.delete(`/sessions/${deletingSession.id}`);
            setDeletingSession(null);
            await fetchSessions();
        } catch {
            // silently fail — could add a toast here
        } finally {
            setIsDeleting(false);
        }
    };

    /* ---------------------------------------------------------------- */
    /* Render                                                             */
    /* ---------------------------------------------------------------- */
    return (
        <div className="flex flex-col gap-4 font-lexend pb-6">

            {/* Page Header */}
            <header className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                    <h1 className="text-base font-bold text-gray-900">Conferences</h1>
                    <p className="text-[11px] text-gray-400">View, join, and manage your live sessions.</p>
                </div>
                {canCreate && (
                    <Button
                        onClick={openSheet}
                        className="h-8 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5 px-3"
                    >
                        <Plus size={14} /> Schedule Conference
                    </Button>
                )}
            </header>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={22} className="animate-spin text-gray-300" />
                </div>
            )}

            {/* Session Sections */}
            {!loading && (
                <div className="space-y-6">
                    <SessionSection
                        title="Today"
                        subtitle="Conferences scheduled for today."
                        sessions={grouped.today}
                        empty="No conferences scheduled for today."
                        canManage={canCreate}
                        currentUserId={user?.id}
                        currentUserRole={user?.role}
                        onView={setViewingSession}
                        onEdit={openEditSheet}
                        onDelete={setDeletingSession}
                    />
                    <SessionSection
                        title="Upcoming"
                        subtitle="Conferences you can look forward to."
                        sessions={grouped.upcoming}
                        empty="No upcoming conferences."
                        canManage={canCreate}
                        currentUserId={user?.id}
                        currentUserRole={user?.role}
                        onView={setViewingSession}
                        onEdit={openEditSheet}
                        onDelete={setDeletingSession}
                    />
                    <SessionSection
                        title="HISTORY"
                        subtitle="Past conferences from earlier dates."
                        sessions={grouped.previous}
                        empty="No conference history yet."
                        dimmed
                        canManage={canCreate}
                        currentUserId={user?.id}
                        currentUserRole={user?.role}
                        onView={setViewingSession}
                        onEdit={openEditSheet}
                        onDelete={setDeletingSession}
                    />
                </div>
            )}

            {/* ============================================================ */}
            {/* Schedule Conference Sheet                                      */}
            {/* ============================================================ */}
            <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
                <SheetContent side="right" className="w-full max-w-[480px] flex flex-col p-0 font-lexend">

                    {/* Sheet Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                        <SheetHeader>
                            <SheetTitle>{editingSession ? 'Edit Conference' : 'Schedule a Conference'}</SheetTitle>
                            <SheetDescription>{editingSession ? 'Update the details below.' : 'Set up your conference in a few quick steps.'}</SheetDescription>
                        </SheetHeader>
                    </div>

                    {/* Sheet Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <StepIndicator current={step} />

                        {/* Step 1: Date */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-gray-900">Pick a date</p>
                                    <p className="text-[11px] text-gray-400">When should this conference be held?</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-3 flex justify-center">
                                    <Calendar
                                        mode="single"
                                        selected={wizard.date}
                                        onSelect={(date) => setWizard((prev) => ({ ...prev, date }))}
                                        disabled={{ before: new Date() }}
                                        initialFocus
                                    />
                                </div>
                                {wizard.date && (
                                    <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/15 px-3 py-2">
                                        <CalendarIcon size={13} className="text-primary shrink-0" />
                                        <span className="text-xs font-semibold text-primary">{formatCalendarDate(wizard.date)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Time */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-gray-900">Set the time</p>
                                    <p className="text-[11px] text-gray-400">What time should the conference start and end?</p>
                                </div>

                                {wizard.date && (
                                    <div className="flex items-center gap-2 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                                        <CalendarIcon size={12} className="text-gray-400 shrink-0" />
                                        <span className="text-[11px] font-semibold text-gray-600">{formatCalendarDate(wizard.date)}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <TimeSelect
                                        label="Start Time"
                                        value={wizard.startTime}
                                        onChange={(v) => setWizard((prev) => ({ ...prev, startTime: v }))}
                                        placeholder="Pick start time"
                                    />
                                    <TimeSelect
                                        label="End Time"
                                        value={wizard.endTime}
                                        onChange={(v) => setWizard((prev) => ({ ...prev, endTime: v }))}
                                        placeholder="Pick end time"
                                    />
                                </div>

                                {/* Duration / validation summary */}
                                {wizard.startTime && wizard.endTime && (
                                    wizard.endTime <= wizard.startTime ? (
                                        <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-100 px-3 py-2">
                                            <Clock3 size={13} className="text-red-400 shrink-0" />
                                            <span className="text-xs font-semibold text-red-500">End time must be after start time.</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/15 px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <Clock3 size={13} className="text-primary shrink-0" />
                                                <span className="text-xs font-semibold text-primary">
                                                    {formatDisplayTime(wizard.startTime)} – {formatDisplayTime(wizard.endTime)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 rounded bg-primary/10 px-2 py-0.5">
                                                <Timer size={11} className="text-primary" />
                                                <span className="text-[11px] font-bold text-primary">
                                                    {calcDuration(wizard.startTime, wizard.endTime)}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {/* Step 3: Details */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-gray-900">Conference details</p>
                                    <p className="text-[11px] text-gray-400">Add the title, link, and who can join.</p>
                                </div>

                                {/* Summary chips */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {wizard.date && (
                                        <div className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                                            <CalendarIcon size={11} />
                                            {wizard.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    )}
                                    {wizard.startTime && wizard.endTime && (
                                        <div className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                                            <Clock3 size={11} />
                                            {formatDisplayTime(wizard.startTime)} – {formatDisplayTime(wizard.endTime)}
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                        Title <span className="text-red-400">*</span>
                                    </Label>
                                    <Input
                                        value={wizard.title}
                                        onChange={(e) => setWizard((prev) => ({ ...prev, title: e.target.value }))}
                                        placeholder="e.g. LET Coaching Session – March"
                                        className="h-9 rounded-md text-sm"
                                    />
                                </div>

                                {/* Meeting Link */}
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                        Meeting Link <span className="text-red-400">*</span>
                                    </Label>
                                    <div className="relative">
                                        <LinkIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <Input
                                            type="url"
                                            value={wizard.meetingLink}
                                            onChange={(e) => setWizard((prev) => ({ ...prev, meetingLink: e.target.value }))}
                                            placeholder="https://meet.google.com/..."
                                            className="h-9 rounded-md text-sm pl-8"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                        Description{' '}
                                        <span className="text-gray-300 font-medium normal-case tracking-normal">(optional)</span>
                                    </Label>
                                    <Textarea
                                        value={wizard.description}
                                        onChange={(e) => setWizard((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Brief agenda or session notes…"
                                        className="rounded-md text-sm resize-none h-20"
                                    />
                                </div>

                                {/* Program Tracks */}
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                        <Users2 size={12} /> Visible to
                                    </Label>
                                    <button
                                        type="button"
                                        onClick={toggleAll}
                                        className={cn(
                                            'w-full flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-semibold transition-colors',
                                            wizard.allPrograms
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                                        )}
                                    >
                                        <div className={cn(
                                            'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                            wizard.allPrograms ? 'bg-primary border-primary' : 'border-gray-300',
                                        )}>
                                            {wizard.allPrograms && <CheckCircle2 size={10} className="text-white" />}
                                        </div>
                                        All program tracks
                                    </button>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {PROGRAM_TRACKS.map((track) => {
                                            const selected = !wizard.allPrograms && wizard.programTracks.includes(track.id);
                                            return (
                                                <button
                                                    key={track.id}
                                                    type="button"
                                                    onClick={() => toggleTrack(track.id)}
                                                    className={cn(
                                                        'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors',
                                                        selected
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                                                    )}
                                                >
                                                    <div className={cn(
                                                        'h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                                                        selected ? 'bg-primary border-primary' : 'border-gray-300',
                                                    )}>
                                                        {selected && <CheckCircle2 size={9} className="text-white" />}
                                                    </div>
                                                    {track.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {createError && (
                                    <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-red-600">
                                        {createError}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sheet Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => step > 1 ? setStep((s) => s - 1) : closeSheet()}
                            className="h-8 rounded-md text-xs font-semibold text-gray-600 gap-1.5"
                        >
                            <ChevronLeft size={14} />
                            {step > 1 ? 'Back' : 'Cancel'}
                        </Button>

                        <div className="flex items-center gap-1.5">
                            {WIZARD_STEPS.map((s) => (
                                <div
                                    key={s.id}
                                    className={cn(
                                        'h-1.5 rounded-full transition-all',
                                        s.id === step ? 'w-5 bg-primary' : s.id < step ? 'w-2 bg-primary/40' : 'w-2 bg-gray-200',
                                    )}
                                />
                            ))}
                        </div>

                        {step < 3 ? (
                            <Button
                                size="sm"
                                onClick={() => setStep((s) => s + 1)}
                                disabled={!canAdvance()}
                                className="h-8 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5 px-4"
                            >
                                Next <ChevronRight size={14} />
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={creating}
                                className="h-8 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5 px-4"
                            >
                                {creating ? (
                                    <><Loader2 size={13} className="animate-spin" /> {editingSession ? 'Saving\u2026' : 'Scheduling\u2026'}</>
                                ) : (
                                    <><Video size={13} /> {editingSession ? 'Save Changes' : 'Schedule Conference'}</>
                                )}
                            </Button>
                        )}
                    </div>

                </SheetContent>
            </Sheet>

            {/* ============================================================ */}
            {/* View Conference Dialog                                         */}
            {/* ============================================================ */}
            <Dialog open={viewingSession !== null} onOpenChange={(open) => { if (!open) setViewingSession(null); }}>
                <DialogContent className="max-w-md font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Video size={15} className="text-primary shrink-0" />
                            {viewingSession?.title}
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3 pt-1">
                                {/* Date / Time */}
                                <div className="flex flex-wrap gap-2">
                                    <div className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                                        <CalendarIcon size={11} />
                                        {viewingSession?.scheduledDate ? formatDisplayDate(viewingSession.scheduledDate) : '—'}
                                    </div>
                                    <div className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                                        <Clock3 size={11} />
                                        {viewingSession ? `${formatDisplayTime(viewingSession.startTime)} – ${formatDisplayTime(viewingSession.endTime)}` : '—'}
                                    </div>
                                    {viewingSession?.startTime && viewingSession?.endTime && (
                                        <div className="flex items-center gap-1.5 rounded-md bg-primary/8 px-2 py-1 text-[11px] font-bold text-primary">
                                            <Timer size={11} />
                                            {calcDuration(viewingSession.startTime, viewingSession.endTime)}
                                        </div>
                                    )}
                                </div>

                                {/* Host */}
                                {viewingSession?.creator?.name && (
                                    <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                                        <Users2 size={11} />
                                        Hosted by <span className="font-semibold text-gray-700">{viewingSession.creator.id && user?.role === 'REVIEWER' && viewingSession.creator.id === user?.id ? 'You' : viewingSession.creator.name}</span>
                                    </div>
                                )}

                                {/* Program Track */}
                                {viewingSession?.programTrack && (
                                    <Badge
                                        variant="outline"
                                        className="text-[9px] font-semibold uppercase tracking-wider text-primary border-primary/20 bg-primary/5 rounded px-1.5"
                                    >
                                        {viewingSession.programTrack}
                                    </Badge>
                                )}

                                {/* Description */}
                                {viewingSession?.description && (
                                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
                                        {viewingSession.description}
                                    </p>
                                )}

                                {/* Meeting Link */}
                                {viewingSession?.meetingLink && (
                                    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
                                        <LinkIcon size={11} className="text-gray-400 shrink-0" />
                                        <a
                                            href={viewingSession.meetingLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[11px] font-semibold text-primary hover:underline truncate"
                                        >
                                            {viewingSession.meetingLink}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingSession(null)}
                            className="h-8 rounded-md text-xs font-semibold"
                        >
                            Close
                        </Button>
                        {viewingSession?.meetingLink && (
                            <a href={viewingSession.meetingLink} target="_blank" rel="noreferrer">
                                <Button size="sm" className="h-8 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5 px-3">
                                    Join <ExternalLink size={12} />
                                </Button>
                            </a>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============================================================ */}
            {/* Delete Confirmation Dialog                                     */}
            {/* ============================================================ */}
            <Dialog open={deletingSession !== null} onOpenChange={(open) => { if (!open && !isDeleting) setDeletingSession(null); }}>
                <DialogContent className="max-w-sm font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold text-gray-900">Delete Conference</DialogTitle>
                        <DialogDescription className="text-[11px] text-gray-500 font-medium pt-0.5">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-gray-700">{deletingSession?.title}</span>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingSession(null)}
                            disabled={isDeleting}
                            className="h-8 rounded-md text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="h-8 rounded-md bg-red-500 hover:bg-red-600 text-white font-semibold text-xs gap-1.5 px-3"
                        >
                            {isDeleting ? (
                                <><Loader2 size={13} className="animate-spin" /> Deleting…</>
                            ) : (
                                <><Trash2 size={13} /> Delete</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VideoConferencePage;

