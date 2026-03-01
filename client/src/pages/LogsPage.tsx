import React, { useEffect, useMemo, useState } from 'react';
import {
    Clock3,
    Search,
    Download,
    RefreshCw,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    SearchX,
    Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';

type AuditLog = {
    id: string;
    actorId: string;
    actorRole: 'ADMIN' | 'REVIEWER' | 'REVIEWEE';
    action: string;
    entityType: string;
    entityId?: string | null;
    summary?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
    actor?: {
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
    };
};

const extractTitle = (log: AuditLog): string | null => {
    const metadata = (log.metadata || {}) as Record<string, unknown>;
    const titleKeys = ['title', 'name', 'examTitle', 'deckTitle', 'materialTitle', 'sessionTitle', 'entityTitle'];

    for (const key of titleKeys) {
        const value = metadata[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }

    const summary = (log.summary || '').trim();
    if (!summary) return null;

    const separators = [':', ' - ', ' — '];
    for (const separator of separators) {
        const idx = summary.indexOf(separator);
        if (idx >= 0 && idx < summary.length - separator.length) {
            const possible = summary.slice(idx + separator.length).trim();
            if (possible.length > 0) return possible;
        }
    }

    return null;
};

const actionTone = (action: string) => {
    if (action === 'DELETE' || action === 'REJECT') return 'bg-red-50 text-red-700 border-red-100';
    if (action === 'CREATE' || action === 'REGISTER' || action === 'LOGIN') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (action === 'UPDATE' || action === 'ROLE_CHANGE') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (action === 'ACCESS') return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-amber-50 text-amber-700 border-amber-100';
};

const formatActor = (log: AuditLog) => {
    const name = [log.actor?.firstName, log.actor?.lastName].filter(Boolean).join(' ').trim();
    return name || log.actor?.email || 'Unknown User';
};

const formatTime = (date: string) => {
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
};

const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const LogsPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [entityFilter, setEntityFilter] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [activePreset, setActivePreset] = useState<'today' | 'last7' | 'last30' | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/audit/logs', {
                params: {
                    page,
                    limit,
                    search: search || undefined,
                    action: actionFilter === 'all' ? undefined : actionFilter,
                    actorRole: roleFilter === 'all' ? undefined : roleFilter,
                    entityType: entityFilter === 'all' ? undefined : entityFilter,
                    from: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
                    to: toDate ? `${toDate}T23:59:59.999Z` : undefined,
                },
            });

            const data = (response.data?.data || []) as AuditLog[];
            setLogs(data);
            setTotal(response.data?.meta?.total || data.length);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to load audit logs');
            setLogs([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter, roleFilter, entityFilter, fromDate, toDate]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setPage(1);
            fetchLogs();
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    const entityOptions = useMemo(() => {
        const values = new Set<string>();
        logs.forEach((item) => {
            if (item.entityType) values.add(item.entityType);
        });
        return Array.from(values).sort();
    }, [logs]);

    const exportPageAsCsv = () => {
        if (!logs.length) return;
        const header = ['Timestamp', 'Actor', 'Role', 'Action', 'Entity', 'Summary'];
        const rows = logs.map((log) => [
            formatTime(log.createdAt),
            formatActor(log),
            log.actorRole,
            log.action,
            log.entityType,
            (log.summary || '').replace(/\n/g, ' '),
        ]);

        const csv = [header, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `audit-logs-page-${page}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const applyRangePreset = (days: 1 | 7 | 30) => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - (days - 1));

        setPage(1);
        setFromDate(toDateInputValue(from));
        setToDate(toDateInputValue(to));
        setActivePreset(days === 1 ? 'today' : days === 7 ? 'last7' : 'last30');
    };

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Audit Logs</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Timeline of platform actions across all roles.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={exportPageAsCsv} className="h-8 rounded-md px-3 font-semibold border-gray-200 gap-1.5 text-xs bg-white">
                        <Download size={13} /> Export CSV
                    </Button>
                    <Button onClick={fetchLogs} className="h-8 rounded-md px-3 bg-primary hover:bg-primary/95 text-white font-semibold gap-1.5 text-xs">
                        <RefreshCw size={13} /> Refresh
                    </Button>
                </div>
            </header>

            {/* Filters Bar */}
            <Card className="rounded-lg border-gray-100 shadow-sm bg-white">
                <CardContent className="p-3">
                    <div className="flex flex-col md:flex-row items-center gap-2.5">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={14} />
                            <Input
                                placeholder="Search by actor, action, entity, or summary..."
                                className="pl-9 h-8 rounded-md border-gray-200 bg-white shadow-none focus:ring-primary/20 text-xs"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger className="w-full md:w-36 h-8 rounded-md border-gray-200 font-semibold text-xs bg-white focus:ring-primary/20">
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    <SelectItem value="ACCESS">Access</SelectItem>
                                    <SelectItem value="CREATE">Create</SelectItem>
                                    <SelectItem value="UPDATE">Update</SelectItem>
                                    <SelectItem value="DELETE">Delete</SelectItem>
                                    <SelectItem value="LOGIN">Login</SelectItem>
                                    <SelectItem value="LOGOUT">Logout</SelectItem>
                                    <SelectItem value="REGISTER">Register</SelectItem>
                                    <SelectItem value="ROLE_CHANGE">Role Change</SelectItem>
                                    <SelectItem value="APPROVE">Approve</SelectItem>
                                    <SelectItem value="REJECT">Reject</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full md:w-32 h-8 rounded-md border-gray-200 font-semibold text-xs bg-white focus:ring-primary/20">
                                    <SelectValue placeholder="All Roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="REVIEWER">Reviewer</SelectItem>
                                    <SelectItem value="REVIEWEE">Reviewee</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={entityFilter} onValueChange={setEntityFilter}>
                                <SelectTrigger className="w-full md:w-36 h-8 rounded-md border-gray-200 font-semibold text-xs bg-white focus:ring-primary/20">
                                    <SelectValue placeholder="All Entities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Entities</SelectItem>
                                    {entityOptions.map((entity) => (
                                        <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                value={fromDate}
                                max={toDate || undefined}
                                onChange={(e) => {
                                    setPage(1);
                                    setActivePreset(null);
                                    setFromDate(e.target.value);
                                }}
                                className="w-full md:w-36 h-8 rounded-md border-gray-200 bg-white font-medium text-xs"
                                aria-label="From date"
                            />
                            <Input
                                type="date"
                                value={toDate}
                                min={fromDate || undefined}
                                onChange={(e) => {
                                    setPage(1);
                                    setActivePreset(null);
                                    setToDate(e.target.value);
                                }}
                                className="w-full md:w-36 h-8 rounded-md border-gray-200 bg-white font-medium text-xs"
                                aria-label="To date"
                            />
                            <div className="w-full md:w-auto flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    variant={activePreset === 'today' ? 'default' : 'outline'}
                                    onClick={() => applyRangePreset(1)}
                                    className={`h-8 rounded-md px-3 font-semibold text-[11px] ${activePreset === 'today' ? 'bg-primary text-white hover:bg-primary/95' : 'border-gray-200 bg-white'}`}
                                >
                                    Today
                                </Button>
                                <Button
                                    type="button"
                                    variant={activePreset === 'last7' ? 'default' : 'outline'}
                                    onClick={() => applyRangePreset(7)}
                                    className={`h-8 rounded-md px-3 font-semibold text-[11px] ${activePreset === 'last7' ? 'bg-primary text-white hover:bg-primary/95' : 'border-gray-200 bg-white'}`}
                                >
                                    Last 7d
                                </Button>
                                <Button
                                    type="button"
                                    variant={activePreset === 'last30' ? 'default' : 'outline'}
                                    onClick={() => applyRangePreset(30)}
                                    className={`h-8 rounded-md px-3 font-semibold text-[11px] ${activePreset === 'last30' ? 'bg-primary text-white hover:bg-primary/95' : 'border-gray-200 bg-white'}`}
                                >
                                    Last 30d
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Card className="rounded-lg border-red-100 bg-red-50/70">
                    <CardContent className="py-3 px-4 text-red-700 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle size={14} /> {error}
                    </CardContent>
                </Card>
            )}

            {/* Timeline */}
            <Card className="rounded-lg border-gray-100 shadow-sm bg-white">
                <CardContent className="p-4">
                    {loading ? (
                        <div className="h-60 flex items-center justify-center text-xs font-medium text-gray-400">
                            Loading audit timeline...
                        </div>
                    ) : logs.length ? (
                        <div className="relative pl-5">
                            <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-100" />
                            <div className="space-y-3">
                                {logs.map((log) => (
                                    <div key={log.id} className="relative">
                                        <div className="absolute -left-5 top-3 h-3 w-3 rounded-full bg-primary border-2 border-white shadow-sm" />
                                        <div className="border border-gray-100 rounded-md p-3 hover:bg-gray-50/60 transition-colors">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5 mb-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <Badge className={`font-semibold text-[9px] uppercase tracking-wider border ${actionTone(log.action)}`}>
                                                        {log.action}
                                                    </Badge>
                                                    <Badge variant="outline" className="font-semibold text-[9px] uppercase tracking-wider border-gray-200 text-gray-500">
                                                        {log.entityType}
                                                    </Badge>
                                                    <Badge variant="outline" className="font-semibold text-[9px] uppercase tracking-wider border-gray-200 text-gray-500">
                                                        {log.actorRole}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                                    <Clock3 size={11} /> {formatTime(log.createdAt)}
                                                </div>
                                            </div>

                                            <p className="text-[12px] font-semibold text-gray-800 mb-1.5">
                                                {log.summary || `${formatActor(log)} performed ${log.action.toLowerCase()} on ${log.entityType}`}
                                            </p>

                                            {log.action === 'UPDATE' && extractTitle(log) && (
                                                <p className="text-[11px] text-gray-500 font-medium mb-1.5">
                                                    Title: {extractTitle(log)}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                                <span className="inline-flex items-center gap-1"><Shield size={10} /> {formatActor(log)}</span>
                                                {log.actor?.email && <span>· {log.actor.email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-52 flex flex-col items-center justify-center gap-3 text-center">
                            <SearchX size={28} className="text-gray-200" />
                            <div>
                                <h3 className="text-sm font-bold text-gray-700">No audit logs found</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Adjust your filters and try again</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setSearch(''); setActionFilter('all'); setRoleFilter('all'); setEntityFilter('all'); setFromDate(''); setToDate(''); setActivePreset(null); setPage(1); }}
                                className="h-7 rounded-md text-xs border-gray-200"
                            >
                                Clear All Filters
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {!!logs.length && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Showing {logs.length} of {total} entries
                    </p>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={page <= 1}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            className="rounded-md border-gray-200 h-8 w-8 bg-white"
                        >
                            <ChevronLeft size={14} />
                        </Button>
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-gray-600 min-w-8 text-center">{page} / {totalPages}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={page >= totalPages}
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                            className="rounded-md border-gray-200 h-8 w-8 bg-white hover:bg-gray-50"
                        >
                            <ChevronRight size={14} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogsPage;
