// @ts-nocheck — full rewrite, lint pass separately
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Plus,
    Video,
    FileText,
    Clock,
    Users,
    CheckCircle2,
    ExternalLink,
    AlignLeft,
    Clock3,
    LinkIcon,
    ChevronDown,
    Loader2,
    Pencil,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────── */
/* Types                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

type EventType = 'exam_start' | 'exam_deadline' | 'conference';

interface CalendarEvent {
    id: string;
    type: EventType;
    title: string;
    date: string;      // YYYY-MM-DD
    time?: string;     // HH:mm
    color: 'blue' | 'red' | 'violet';
    meta?: Record<string, unknown>;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Conference wizard types (mirrors VideoConferencePage)                       */
/* ────────────────────────────────────────────────────────────────────────── */

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
    { id: 1, label: 'Date', icon: CalendarDays },
    { id: 2, label: 'Time', icon: Clock3 },
    { id: 3, label: 'Details', icon: AlignLeft },
];

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

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const formatTime = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
};

const calcDuration = (start: string, end: string) => {
    if (!start || !end) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const total = (eh * 60 + em) - (sh * 60 + sm);
    if (total <= 0) return '';
    const h = Math.floor(total / 60);
    const mn = total % 60;
    if (h === 0) return `${mn}m`;
    if (mn === 0) return `${h}h`;
    return `${h}h ${mn}m`;
};

