import React, { useEffect, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Calendar as CalendarIcon,
    Video,
    CheckCircle2,
    Clock3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

/* ─────────────────────────── types ──────────────────────────────── */
type EventType = 'exam_start' | 'exam_deadline' | 'conference' | 'submission';
type EventColor = 'blue' | 'red' | 'violet' | 'green';

interface CalendarEvent {
    id: string;
    type: EventType;
    title: string;
    date: string;   // YYYY-MM-DD
    time?: string;  // HH:mm
    color: EventColor;
    meta?: Record<string, unknown>;
}

/* ─────────────────────────── helpers ────────────────────────────── */
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const colorDot: Record<EventColor, string> = {
    blue:   'bg-blue-500',
    red:    'bg-red-500',
    violet: 'bg-violet-500',
    green:  'bg-emerald-500',
};

const colorBadge: Record<EventColor, string> = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    green:  'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const typeIcon: Record<EventType, React.ReactNode> = {
    exam_start:    <FileText size={10} />,
    exam_deadline: <FileText size={10} />,
    conference:    <Video size={10} />,
    submission:    <CheckCircle2 size={10} />,
};

const typeLabel: Record<EventType, string> = {
    exam_start:    'Exam Start',
    exam_deadline: 'Deadline',
    conference:    'Conference',
    submission:    'Submission',
};

const formatTime = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
};

const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const firstDayOfWeek = (year: number, month: number) => new Date(year, month, 1).getDay();

