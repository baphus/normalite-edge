import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock3, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

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

    const toStartDate = (session: Session) => new Date(`${session.scheduledDate}T${session.startTime}`);
    const toEndDate = (session: Session) => new Date(`${session.scheduledDate}T${session.endTime}`);

    const groupedSessions = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const today = sessions
            .filter((session) => {
                const start = toStartDate(session);
                return start >= startOfToday && start <= endOfToday;
            })
            .sort((a, b) => toStartDate(a).getTime() - toStartDate(b).getTime());

        const upcoming = sessions
            .filter((session) => toStartDate(session) > endOfToday)
            .sort((a, b) => toStartDate(a).getTime() - toStartDate(b).getTime());

        const previous = sessions
            .filter((session) => toEndDate(session) < startOfToday)
            .sort((a, b) => toStartDate(b).getTime() - toStartDate(a).getTime());

        return { today, upcoming, previous };
    }, [sessions]);

    const formatDate = (value: string) =>
        new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const renderSessionSection = (
        title: string,
        description: string,
        sectionSessions: Session[],
        emptyMessage: string
    ) => (
        <Card className="rounded-3xl border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-900">{title}</CardTitle>
                        <p className="text-sm text-gray-500 font-medium mt-1">{description}</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none font-bold">{sectionSessions.length}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {sectionSessions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 font-medium text-center">
                        {emptyMessage}
                    </div>
                ) : (
                    sectionSessions.map((session) => (
                        <div key={session.id} className="rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-1.5">
                                <p className="font-bold text-gray-900">{session.title}</p>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
                                    <span className="inline-flex items-center gap-1"><Calendar size={14} /> {formatDate(session.scheduledDate)}</span>
                                    <span className="inline-flex items-center gap-1"><Clock3 size={14} /> {session.startTime} - {session.endTime}</span>
                                    <span>Host: {session.creator?.name || 'Unavailable'}</span>
                                </div>
                            </div>
                            {session.meetingLink ? (
                                <a href={session.meetingLink} target="_blank" rel="noreferrer" className="md:ml-auto">
                                    <Button className="h-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold gap-2">
                                        Join Conference <ExternalLink size={16} />
                                    </Button>
                                </a>
                            ) : (
                                <Button variant="outline" disabled className="h-10 rounded-xl font-bold text-xs md:ml-auto">
                                    Link unavailable
                                </Button>
                            )}
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Video Conferences</h1>
                    <p className="text-gray-500 font-medium tracking-tight">View and join your online conferences.</p>
                </div>
            </header>

            {loading ? (
                <Card className="rounded-3xl border-gray-100 shadow-sm">
                    <CardContent className="p-8 text-center text-gray-500 font-medium">Loading conferences...</CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {renderSessionSection(
                        'Today',
                        'Conferences scheduled for today.',
                        groupedSessions.today,
                        'No conferences scheduled for today.'
                    )}
                    {renderSessionSection(
                        'Upcoming',
                        'Conferences you can prepare for and join.',
                        groupedSessions.upcoming,
                        'No upcoming conferences scheduled.'
                    )}
                    {renderSessionSection(
                        'Previous',
                        'Past conferences from earlier dates.',
                        groupedSessions.previous,
                        'No previous conferences found.'
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoConferencePage;
