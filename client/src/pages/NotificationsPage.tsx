import React, { useMemo, useState } from 'react';
import {
    CheckCircle2,
    AlertCircle,
    Info,
    FileText,
    BookOpen,
    Users,
    Zap,
    Video,
    Check,
    CheckCheck,
    RefreshCw,
    Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNotifications, type NotificationItem } from '@/contexts/NotificationContext';

// ─── types & helpers ─────────────────────────────────────────────────────────

type FilterKey = 'all' | 'unread' | 'exam' | 'material' | 'conference' | 'user' | 'system';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',        label: 'All' },
    { key: 'unread',     label: 'Unread' },
    { key: 'exam',       label: 'Exams' },
    { key: 'material',   label: 'Materials' },
    { key: 'conference', label: 'Conferences' },
    { key: 'user',       label: 'Users' },
    { key: 'system',     label: 'System' },
];

function resolveCategory(n: NotificationItem): FilterKey {
    const t = (n.entityType ?? n.type ?? '').toLowerCase();
    if (t.includes('exam') || t.includes('attempt') || t.includes('quiz'))                              return 'exam';
    if (t.includes('deck') || t.includes('material') || t.includes('study'))                          return 'material';
    if (t.includes('conference') || t.includes('meeting') || t.includes('session') || t.includes('zoom') || t.includes('video')) return 'conference';
    if (t.includes('user') || t.includes('account') || t.includes('register') || t.includes('approval')) return 'user';
    return 'system';
}

function bucketLabel(dateStr: string): string {
    const now        = new Date();
    const d          = new Date(dateStr);
    const diffMs     = now.getTime() - d.getTime();
    const diffDays   = Math.floor(diffMs / 86_400_000);
    const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

    if (d >= todayStart)     return 'Today';
    if (d >= yesterdayStart) return 'Yesterday';
    if (diffDays < 7)        return 'Last 7 days';
    if (diffDays < 30)       return 'Last 30 days';
    return 'Older';
}

const BUCKET_ORDER = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Older'] as const;