/* ─────────────────────────── component ─────────────────────────── */
const CalendarEventsWidget: React.FC = () => {
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-based
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<string | null>(null); // YYYY-MM-DD or null

    const todayYMD = toYMD(now);

    /* fetch whenever viewYear/viewMonth changes */
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        api.get('/calendar', { params: { year: viewYear, month: viewMonth + 1 } })
            .then((res) => {
                if (!cancelled) setEvents((res.data?.data as CalendarEvent[]) || []);
            })
            .catch(() => {
                if (!cancelled) setEvents([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [viewYear, viewMonth]);

    /* build event lookup by date */
    const byDate = React.useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        events.forEach((ev) => {
            const list = map.get(ev.date) || [];
            list.push(ev);
            map.set(ev.date, list);
        });
        return map;
    }, [events]);

    /* today's events */
    const todayEvents = React.useMemo(() => {
        return (byDate.get(todayYMD) || []).sort((a, b) =>
            (a.time || '00:00').localeCompare(b.time || '00:00'),
        );
    }, [byDate, todayYMD]);

    /* upcoming events: strictly future (after today), sorted asc */
    const upcoming = React.useMemo(() => {
        return events
            .filter((ev) => ev.date > todayYMD)
            .sort((a, b) => {
                const da = a.date + (a.time || '00:00');
                const db = b.date + (b.time || '00:00');
                return da.localeCompare(db);
            })
            .slice(0, 8);
    }, [events, todayYMD]);

    /* selected day events */
    const selectedEvents = selectedDay ? (byDate.get(selectedDay) || []) : null;

    /* ── calendar grid ── */
    const totalDays = daysInMonth(viewYear, viewMonth);
    const startDow = firstDayOfWeek(viewYear, viewMonth);
    const cells: (number | null)[] = [
        ...Array(startDow).fill(null),
        ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ];

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
        else setViewMonth((m) => m - 1);
        setSelectedDay(null);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
        else setViewMonth((m) => m + 1);
        setSelectedDay(null);
    };

    const cellYMD = (day: number) =>
        `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return (
        <Card className="border-gray-100 shadow-sm rounded-lg">
            <CardHeader className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <CalendarIcon size={12} /> Calendar
                    </CardTitle>
                    <Link to="/calendar">
                        <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">
                            Open
                        </Button>
                    </Link>
                </div>
            </CardHeader>

            <CardContent className="px-3 pb-3 pt-0 space-y-3">
                {/* ── month navigation ── */}
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={prevMonth}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
                    >
                        <ChevronLeft size={13} />
                    </button>
                    <span className="text-[11px] font-bold text-gray-700">
                        {MONTH_NAMES[viewMonth]} {viewYear}
                    </span>
                    <button
                        type="button"
                        onClick={nextMonth}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
                    >
                        <ChevronRight size={13} />
                    </button>
                </div>

                {/* ── day-of-week headers ── */}
                <div className="grid grid-cols-7">
                    {DOW.map((d) => (
                        <div key={d} className="text-center text-[9px] font-bold uppercase text-gray-400 pb-1">
                            {d}
                        </div>
                    ))}

                    {/* ── day cells ── */}
                    {cells.map((day, idx) => {
                        if (day === null) return <div key={`empty-${idx}`} />;
                        const ymd = cellYMD(day);
                        const isToday = ymd === todayYMD;
                        const isSelected = ymd === selectedDay;
                        const dayEvents = byDate.get(ymd) || [];
                        const hasEvents = dayEvents.length > 0;
                        // unique colors for dots (max 3)
                        const dotColors = [...new Set(dayEvents.map((e) => e.color))].slice(0, 3);

                        return (
                            <button
                                key={ymd}
                                type="button"
                                onClick={() => setSelectedDay(isSelected ? null : ymd)}
                                className={cn(
                                    'relative flex flex-col items-center py-0.5 rounded transition-colors',
                                    isSelected && 'bg-primary/10',
                                    !isSelected && isToday && 'bg-primary/5',
                                    !isSelected && !isToday && hasEvents && 'hover:bg-gray-100',
                                    !isSelected && !isToday && !hasEvents && 'hover:bg-gray-50',
                                )}
                            >
                                <span
                                    className={cn(
                                        'text-[11px] font-semibold leading-5 w-5 h-5 flex items-center justify-center rounded-full',
                                        isToday && !isSelected && 'text-primary font-bold',
                                        isSelected && 'bg-primary text-white font-bold',
                                        !isToday && !isSelected && 'text-gray-700',
                                    )}
                                >
                                    {day}
                                </span>

                                {/* event dots */}
                                <div className="flex gap-0.5 items-center h-1.5 mt-0.5">
                                    {dotColors.map((c) => (
                                        <span key={c} className={cn('w-1 h-1 rounded-full', colorDot[c])} />
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ── selected day events (inline) ── */}
                {selectedEvents && selectedEvents.length > 0 && (
                    <div className="rounded-md border border-gray-100 bg-gray-50/70 overflow-hidden">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 px-2.5 pt-2 pb-1">
                            {new Date(selectedDay! + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        {selectedEvents.map((ev) => (
                            <div key={ev.id} className="px-2.5 py-1.5 border-t border-gray-100 flex items-center gap-2">
                                <span className={cn('shrink-0 w-1 h-4 rounded-full', colorDot[ev.color])} />
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">{ev.title}</p>
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                        {typeIcon[ev.type]}
                                        {typeLabel[ev.type]}{ev.time ? ` · ${formatTime(ev.time)}` : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {selectedEvents && selectedEvents.length === 0 && (
                    <div className="rounded-md border border-gray-100 bg-gray-50/70 px-2.5 py-2">
                        <p className="text-[11px] text-gray-400">No events on this day.</p>
                    </div>
                )}

                {/* ── today's events ── */}
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Today</p>
                        <div className="flex-1 h-px bg-primary/20" />
                    </div>
                    {loading ? (
                        <p className="text-[11px] text-gray-400">Loading...</p>
                    ) : todayEvents.length === 0 ? (
                        <p className="text-[11px] text-gray-400">No events today.</p>
                    ) : (
                        <div className="rounded-md border border-gray-100 bg-gray-50/70 overflow-hidden">
                            {todayEvents.map((ev) => (
                                <div key={ev.id} className="px-2.5 py-1.5 border-t first:border-t-0 border-gray-100 flex items-center gap-2">
                                    <span className={cn('shrink-0 w-1 h-4 rounded-full', colorDot[ev.color])} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">{ev.title}</p>
                                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                            {typeIcon[ev.type]}
                                            {typeLabel[ev.type]}{ev.time ? ` · ${formatTime(ev.time)}` : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── upcoming timeline ── */}
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Upcoming</p>
                    {loading ? (
                        <p className="text-[11px] text-gray-400">Loading...</p>
                    ) : upcoming.length === 0 ? (
                        <p className="text-[11px] text-gray-400">No upcoming events.</p>
                    ) : (
                        <div className="space-y-0">
                            {upcoming.map((ev, idx) => {
                                const isFirst = idx === 0 || upcoming[idx - 1].date !== ev.date;
                                const evDate = new Date(ev.date + 'T00:00:00');
                                const isEvToday = ev.date === todayYMD;
                                const dateLabel = isEvToday
                                    ? 'Today'
                                    : evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                                return (
                                    <div key={ev.id}>
                                        {isFirst && (
                                            <div className="flex items-center gap-2 pt-1 pb-0.5">
                                                <span className={cn(
                                                    'text-[9px] font-bold uppercase tracking-wider',
                                                    isEvToday ? 'text-primary' : 'text-gray-400',
                                                )}>
                                                    {dateLabel}
                                                </span>
                                                <div className="flex-1 h-px bg-gray-100" />
                                            </div>
                                        )}
                                        <div className="flex items-start gap-2 py-1.5 pl-1">
                                            {/* timeline dot + line */}
                                            <div className="flex flex-col items-center shrink-0 mt-0.5">
                                                <span className={cn('w-2 h-2 rounded-full shrink-0', colorDot[ev.color])} />
                                                {idx < upcoming.length - 1 && (
                                                    <div className="w-px flex-1 bg-gray-200 mt-0.5 h-3" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-[11px] font-semibold text-gray-800 leading-tight truncate max-w-35">{ev.title}</p>
                                                    <Badge className={cn('text-[8px] font-bold border px-1 py-0 leading-4 shrink-0', colorBadge[ev.color])}>
                                                        {typeLabel[ev.type]}
                                                    </Badge>
                                                </div>
                                                {ev.time && (
                                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <Clock3 size={9} /> {formatTime(ev.time)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default CalendarEventsWidget;