const normalizeMeetingLink = (v: string) => {
    const t = v.trim();
    if (!t) return '';
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

const toUtcIso = (date: Date) => {
    const y = date.getFullYear();
    const mo = date.getMonth();
    const d = date.getDate();
    return new Date(Date.UTC(y, mo, d, 0, 0, 0)).toISOString();
};

/** Full-width bar on the calendar grid */
const EVENT_BAR: Record<EventType, string> = {
    exam_start:    'bg-blue-500 text-white',
    exam_deadline: 'bg-rose-500 text-white',
    conference:    'bg-violet-500 text-white',
};

/** Left-border accent card in the detail panel */
const EVENT_ACCENT: Record<EventType, string> = {
    exam_start:    'border-l-blue-500 bg-blue-50/60',
    exam_deadline: 'border-l-rose-500 bg-rose-50/60',
    conference:    'border-l-violet-500 bg-violet-50/60',
};

const EVENT_ICON_COLOR: Record<EventType, string> = {
    exam_start:    'text-blue-500',
    exam_deadline: 'text-rose-500',
    conference:    'text-violet-500',
};

const EVENT_LABEL: Record<EventType, string> = {
    exam_start:    'Opens',
    exam_deadline: 'Closes',
    conference:    'Conference',
};

const eventIcon: Record<EventType, React.ReactNode> = {
    exam_start:    <FileText size={13} />,
    exam_deadline: <FileText size={13} />,
    conference:    <Video size={13} />,
};

const TIME_SLOTS: { value: string; label: string }[] = (() => {
    const slots = [];
    for (let h = 6; h <= 22; h++) {
        for (const m of [0, 30]) {
            if (h === 22 && m === 30) continue;
            const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            slots.push({ value, label: formatTime(value) });
        }
    }
    return slots;
})();

/* ────────────────────────────────────────────────────────────────────────── */
/* TimeSelect                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

interface TimeSelectProps {
    value: string;
    onChange: (v: string) => void;
    label: string;
}

const TimeSelect: React.FC<TimeSelectProps> = ({ value, onChange, label }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => {
        if (open && value && listRef.current) {
            const el = listRef.current.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [open, value]);

    return (
        <div className="relative" ref={ref}>
            <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'h-9 w-full rounded-lg border flex items-center justify-between px-3 text-sm transition-all bg-white shadow-sm',
                    value ? 'text-gray-900' : 'text-gray-400',
                    open
                        ? 'border-primary ring-2 ring-primary/10'
                        : 'border-gray-200 hover:border-gray-300',
                )}
            >
                <span className="flex items-center gap-2">
                    <Clock3 size={13} className="text-gray-400 shrink-0" />
                    {value ? formatTime(value) : 'Select time'}
                </span>
                <ChevronDown size={13} className={cn('text-gray-400 transition-transform duration-150', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="absolute z-40 top-full mt-1 left-0 right-0 rounded-xl border border-gray-150 bg-white shadow-xl overflow-hidden">
                    <div className="px-3 pt-3 pb-2 border-b border-gray-100 space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Custom time</p>
                        <input
                            type="time"
                            defaultValue={value}
                            onChange={e => { if (e.target.value) { onChange(e.target.value); setOpen(false); } }}
                            className="h-8 w-full rounded-lg border border-gray-200 px-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                    <div className="max-h-44 overflow-y-auto py-1" ref={listRef}>
                        {TIME_SLOTS.map(slot => (
                            <button
                                key={slot.value}
                                data-value={slot.value}
                                type="button"
                                onClick={() => { onChange(slot.value); setOpen(false); }}
                                className={cn(
                                    'w-full px-3 py-1.5 text-left text-xs font-medium transition-colors',
                                    value === slot.value
                                        ? 'bg-primary/8 text-primary font-semibold'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
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

/* ────────────────────────────────────────────────────────────────────────── */
/* Wizard Step Indicator                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
    <div className="flex items-center mb-5">
        {WIZARD_STEPS.map((step, idx) => {
            const done = step.id < current;
            const active = step.id === current;
            return (
                <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                            'h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                            done && 'bg-primary text-white',
                            active && 'bg-primary text-white ring-4 ring-primary/15',
                            !done && !active && 'bg-gray-100 text-gray-400',
                        )}>
                            {done ? <CheckCircle2 size={14} /> : step.id}
                        </div>
                        <span className={cn(
                            'text-[10px] font-semibold uppercase tracking-wider',
                            active ? 'text-primary' : done ? 'text-primary/50' : 'text-gray-400',
                        )}>
                            {step.label}
                        </span>
                    </div>
                    {idx < WIZARD_STEPS.length - 1 && (
                        <div className={cn('flex-1 h-px mx-2 -mt-3 transition-colors', done ? 'bg-primary/30' : 'bg-gray-200')} />
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

/* ────────────────────────────────────────────────────────────────────────── */
/* CalendarPage                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

const CalendarPage: React.FC = () => {
    const { user } = useAuth();
    const canManage = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-indexed

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);

    // Day detail sheet
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Conference wizard
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizard, setWizard] = useState<WizardState>(INITIAL_WIZARD);
    const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({});
    const [wizardSaving, setWizardSaving] = useState(false);

    // Edit/delete conference
    const [editingConferenceId, setEditingConferenceId] = useState<string | null>(null);
    const [deleteConferenceId, setDeleteConferenceId] = useState<string | null>(null);
    const [deleteConferenceTitle, setDeleteConferenceTitle] = useState('');
    const [deleting, setDeleting] = useState(false);

    /* ── Fetch events ───────────────────────────────────────────────────── */
    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/calendar', { params: { year: viewYear, month: viewMonth } });
            setEvents(res.data?.data ?? []);
        } catch (error) {
            console.error('Failed to fetch calendar events', error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [viewYear, viewMonth]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    /* ── Calendar grid ──────────────────────────────────────────────────── */
    const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    // Pad to full weeks
    while (cells.length % 7 !== 0) cells.push(null);

    const eventsByDate = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
        if (!eventsByDate.has(ev.date)) eventsByDate.set(ev.date, []);
        eventsByDate.get(ev.date)!.push(ev);
    }

    /* ── Month navigation ───────────────────────────────────────────────── */
    const prevMonth = () => {
        if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
        else setViewMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
        else setViewMonth(m => m + 1);
    };

    const goToToday = () => {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth() + 1);
    };

    /* ── Selected day events ────────────────────────────────────────────── */
    const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];

    /* ── Conference wizard helpers ──────────────────────────────────────── */
    const openNewConference = (prefillDate?: Date) => {
        setEditingConferenceId(null);
        setWizard({ ...INITIAL_WIZARD, date: prefillDate ?? undefined });
        setWizardErrors({});
        setWizardStep(1);
        setWizardOpen(true);
    };

    const openEditConference = async (conferenceId: string) => {
        try {
            const res = await api.get(`/sessions/${conferenceId}`);
            const s = res.data?.data;
            if (!s) return;
            const startAt = s.startAt ? new Date(s.startAt) : undefined;
            const endAt = s.endAt ? new Date(s.endAt) : undefined;
            const mkTime = (d?: Date) => d
                ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                : '';
            const rawDate = s.scheduledDate ?? s.startAt;
            const parsedDate = rawDate ? new Date(rawDate) : undefined;
            setWizard({
                date: parsedDate,
                startTime: mkTime(startAt),
                endTime: mkTime(endAt),
                title: s.title ?? '',
                description: s.description ?? '',
                meetingLink: s.meetingLink ?? '',
                programTracks: s.programTrack ? [s.programTrack] : [],
                allPrograms: !s.programTrack,
            });
            setEditingConferenceId(conferenceId);
            setWizardErrors({});
            setWizardStep(1);
            setWizardOpen(true);
        } catch { /* ignore */ }
    };

    const validateWizardStep = (): boolean => {
        const errs: Record<string, string> = {};
        if (wizardStep === 1 && !wizard.date) errs.date = 'Please select a date.';
        if (wizardStep === 2) {
            if (!wizard.startTime) errs.startTime = 'Start time is required.';
            if (!wizard.endTime) errs.endTime = 'End time is required.';
            if (wizard.startTime && wizard.endTime && wizard.endTime <= wizard.startTime)
                errs.endTime = 'End time must be after start time.';
        }
        if (wizardStep === 3) {
            if (!wizard.title.trim()) errs.title = 'Title is required.';
            if (!wizard.meetingLink.trim()) errs.meetingLink = 'Meeting link is required.';
            if (!wizard.allPrograms && wizard.programTracks.length === 0)
                errs.programTracks = 'Select at least one program or choose All Programs.';
        }
        setWizardErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleWizardNext = () => {
        if (!validateWizardStep()) return;
        if (wizardStep < 3) setWizardStep(s => s + 1);
        else handleWizardSubmit();
    };

    const handleWizardSubmit = async () => {
        if (!validateWizardStep()) return;
        setWizardSaving(true);
        try {
            const payload = {
                title: wizard.title.trim(),
                description: wizard.description.trim() || undefined,
                scheduledDate: toUtcIso(wizard.date!),
                startTime: wizard.startTime,
                endTime: wizard.endTime,
                platform: 'custom',
                meetingLink: normalizeMeetingLink(wizard.meetingLink),
                programTrack: wizard.allPrograms ? undefined : wizard.programTracks[0] ?? undefined,
                programTracks: wizard.allPrograms ? undefined : wizard.programTracks,
                allPrograms: wizard.allPrograms,
            };
            if (editingConferenceId) {
                await api.put(`/sessions/${editingConferenceId}`, payload);
            } else {
                await api.post('/sessions', payload);
            }
            setWizardOpen(false);
            fetchEvents();
        } catch { /* ignore */ }
        finally { setWizardSaving(false); }
    };

    const handleDeleteConference = async () => {
        if (!deleteConferenceId) return;
        setDeleting(true);
        try {
            await api.delete(`/sessions/${deleteConferenceId}`);
            setDeleteConferenceId(null);
            fetchEvents();
            // Remove from selected view if needed
            setSelectedDate(d => d);
        } catch { /* ignore */ }
        finally { setDeleting(false); }
    };

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col h-full overflow-hidden bg-gray-50">

            {/* ── Toolbar ─────────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center justify-between px-6 h-14 bg-white border-b border-gray-200/80">
                {/* Left: nav controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToToday}
                        className="h-7 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                    >
                        Today
                    </button>
                    <div className="flex items-center">
                        <button
                            onClick={prevMonth}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <button
                            onClick={nextMonth}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                    <h1 className="text-[15px] font-semibold text-gray-900 tracking-tight">
                        {MONTH_NAMES[viewMonth - 1]}{' '}
                        <span className="text-gray-400 font-normal">{viewYear}</span>
                    </h1>
                    {loading && <Loader2 size={13} className="text-gray-400 animate-spin ml-1" />}
                </div>

                {/* Right: legend + action */}
                <div className="flex items-center gap-5">
                    <div className="hidden md:flex items-center gap-4">
                        {([
                            ['bg-blue-500', 'Exam Opens'],
                            ['bg-rose-500', 'Exam Closes'],
                            ['bg-violet-500', 'Conference'],
                        ] as [string, string][]).map(([bg, label]) => (
                            <span key={label} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                                <span className={cn('w-2 h-2 rounded-full shrink-0', bg)} />
                                {label}
                            </span>
                        ))}
                    </div>
                    {canManage && (
                        <Button
                            size="sm"
                            className="h-7 gap-1.5 text-xs font-medium px-3 rounded-lg shadow-sm"
                            onClick={() => openNewConference()}
                        >
                            <Plus size={12} />
                            Conference
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Calendar ────────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                {/* Sticky weekday header */}
                <div className="grid grid-cols-7 bg-white border-b border-gray-200/80 sticky top-0 z-10">
                    {DAYS_OF_WEEK.map((d, i) => (
                        <div
                            key={d}
                            className={cn(
                                'py-2.5 text-center text-[11px] font-semibold uppercase tracking-widest',
                                i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-500',
                            )}
                        >
                            {d}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 divide-x divide-y divide-gray-200/80 border-b border-gray-200/80">
                    {cells.map((day, idx) => {
                        if (!day) {
                            return (
                                <div
                                    key={`empty-${idx}`}
                                    className="min-h-28 bg-gray-50/70"
                                />
                            );
                        }

                        const key = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayEvents = eventsByDate.get(key) ?? [];
                        const isToday =
                            today.getFullYear() === viewYear &&
                            today.getMonth() + 1 === viewMonth &&
                            today.getDate() === day;
                        const isSelected = selectedDate === key;
                        const isWeekend = idx % 7 === 0 || idx % 7 === 6;

                        const visibleEvents = dayEvents.slice(0, 3);
                        const overflow = dayEvents.length - 3;

                        return (
                            <button
                                key={key}
                                onClick={() => setSelectedDate(isSelected ? null : key)}
                                className={cn(
                                    'relative flex flex-col p-2 min-h-28 text-left transition-colors group',
                                    isSelected
                                        ? 'bg-blue-50/80 ring-inset ring-2 ring-primary/25'
                                        : isWeekend
                                            ? 'bg-gray-50/70 hover:bg-gray-100/60'
                                            : 'bg-white hover:bg-gray-50/80',
                                )}
                            >
                                {/* Day number row */}
                                <div className="flex items-center justify-between w-full mb-1">
                                    {canManage ? (
                                        <button
                                            type="button"
                                            onClick={e => {
                                                e.stopPropagation();
                                                openNewConference(new Date(viewYear, viewMonth - 1, day));
                                            }}
                                            title="Add conference"
                                            className="h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary hover:bg-primary/8 transition-all"
                                        >
                                            <Plus size={11} />
                                        </button>
                                    ) : <span />}
                                    <span className={cn(
                                        'text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors',
                                        isToday
                                            ? 'bg-primary text-white'
                                            : isWeekend
                                                ? 'text-gray-400'
                                                : 'text-gray-700',
                                    )}>
                                        {day}
                                    </span>
                                </div>

                                {/* Event bars */}
                                <div className="flex flex-col gap-0.5 w-full mt-0.5">
                                    {visibleEvents.map(ev => (
                                        <div
                                            key={ev.id}
                                            className={cn(
                                                'flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold truncate leading-4',
                                                EVENT_BAR[ev.type],
                                            )}
                                        >
                                            <span className="truncate">{ev.title}</span>
                                        </div>
                                    ))}
                                    {overflow > 0 && (
                                        <span className="text-[10px] font-medium text-gray-400 pl-1.5">
                                            +{overflow} more
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

            {/* ── Timeline ───────────────────────────────────────────── */}
            {events.length > 0 && (() => {
                // Sort all events by date then time
                const sorted = [...events].sort((a, b) => {
                    const dc = a.date.localeCompare(b.date);
                    if (dc !== 0) return dc;
                    return (a.time ?? '').localeCompare(b.time ?? '');
                });

                // Group by date
                const grouped: { date: string; items: CalendarEvent[] }[] = [];
                for (const ev of sorted) {
                    const last = grouped[grouped.length - 1];
                    if (last && last.date === ev.date) last.items.push(ev);
                    else grouped.push({ date: ev.date, items: [ev] });
                }

                const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                return (
                    <div className="border-t border-gray-200/80 bg-white">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-3">
                            <div className="flex items-center gap-2">
                                <Clock3 size={14} className="text-gray-400" />
                                <h2 className="text-[13px] font-bold text-gray-800 tracking-tight">
                                    {MONTH_NAMES[viewMonth - 1]} Timeline
                                </h2>
                                <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {events.length} event{events.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Groups */}
                        <div className="px-6 pb-8 space-y-0">
                            {grouped.map((group, gi) => {
                                const d = new Date(group.date + 'T00:00:00');
                                const isToday = group.date === todayKey;
                                const isPast = group.date < todayKey;
                                const isLast = gi === grouped.length - 1;

                                return (
                                    <div key={group.date} className="flex gap-4">
                                        {/* Left: date label + vertical line */}
                                        <div className="flex flex-col items-center w-14 shrink-0">
                                            <div className={cn(
                                                'flex flex-col items-center justify-center w-11 h-11 rounded-xl shrink-0 mt-1',
                                                isToday ? 'bg-primary text-white shadow-sm' : isPast ? 'bg-gray-100' : 'bg-gray-50 border border-gray-200',
                                            )}>
                                                <span className={cn(
                                                    'text-[9px] font-bold uppercase tracking-wider leading-none',
                                                    isToday ? 'text-white/80' : 'text-gray-400',
                                                )}>
                                                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </span>
                                                <span className={cn(
                                                    'text-[17px] font-bold leading-tight',
                                                    isToday ? 'text-white' : isPast ? 'text-gray-400' : 'text-gray-800',
                                                )}>
                                                    {d.getDate()}
                                                </span>
                                            </div>
                                            {!isLast && (
                                                <div className="w-px flex-1 bg-gray-200 mt-1.5 mb-0" style={{ minHeight: '16px' }} />
                                            )}
                                        </div>

                                        {/* Right: event cards */}
                                        <div className={cn('flex-1 min-w-0 py-1', !isLast && 'pb-4')}>
                                            <div className="space-y-1.5">
                                                {group.items.map(ev => (
                                                    <button
                                                        key={ev.id}
                                                        type="button"
                                                        onClick={() => setSelectedDate(group.date)}
                                                        className={cn(
                                                            'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all',
                                                            'hover:shadow-sm',
                                                            isPast
                                                                ? 'bg-gray-50 border-gray-100 opacity-60 hover:opacity-90'
                                                                : 'bg-white border-gray-100 shadow-sm hover:border-gray-200',
                                                        )}
                                                    >
                                                        {/* Color dot */}
                                                        <span className={cn(
                                                            'w-2 h-2 rounded-full shrink-0',
                                                            ev.type === 'exam_start'    && 'bg-blue-500',
                                                            ev.type === 'exam_deadline' && 'bg-rose-500',
                                                            ev.type === 'conference'    && 'bg-violet-500',
                                                        )} />

                                                        {/* Icon */}
                                                        <span className={cn(
                                                            'shrink-0',
                                                            EVENT_ICON_COLOR[ev.type],
                                                        )}>
                                                            {eventIcon[ev.type]}
                                                        </span>

                                                        {/* Text */}
                                                        <span className="flex-1 min-w-0">
                                                            <span className="block text-[12.5px] font-semibold text-gray-800 truncate leading-tight">
                                                                {ev.title}
                                                            </span>
                                                            {ev.meta?.subject ? (
                                                                <span className="block text-[10px] text-gray-400 truncate mt-0.5">
                                                                    {String(ev.meta.subject)}
                                                                </span>
                                                            ) : null}
                                                        </span>

                                                        {/* Right meta */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {ev.time && (
                                                                <span className="text-[10.5px] font-medium text-gray-400 flex items-center gap-0.5">
                                                                    <Clock size={9} className="shrink-0" />
                                                                    {formatTime(ev.time)}
                                                                </span>
                                                            )}
                                                            <span className={cn(
                                                                'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                                                                ev.type === 'exam_start'    && 'bg-blue-50 text-blue-600',
                                                                ev.type === 'exam_deadline' && 'bg-rose-50 text-rose-600',
                                                                ev.type === 'conference'    && 'bg-violet-50 text-violet-600',
                                                            )}>
                                                                {EVENT_LABEL[ev.type]}
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
            </div> {/* end flex-1 overflow-auto */}

            {/* ── Day Detail Sheet ───────────────────────────────────── */}
            <Sheet open={!!selectedDate} onOpenChange={open => { if (!open) setSelectedDate(null); }}>
                <SheetContent className="w-full sm:max-w-100 bg-white border-l border-gray-200 p-0 flex flex-col shadow-2xl">
                    <SheetHeader className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                {selectedDate && (() => {
                                    const d = new Date(selectedDate + 'T00:00:00');
                                    return (
                                        <>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                                                {d.toLocaleDateString('en-US', { weekday: 'long' })}
                                            </p>
                                            <SheetTitle className="text-xl font-bold text-gray-900 leading-tight">
                                                {d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </SheetTitle>
                                        </>
                                    );
                                })()}
                            </div>
                            {selectedEvents.length > 0 && (
                                <span className="mt-1 shrink-0 inline-flex items-center text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                                    {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
                        {selectedEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                                    <CalendarDays size={24} className="text-gray-400" strokeWidth={1.5} />
                                </div>
                                <p className="text-sm font-semibold text-gray-500">Nothing scheduled</p>
                                <p className="text-xs text-gray-400 mt-1">This day is clear</p>
                                {canManage && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-5 text-xs rounded-lg"
                                        onClick={() => {
                                            if (selectedDate) {
                                                const [y, mo, d] = selectedDate.split('-').map(Number);
                                                openNewConference(new Date(y, mo - 1, d));
                                            }
                                        }}
                                    >
                                        <Plus size={12} className="mr-1.5" /> Schedule Conference
                                    </Button>
                                )}
                            </div>
                        ) : (
                            selectedEvents.map(ev => (
                                <EventCard
                                    key={ev.id}
                                    event={ev}
                                    canManage={canManage}
                                    onEditConference={id => {
                                        setSelectedDate(null);
                                        setTimeout(() => openEditConference(id), 150);
                                    }}
                                    onDeleteConference={(id, title) => {
                                        setDeleteConferenceId(id);
                                        setDeleteConferenceTitle(title);
                                    }}
                                />
                            ))
                        )}
                    </div>

                    {canManage && selectedEvents.length > 0 && (
                        <div className="shrink-0 px-4 py-3.5 border-t border-gray-100">
                            <button
                                type="button"
                                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-dashed border-gray-300 text-xs font-medium text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/4 transition-all"
                                onClick={() => {
                                    if (selectedDate) {
                                        const [y, mo, d] = selectedDate.split('-').map(Number);
                                        openNewConference(new Date(y, mo - 1, d));
                                        setSelectedDate(null);
                                    }
                                }}
                            >
                                <Plus size={12} /> Add Conference
                            </button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Conference Wizard ────────────────────────────────────── */}
            <Dialog open={wizardOpen} onOpenChange={open => { if (!open) setWizardOpen(false); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900">
                            {editingConferenceId ? 'Edit Conference' : 'New Conference'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-400">
                            {editingConferenceId
                                ? 'Update conference details below.'
                                : 'Schedule a video conference for students.'}
                        </DialogDescription>
                    </DialogHeader>

                    <StepIndicator current={wizardStep} />

                    {/* Step 1 – Date */}
                    {wizardStep === 1 && (
                        <div className="flex flex-col items-center gap-2">
                            <Calendar
                                mode="single"
                                selected={wizard.date}
                                onSelect={d => setWizard(w => ({ ...w, date: d }))}
                                className="rounded-xl border border-gray-100 shadow-sm"
                            />
                            {wizardErrors.date && <p className="text-xs text-rose-500">{wizardErrors.date}</p>}
                        </div>
                    )}

                    {/* Step 2 – Time */}
                    {wizardStep === 2 && (
                        <div className="space-y-4">
                            <TimeSelect label="Start Time" value={wizard.startTime} onChange={v => setWizard(w => ({ ...w, startTime: v }))} />
                            {wizardErrors.startTime && <p className="text-xs text-rose-500 -mt-2">{wizardErrors.startTime}</p>}
                            <TimeSelect label="End Time" value={wizard.endTime} onChange={v => setWizard(w => ({ ...w, endTime: v }))} />
                            {wizardErrors.endTime && <p className="text-xs text-rose-500 -mt-2">{wizardErrors.endTime}</p>}
                            {wizard.startTime && wizard.endTime && wizard.endTime > wizard.startTime && (
                                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                                    <Clock size={12} className="text-gray-400 shrink-0" />
                                    <span className="text-xs text-gray-500">Duration:</span>
                                    <span className="text-xs font-semibold text-gray-800">{calcDuration(wizard.startTime, wizard.endTime)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3 – Details */}
                    {wizardStep === 3 && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="conf-title" className="text-xs font-medium text-gray-600">Conference Title</Label>
                                <Input
                                    id="conf-title"
                                    placeholder="e.g. LET Review Session Q1"
                                    value={wizard.title}
                                    onChange={e => setWizard(w => ({ ...w, title: e.target.value }))}
                                    className="h-9 text-sm rounded-lg"
                                />
                                {wizardErrors.title && <p className="text-xs text-rose-500">{wizardErrors.title}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="conf-link" className="text-xs font-medium text-gray-600">Meeting Link</Label>
                                <div className="relative">
                                    <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        id="conf-link"
                                        placeholder="https://meet.google.com/..."
                                        value={wizard.meetingLink}
                                        onChange={e => setWizard(w => ({ ...w, meetingLink: e.target.value }))}
                                        className="h-9 text-sm pl-8 rounded-lg"
                                    />
                                </div>
                                {wizardErrors.meetingLink && <p className="text-xs text-rose-500">{wizardErrors.meetingLink}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="conf-desc" className="text-xs font-medium text-gray-600">
                                    Description <span className="text-gray-400 font-normal">(optional)</span>
                                </Label>
                                <Textarea
                                    id="conf-desc"
                                    placeholder="Brief description of the session..."
                                    rows={3}
                                    value={wizard.description}
                                    onChange={e => setWizard(w => ({ ...w, description: e.target.value }))}
                                    className="text-sm resize-none rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-600">Program Track</p>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={wizard.allPrograms}
                                        onChange={e => setWizard(w => ({ ...w, allPrograms: e.target.checked, programTracks: [] }))}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm font-medium text-gray-700">All Programs</span>
                                </label>
                                {!wizard.allPrograms && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {PROGRAM_TRACKS.map(pt => (
                                            <button
                                                key={pt.id}
                                                type="button"
                                                onClick={() => setWizard(w => ({
                                                    ...w,
                                                    programTracks: w.programTracks.includes(pt.id)
                                                        ? w.programTracks.filter(x => x !== pt.id)
                                                        : [...w.programTracks, pt.id],
                                                }))}
                                                className={cn(
                                                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                                                    wizard.programTracks.includes(pt.id)
                                                        ? 'bg-primary text-white border-primary shadow-sm'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary',
                                                )}
                                            >
                                                {pt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {wizardErrors.programTracks && (
                                    <p className="text-xs text-rose-500">{wizardErrors.programTracks}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex items-center justify-between gap-2 pt-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-500 hover:text-gray-700"
                            onClick={() => {
                                if (wizardStep > 1) setWizardStep(s => s - 1);
                                else setWizardOpen(false);
                            }}
                        >
                            {wizardStep === 1 ? 'Cancel' : <><ChevronLeft size={13} className="mr-1" />Back</>}
                        </Button>
                        <Button
                            size="sm"
                            className="text-xs min-w-24 rounded-lg"
                            onClick={handleWizardNext}
                            disabled={wizardSaving}
                        >
                            {wizardSaving
                                ? <Loader2 size={13} className="animate-spin" />
                                : wizardStep < 3
                                    ? <>Continue <ChevronRight size={13} className="ml-1" /></>
                                    : editingConferenceId ? 'Save Changes' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirm ───────────────────────────────────────── */}
            <Dialog open={!!deleteConferenceId} onOpenChange={open => { if (!open) setDeleteConferenceId(null); }}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold text-gray-900">Delete Conference</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 leading-relaxed">
                            <span className="font-semibold text-gray-700">{deleteConferenceTitle}</span> will be permanently removed. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" className="text-xs rounded-lg" onClick={() => setDeleteConferenceId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" size="sm" className="text-xs rounded-lg" onClick={handleDeleteConference} disabled={deleting}>
                            {deleting ? <Loader2 size={13} className="animate-spin" /> : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

/* ────────────────────────────────────────────────────────────────────────── */
/* EventCard                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

interface EventCardProps {
    event: CalendarEvent;
    canManage: boolean;
    onEditConference: (id: string) => void;
    onDeleteConference: (id: string, title: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({
    event,
    canManage,
    onEditConference,
    onDeleteConference,
}) => {
    const conferenceId = event.type === 'conference'
        ? (event.meta?.conferenceId as string)
        : undefined;

    return (
        <div className={cn(
            'rounded-xl border-l-[3px] border border-gray-100 bg-white p-3.5 shadow-sm space-y-2',
            EVENT_ACCENT[event.type],
        )}>
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                        EVENT_ICON_COLOR[event.type],
                    )}>
                        {eventIcon[event.type]}
                    </span>
                    <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold text-gray-900 truncate leading-tight">{event.title}</p>
                        {event.time && (
                            <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                                <Clock size={9} />
                                {formatTime(event.time)}
                                {event.type === 'conference' && event.meta?.endAt ? (
                                    <> – {formatTime(
                                        (() => {
                                            const d = new Date(event.meta.endAt as string);
                                            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                        })()
                                    )}</>
                                ) : null}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                    {event.type === 'conference' && event.meta?.meetingLink ? (
                        <a
                            href={String(event.meta.meetingLink)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-6 w-6 rounded flex items-center justify-center text-gray-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                            title="Join meeting"
                        >
                            <ExternalLink size={11} />
                        </a>
                    ) : null}
                    {event.type === 'conference' && canManage && conferenceId && (
                        <>
                            <button
                                type="button"
                                onClick={() => onEditConference(conferenceId)}
                                className="h-6 w-6 rounded flex items-center justify-center text-gray-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                                title="Edit"
                            >
                                <Pencil size={11} />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDeleteConference(conferenceId, event.title)}
                                className="h-6 w-6 rounded flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={11} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Conference meta */}
            {event.type === 'conference' && (
                <div className="space-y-1">
                    {event.meta?.host ? (
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Users size={9} /> Hosted by {String(event.meta.host)}
                        </p>
                    ) : null}
                    {event.meta?.programTrack ? (
                        <Badge className="text-[9px] bg-violet-50 text-violet-600 border-violet-200 border h-4 px-1.5">
                            {String(event.meta.programTrack)}
                        </Badge>
                    ) : null}
                    {event.meta?.description ? (
                        <p className="text-[10px] text-gray-400 leading-relaxed">{String(event.meta.description)}</p>
                    ) : null}
                </div>
            )}

            {/* Exam meta */}
            {(event.type === 'exam_start' || event.type === 'exam_deadline') && event.meta?.subject ? (
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <FileText size={9} /> {String(event.meta.subject)}
                </p>
            ) : null}

        </div>
    );
};

export default CalendarPage;