function formatTime(dateStr: string): string {
    const d      = new Date(dateStr);
    const bucket = bucketLabel(dateStr);
    if (bucket === 'Today')
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── icon ────────────────────────────────────────────────────────────────────

function NotifIcon({ type, entityType }: Pick<NotificationItem, 'type' | 'entityType'>) {
    const cat = resolveCategory({ type, entityType } as NotificationItem);
    const cls = 'h-4 w-4';
    if (cat === 'exam')       return <FileText className={cn(cls, 'text-violet-500')} />;
    if (cat === 'material')   return <BookOpen  className={cn(cls, 'text-blue-500')} />;
    if (cat === 'conference') return <Video     className={cn(cls, 'text-sky-500')} />;
    if (cat === 'user')       return <Users     className={cn(cls, 'text-emerald-500')} />;
    const t = type.toLowerCase();
    if (t === 'success')    return <CheckCircle2 className={cn(cls, 'text-green-500')} />;
    if (t === 'warning')    return <AlertCircle  className={cn(cls, 'text-amber-500')} />;
    if (t === 'info')       return <Info         className={cn(cls, 'text-blue-500')} />;
    return <Zap className={cn(cls, 'text-primary')} />;
}

const ICON_BG: Record<FilterKey, string> = {
    all:        'bg-gray-50',
    unread:     'bg-primary/10',
    exam:       'bg-violet-50',
    material:   'bg-blue-50',
    conference: 'bg-sky-50',
    user:       'bg-emerald-50',
    system:     'bg-amber-50',
};

const BADGE_COLOR: Record<FilterKey, string> = {
    all:        'bg-gray-100 text-gray-500',
    unread:     'bg-primary/10 text-primary',
    exam:       'bg-violet-100 text-violet-600',
    material:   'bg-blue-100 text-blue-600',
    conference: 'bg-sky-100 text-sky-600',
    user:       'bg-emerald-100 text-emerald-600',
    system:     'bg-amber-100 text-amber-600',
};

// ─── notification row ────────────────────────────────────────────────────────

type EnrichedNotif = NotificationItem & { category: FilterKey };

const NotifRow: React.FC<{ n: EnrichedNotif; onRead: () => void }> = ({ n, onRead }) => (
    <div
        className={cn(
            'group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50/80',
            !n.isRead && 'bg-primary/3',
        )}
    >
        {/* unread dot */}
        <div className="mt-[0.7rem] flex w-2 shrink-0 justify-center">
            {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary block" />}
        </div>

        {/* icon badge */}
        <div className={cn('mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', ICON_BG[n.category])}>
            <NotifIcon type={n.type} entityType={n.entityType} />
        </div>

        {/* body */}
        <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
                <p className={cn(
                    'text-sm leading-snug',
                    n.isRead ? 'font-normal text-gray-600' : 'font-semibold text-gray-900',
                )}>
                    {n.title}
                </p>
                <span className="shrink-0 text-[11px] text-gray-400 tabular-nums mt-px">
                    {formatTime(n.createdAt)}
                </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
                {n.message}
            </p>
            <div className="mt-1.5">
                <Badge
                    className={cn(
                        'h-4 rounded px-1.5 text-[9px] font-semibold uppercase tracking-wider border-0',
                        BADGE_COLOR[n.category],
                    )}
                >
                    {n.category}
                </Badge>
            </div>
        </div>

        {/* mark-read — appears on hover */}
        {!n.isRead && (
            <button
                onClick={onRead}
                title="Mark as read"
                className="mt-1 shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity
                           hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
            >
                <Check size={13} />
            </button>
        )}
    </div>
);

// ─── page ────────────────────────────────────────────────────────────────────

const NotificationsPage: React.FC = () => {
    const { notifications, unreadCount, loading, refreshNotifications, markAllAsRead, markAsRead } =
        useNotifications();

    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

    // attach category
    const enriched = useMemo<EnrichedNotif[]>(
        () => notifications.map(n => ({ ...n, category: resolveCategory(n) })),
        [notifications],
    );

    // tab counts
    const counts = useMemo(() => {
        const c = { all: 0, unread: 0, exam: 0, material: 0, conference: 0, user: 0, system: 0 } as Record<FilterKey, number>;
        enriched.forEach(n => {
            c.all++;
            if (!n.isRead) c.unread++;
            c[n.category]++;
        });
        return c;
    }, [enriched]);

    // filtered list
    const filtered = useMemo<EnrichedNotif[]>(() => {
        if (activeFilter === 'all')    return enriched;
        if (activeFilter === 'unread') return enriched.filter(n => !n.isRead);
        return enriched.filter(n => n.category === activeFilter);
    }, [enriched, activeFilter]);

    // group by date bucket
    const grouped = useMemo(() => {
        const map: Partial<Record<string, EnrichedNotif[]>> = {};
        filtered.forEach(n => {
            const lbl = bucketLabel(n.createdAt);
            (map[lbl] ??= []).push(n);
        });
        return BUCKET_ORDER.filter(l => map[l]).map(label => ({ label, items: map[label]! }));
    }, [filtered]);

    return (
        <div className="flex flex-col gap-4 font-lexend pb-8 w-full">

            {/* ── header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">Notifications</h1>
                    <p className="mt-0.5 text-xs text-gray-400">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} · Live updates enabled
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600"
                        onClick={refreshNotifications}
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 gap-1.5 rounded-lg border-gray-200 px-3 text-xs font-medium text-gray-600 disabled:opacity-40"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                    >
                        <CheckCheck size={13} />
                        Mark all read
                    </Button>
                </div>
            </div>

            {/* ── filter tabs ── */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setActiveFilter(f.key)}
                        className={cn(
                            'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors',
                            activeFilter === f.key
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
                        )}
                    >
                        {f.label}
                        {counts[f.key] > 0 && (
                            <span className={cn(
                                'rounded-full px-1.5 py-px text-[10px] font-semibold leading-none',
                                activeFilter === f.key
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-100 text-gray-500',
                            )}>
                                {counts[f.key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── feed ── */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {loading ? (
                    /* skeleton rows */
                    <div className="divide-y divide-gray-100">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex animate-pulse items-start gap-3 px-4 py-3">
                                <div className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-gray-100" />
                                <div className="h-8 w-8 shrink-0 rounded-lg bg-gray-100" />
                                <div className="flex-1 space-y-2 py-0.5">
                                    <div className="h-3 w-2/3 rounded bg-gray-100" />
                                    <div className="h-2.5 w-5/6 rounded bg-gray-100" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : grouped.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {grouped.map(({ label, items }) => (
                            <div key={label}>
                                {/* date bucket header */}
                                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                        {label}
                                    </span>
                                    <span className="text-[10px] font-medium text-gray-300">{items.length}</span>
                                </div>

                                {/* notification rows */}
                                {items.map((n, idx) => (
                                    <React.Fragment key={n.id}>
                                        <NotifRow n={n} onRead={() => markAsRead(n.id)} />
                                        {idx < items.length - 1 && (
                                            <div className="ml-17 border-b border-gray-50" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    /* empty state */
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                            <Inbox size={22} className="text-gray-300" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">No notifications</p>
                            <p className="mt-0.5 text-xs text-gray-400">
                                {activeFilter !== 'all'
                                    ? 'Try switching to a different filter.'
                                    : "You're all caught up!"}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
