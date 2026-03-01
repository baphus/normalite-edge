import React, { useEffect, useState } from 'react';
import { Video, Clock3, CalendarIcon, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Types / helpers (mirrors VideoConferencePage logic)                  */
/* ------------------------------------------------------------------ */
interface ConferenceItem {
    id: string;
    title: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    meetingLink?: string;
    isToday: boolean;
}

const normalizeDate = (raw: unknown): string => {
    if (!raw) return '';
    const d = new Date(raw as string);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

const normalizeTime = (raw: unknown): string => {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    return raw.trim().slice(0, 5);
};

const formatDisplayTime = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
};

const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* ------------------------------------------------------------------ */
/* Component                                                             */
/* ------------------------------------------------------------------ */
interface ConferencesWidgetProps {
    /** Compact card style (admin dashboard right column) vs standard */
    compact?: boolean;
}

const ConferencesWidget: React.FC<ConferencesWidgetProps> = ({ compact = true }) => {
    const [items, setItems] = useState<ConferenceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await api.get('/sessions');
                const payload = res.data?.data;
                const list: any[] = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.items)
                        ? payload.items
                        : [];

                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];

                const mapped: ConferenceItem[] = list
                    .map((s) => {
                        const startAt = s.startAt ? new Date(s.startAt) : null;
                        const endAt = s.endAt ? new Date(s.endAt) : null;
                        const scheduledDate = normalizeDate(s.scheduledDate || s.startAt);
                        const startTime = startAt
                            ? `${startAt.getHours().toString().padStart(2, '0')}:${startAt.getMinutes().toString().padStart(2, '0')}`
                            : normalizeTime(s.startTime);
                        const endTime = endAt
                            ? `${endAt.getHours().toString().padStart(2, '0')}:${endAt.getMinutes().toString().padStart(2, '0')}`
                            : normalizeTime(s.endTime);
                        return { id: s.id, title: s.title, scheduledDate, startTime, endTime, meetingLink: s.meetingLink, isToday: scheduledDate === todayStr };
                    })
                    .filter((s) => {
                        if (!s.scheduledDate || !s.startTime) return false;
                        const start = new Date(`${s.scheduledDate}T${s.startTime}:00`);
                        return !Number.isNaN(start.getTime()) && start >= now || s.isToday;
                    })
                    .filter((s) => {
                        // keep today + future (not past)
                        const end = new Date(`${s.scheduledDate}T${(s.endTime || s.startTime)}:00`);
                        return !Number.isNaN(end.getTime()) && end >= now;
                    })
                    .sort((a, b) => {
                        const da = new Date(`${a.scheduledDate}T${a.startTime}:00`).getTime();
                        const db = new Date(`${b.scheduledDate}T${b.startTime}:00`).getTime();
                        return da - db;
                    });

                setTotal(mapped.length);
                setItems(mapped.slice(0, 5));
            } catch {
                setItems([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const todayCount = items.filter((i) => i.isToday).length;
    const upcomingCount = total - todayCount;

    return (
        <Card className={cn('border-gray-100 shadow-sm rounded-lg', compact ? '' : '')}>
            <CardHeader className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Video size={12} /> Conferences
                    </CardTitle>
                    <Link to="/conferences">
                        <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">
                            View all
                        </Button>
                    </Link>
                </div>
                {!loading && total > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                        {todayCount > 0 && (
                            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold px-1.5 py-0 h-4">
                                {todayCount} today
                            </Badge>
                        )}
                        {upcomingCount > 0 && (
                            <Badge className="bg-gray-100 text-gray-500 border-none text-[9px] font-semibold px-1.5 py-0 h-4">
                                +{upcomingCount} upcoming
                            </Badge>
                        )}
                    </div>
                )}
            </CardHeader>

            <CardContent className="px-4 pb-3 pt-0">
                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 size={14} className="animate-spin text-gray-300" />
                    </div>
                ) : items.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No conferences scheduled.</p>
                ) : (
                    <div className="space-y-0">
                        {items.map((item) => (
                            <div key={item.id} className="py-2 border-b border-gray-50 last:border-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-[12px] font-semibold text-gray-800 leading-tight flex-1 truncate">{item.title}</p>
                                    {item.isToday && (
                                        <Badge className="shrink-0 bg-primary/10 text-primary border-none text-[9px] font-bold px-1.5 py-0 h-4">
                                            Today
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    {!item.isToday && (
                                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                            <CalendarIcon size={9} /> {formatShortDate(item.scheduledDate)}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                        <Clock3 size={9} /> {formatDisplayTime(item.startTime)}
                                        {item.endTime && ` – ${formatDisplayTime(item.endTime)}`}
                                    </span>
                                </div>
                                {item.meetingLink && item.isToday && (
                                    <a
                                        href={item.meetingLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-primary hover:underline"
                                    >
                                        Join <ExternalLink size={9} />
                                    </a>
                                )}
                            </div>
                        ))}
                        {total > 5 && (
                            <div className="pt-2">
                                <Link to="/conferences">
                                    <p className="text-[10px] text-primary font-semibold hover:underline">
                                        +{total - 5} more conferences →
                                    </p>
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ConferencesWidget;
