import React, { useState } from 'react';
import {
    Search,
    Download,
    RefreshCw,
    Calendar,
    User,
    Shield,
    AlertCircle,
    Info,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    SearchX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Initial empty state for logs
const initialLogs: any[] = [];

const LogsPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [targetFilter, setTargetFilter] = useState('all');

    const filteredLogs = initialLogs.filter(log => {
        const matchesSearch = log.user.toLowerCase().includes(search.toLowerCase()) ||
            log.action.toLowerCase().includes(search.toLowerCase()) ||
            log.details.toLowerCase().includes(search.toLowerCase());
        const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
        const matchesTarget = targetFilter === 'all' || log.target === targetFilter;
        return matchesSearch && matchesLevel && matchesTarget;
    });

    const getLevelBadge = (level: string) => {
        switch (level) {
            case 'info': return <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-1 flex items-center gap-1.5"><Info size={10} /> Info</Badge>;
            case 'success': return <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-1 flex items-center gap-1.5"><CheckCircle2 size={10} /> Success</Badge>;
            case 'warning': return <Badge className="bg-amber-50 text-amber-600 border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-1 flex items-center gap-1.5"><AlertCircle size={10} /> Warning</Badge>;
            case 'error': return <Badge className="bg-red-50 text-red-600 border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-1 flex items-center gap-1.5"><AlertCircle size={10} /> Error</Badge>;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">System Logs</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Audit trail and activity tracking for administrative compliance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-11 rounded-2xl px-6 font-black border-gray-100 gap-2 uppercase tracking-widest text-[10px]">
                        <Download size={16} /> Export Logs
                    </Button>
                    <Button className="h-11 rounded-2xl px-6 bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 gap-2 uppercase tracking-widest text-[10px]">
                        <RefreshCw size={16} /> Refresh
                    </Button>
                </div>
            </header>

            {/* Filters Bar */}
            <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 bg-white overflow-hidden">
                <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={18} />
                            <Input
                                placeholder="Search by user, action, or details..."
                                className="pl-11 h-12 rounded-[1.25rem] border-gray-100 bg-gray-50/50 shadow-none focus:ring-primary/20 font-bold"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Select value={levelFilter} onValueChange={setLevelFilter}>
                                <SelectTrigger className="w-full md:w-40 h-12 rounded-[1.25rem] border-gray-100 font-black text-[10px] uppercase tracking-widest bg-white focus:ring-primary/20">
                                    <SelectValue placeholder="All Levels" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Levels</SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="success">Success</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="error">Error</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={targetFilter} onValueChange={setTargetFilter}>
                                <SelectTrigger className="w-full md:w-40 h-12 rounded-[1.25rem] border-gray-100 font-black text-[10px] uppercase tracking-widest bg-white focus:ring-primary/20">
                                    <SelectValue placeholder="All Targets" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Targets</SelectItem>
                                    <SelectItem value="Exams">Exams</SelectItem>
                                    <SelectItem value="Users">Users</SelectItem>
                                    <SelectItem value="System">System</SelectItem>
                                    <SelectItem value="Materials">Materials</SelectItem>
                                    <SelectItem value="Auth">Auth</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" className="h-12 w-12 rounded-[1.25rem] border border-gray-100 p-0 hover:bg-gray-50 shrink-0">
                                <Calendar size={18} className="text-gray-400" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 bg-white overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-gray-50">
                                <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest text-gray-400 h-14">Timestamp</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 h-14">User</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 h-14">Action</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 h-14">Details</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 h-14">Category</TableHead>
                                <TableHead className="pr-8 text-[10px] font-black uppercase tracking-widest text-gray-400 h-14 text-center">Level</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} className="group hover:bg-gray-50/50 transition-colors border-gray-50">
                                        <TableCell className="pl-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{log.timestamp.split(' ')[1]}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{log.timestamp.split(' ')[0]}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-xl ${log.user === 'System' ? 'bg-gray-100 text-gray-500' : 'bg-primary/10 text-primary'} flex items-center justify-center font-black text-[10px]`}>
                                                    {log.user === 'System' ? <Shield size={14} /> : <User size={14} />}
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm">{log.user}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5 font-black text-xs text-gray-700 uppercase tracking-tight">{log.action}</TableCell>
                                        <TableCell className="py-5 text-gray-500 font-medium text-sm max-w-[300px] truncate">{log.details}</TableCell>
                                        <TableCell className="py-5">
                                            <Badge variant="outline" className="rounded-lg font-black text-[9px] px-2 py-0.5 uppercase tracking-widest text-gray-400 border-gray-100">
                                                {log.target}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="pr-8 py-5 text-center">
                                            <div className="flex justify-center">
                                                {getLevelBadge(log.level)}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-96 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center">
                                                <SearchX size={40} className="text-gray-200" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-black text-gray-900 tracking-tight">No logs found</h3>
                                                <p className="text-sm text-gray-400 font-medium italic">Adjust your filters and try again</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => { setSearch(''); setLevelFilter('all'); setTargetFilter('all'); }}
                                                className="mt-2 h-10 rounded-xl font-black border-gray-200 uppercase tracking-widest text-[10px]"
                                            >
                                                Clear All Filters
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination Placeholder */}
            {filteredLogs.length > 0 && (
                <div className="flex items-center justify-between px-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Showing {filteredLogs.length} entries out of {initialLogs.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" disabled className="rounded-xl border border-gray-100 h-10 w-10">
                            <ChevronLeft size={18} />
                        </Button>
                        <div className="flex items-center gap-1 mx-2">
                            <Button className="h-10 w-10 rounded-xl bg-primary text-white font-black shadow-lg shadow-primary/20">1</Button>
                            <Button variant="ghost" className="h-10 w-10 rounded-xl font-black text-gray-400">2</Button>
                            <Button variant="ghost" className="h-10 w-10 rounded-xl font-black text-gray-400">3</Button>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-xl border border-gray-100 h-10 w-10 hover:bg-gray-50">
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogsPage;
