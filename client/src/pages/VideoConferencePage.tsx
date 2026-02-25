import React, { useState, useEffect } from 'react';
import {
    Plus,
    Video,
    Users,
    Calendar,
    Edit,
    Trash2,
    Share2,
    Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';

interface Session {
    id: string;
    title: string;
    meetingLink?: string;
    platform?: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    creator?: {
        name: string;
    };
}

const VideoConferencePage: React.FC = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        scheduledDate: '',
        startTime: '',
        endTime: '',
        meetingLink: '',
        platform: 'zoom'
    });

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const response = await api.get('/sessions');
                setSessions(response.data.data.items || response.data.data);
            } catch (error) {
                console.error('Failed to fetch sessions', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
    }, []);

    const handleCreateSession = async () => {
        try {
            const response = await api.post('/sessions', formData);
            if (response.data.success) {
                setSessions([response.data.data, ...sessions]);
                setIsCreateOpen(false);
                setFormData({ title: '', description: '', scheduledDate: '', startTime: '', endTime: '', meetingLink: '', platform: 'zoom' });
            }
        } catch (error) {
            console.error('Failed to create session', error);
        }
    };

    const stats = [
        { label: 'Total Sessions', value: sessions.length.toString(), icon: <Video size={20} />, color: 'text-primary' },
        { label: 'Scheduled', value: sessions.filter(s => new Date(`${s.scheduledDate}T${s.startTime}`) > new Date()).length.toString(), icon: <Calendar size={20} />, color: 'text-blue-600' },
        { label: 'Live Now', value: '0', icon: <Monitor size={20} />, color: 'text-green-600' },
        { label: 'Avg. Attendance', value: '--', icon: <Users size={20} />, color: 'text-purple-600' },
    ];

    const getSessionStatus = (session: Session) => {
        const now = new Date();
        const start = new Date(`${session.scheduledDate}T${session.startTime}`);
        const end = new Date(`${session.scheduledDate}T${session.endTime}`);

        if (now >= start && now <= end) return 'live';
        if (now > end) return 'completed';
        return 'scheduled';
    };

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Video Conferences</h1>
                    <p className="text-gray-500 font-medium tracking-tight">Create and manage live review sessions.</p>
                </div>

                {user?.role !== 'reviewee' && (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-11 rounded-xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 gap-2">
                                <Plus size={18} /> Create Session
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl max-w-2xl border-none shadow-2xl overflow-hidden p-0">
                            <DialogHeader className="p-8 bg-gray-50/50 border-b border-gray-100">
                                <DialogTitle className="text-2xl font-black">Create Video Conference</DialogTitle>
                                <DialogDescription className="font-medium">
                                    Schedule a new live review session for students.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Session Title</Label>
                                    <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Prof Ed Review Session" className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Meeting Link</Label>
                                    <Input value={formData.meetingLink} onChange={e => setFormData({ ...formData, meetingLink: e.target.value })} placeholder="https://zoom.us/j/..." className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</Label>
                                    <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description of the session..." className="rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 min-h-[100px]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date</Label>
                                        <Input type="date" value={formData.scheduledDate} onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })} className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Platform</Label>
                                        <Input value={formData.platform} onChange={e => setFormData({ ...formData, platform: e.target.value })} placeholder="zoom" className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Start Time</Label>
                                        <Input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">End Time</Label>
                                        <Input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="p-8 bg-gray-50/50 border-t border-gray-100 sm:justify-end">
                                <Button type="button" onClick={() => setIsCreateOpen(false)} variant="outline" className="h-12 rounded-2xl px-8 font-black border-gray-200">Cancel</Button>
                                <Button type="button" onClick={handleCreateSession} className="h-12 rounded-2xl px-8 bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20">Create Session</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-gray-100 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-2xl bg-gray-50 ${stat.color}`}>
                                    {stat.icon}
                                </div>
                                <Badge variant="secondary" className="font-black text-[10px] bg-gray-50 text-gray-400 uppercase">Monthly</Badge>
                            </div>
                            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Card */}
            <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white">
                <div className="border-b border-gray-50 p-4">
                    <div className="flex gap-2">
                        <Button variant="ghost" className="rounded-2xl h-11 px-6 bg-primary/10 text-primary font-black uppercase tracking-widest text-[10px]">Upcoming</Button>
                        <Button variant="ghost" className="rounded-2xl h-11 px-6 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50">Completed</Button>
                    </div>
                </div>

                <div className="overflow-x-auto overflow-y-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50/20">
                            <TableRow className="hover:bg-transparent border-gray-50">
                                <TableHead className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-400">Session Title</TableHead>
                                <TableHead className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-400">Host</TableHead>
                                <TableHead className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-400">Date & Time</TableHead>
                                <TableHead className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">Participants</TableHead>
                                <TableHead className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-400">Status</TableHead>
                                <TableHead className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-gray-500 font-medium">Loading sessions...</TableCell>
                                </TableRow>
                            ) : sessions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-gray-500 font-medium">No sessions found.</TableCell>
                                </TableRow>
                            ) : sessions.map((session) => {
                                const status = getSessionStatus(session);
                                const isLive = status === 'live';
                                const hostInitial = session.creator?.name ? session.creator.name.charAt(0) : 'R';

                                return (
                                    <TableRow key={session.id} className={`hover:bg-gray-50/50 transition-colors border-gray-50 group ${isLive ? 'bg-green-50/10' : ''}`}>
                                        <TableCell className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isLive ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Video size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">{session.title}</p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform: {session.platform}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                                    {hostInitial}
                                                </div>
                                                <span className="text-sm font-bold text-gray-600">{session.creator?.name || 'Reviewer'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-5">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold text-gray-700">{new Date(session.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{session.startTime} - {session.endTime}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-5 text-center">
                                            <span className="text-sm font-black text-gray-600">--</span>
                                        </TableCell>
                                        <TableCell className="px-6 py-5">
                                            <Badge className={`font-black text-[10px] uppercase tracking-widest border-none ${isLive ? 'bg-green-100 text-green-700 shadow-sm shadow-green-200' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {isLive ? '● Live Now' : status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6 py-5 text-right">
                                            {isLive ? (
                                                <a href={session.meetingLink} target="_blank" rel="noreferrer">
                                                    <Button className="h-10 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-xs shadow-lg shadow-green-600/20">
                                                        Join Now
                                                    </Button>
                                                </a>
                                            ) : user?.role !== 'reviewee' ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-gray-400 hover:text-primary hover:bg-primary/5">
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                                                        <Share2 size={16} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button variant="outline" className="h-10 px-6 rounded-xl border-primary text-primary font-black text-xs">
                                                    Set Reminder
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};

export default VideoConferencePage;
