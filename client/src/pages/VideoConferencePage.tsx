import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock3, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';

interface Session {
    id: string;
    description?: string;
    title: string;
    meetingLink?: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    programTrack?: string | null;
    creator?: {
        name: string;
    };
}

interface SessionFormState {
    title: string;
    description: string;
    meetingLink: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    programTrack: string;
}

const INITIAL_FORM_STATE: SessionFormState = {
    title: '',
    description: '',
    meetingLink: '',
    scheduledDate: '',
    startTime: '',
    endTime: '',
    programTrack: '',
};

const VideoConferencePage: React.FC = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');
    const [form, setForm] = useState<SessionFormState>(INITIAL_FORM_STATE);

    const canCreateConference = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

    const mapSession = (session: any): Session => {
        const startAt = session.startAt ? new Date(session.startAt) : null;
        const endAt = session.endAt ? new Date(session.endAt) : null;
        const formattedStart = startAt
            ? `${startAt.getHours().toString().padStart(2, '0')}:${startAt.getMinutes().toString().padStart(2, '0')}`
            : session.startTime;
        const formattedEnd = endAt
            ? `${endAt.getHours().toString().padStart(2, '0')}:${endAt.getMinutes().toString().padStart(2, '0')}`
            : session.endTime;

        return {
            id: session.id,
            title: session.title,
            description: session.description,
            meetingLink: session.meetingLink,
            scheduledDate: session.scheduledDate || session.startAt,
            startTime: formattedStart,
            endTime: formattedEnd,
            programTrack: session.programTrack ?? session.program_track ?? null,
            creator: session.creator,
        };
    };

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const response = await api.get('/sessions');
            const payload = response.data?.data;
            const list = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.items)
                    ? payload.items
                    : [];

            setSessions(list.map(mapSession));
        } catch (error) {
            console.error('Failed to fetch sessions', error);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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

    const handleFieldChange = (field: keyof SessionFormState, value: string) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };

    const handleCreateConference = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCreateError('');
        setCreateSuccess('');

        const hasRequiredFields =
            form.title.trim()
            && form.meetingLink.trim()
            && form.scheduledDate
            && form.startTime
            && form.endTime;

        if (!hasRequiredFields) {
            setCreateError('Please complete all required fields.');
            return;
        }

        if (form.endTime <= form.startTime) {
            setCreateError('End time must be later than start time.');
            return;
        }

        setCreating(true);
        try {
            const scheduledDateIso = new Date(`${form.scheduledDate}T00:00:00.000Z`).toISOString();

            await api.post('/sessions', {
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                meetingLink: form.meetingLink.trim(),
                platform: 'ONLINE',
                scheduledDate: scheduledDateIso,
                startTime: form.startTime,
                endTime: form.endTime,
                program_track: form.programTrack.trim() || undefined,
            });

            setForm(INITIAL_FORM_STATE);
            setCreateSuccess('Conference created successfully.');
            await fetchSessions();
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to create conference.';
            setCreateError(message);
        } finally {
            setCreating(false);
        }
    };

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
                                    {session.programTrack && <span>Track: {session.programTrack}</span>}
                                </div>
                                {session.description && (
                                    <p className="text-xs text-gray-600 font-medium">{session.description}</p>
                                )}
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
        <div className="flex flex-col gap-5 font-lexend pb-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Video Conferences</h1>
                    <p className="text-gray-500 font-medium tracking-tight">View, join, and manage your online conferences.</p>
                </div>
            </header>

            {canCreateConference && (
                <Card className="rounded-3xl border-gray-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-900">Create Conference</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateConference} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="conference-title">Title</Label>
                                <Input
                                    id="conference-title"
                                    value={form.title}
                                    onChange={(event) => handleFieldChange('title', event.target.value)}
                                    placeholder="LET Coaching Conference"
                                    required
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="conference-description">Description</Label>
                                <Textarea
                                    id="conference-description"
                                    value={form.description}
                                    onChange={(event) => handleFieldChange('description', event.target.value)}
                                    placeholder="Agenda and session details"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="conference-link">Meeting Link</Label>
                                <Input
                                    id="conference-link"
                                    type="url"
                                    value={form.meetingLink}
                                    onChange={(event) => handleFieldChange('meetingLink', event.target.value)}
                                    placeholder="https://..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="conference-date">Date</Label>
                                <Input
                                    id="conference-date"
                                    type="date"
                                    value={form.scheduledDate}
                                    onChange={(event) => handleFieldChange('scheduledDate', event.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="conference-track">Program Track (Optional)</Label>
                                <Input
                                    id="conference-track"
                                    value={form.programTrack}
                                    onChange={(event) => handleFieldChange('programTrack', event.target.value)}
                                    placeholder={user?.programTrack || user?.program_track || 'All tracks'}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="conference-start">Start Time</Label>
                                <Input
                                    id="conference-start"
                                    type="time"
                                    value={form.startTime}
                                    onChange={(event) => handleFieldChange('startTime', event.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="conference-end">End Time</Label>
                                <Input
                                    id="conference-end"
                                    type="time"
                                    value={form.endTime}
                                    onChange={(event) => handleFieldChange('endTime', event.target.value)}
                                    required
                                />
                            </div>

                            {createError && (
                                <p className="text-sm font-medium text-red-600 md:col-span-2">{createError}</p>
                            )}
                            {createSuccess && (
                                <p className="text-sm font-medium text-green-600 md:col-span-2">{createSuccess}</p>
                            )}

                            <div className="md:col-span-2 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={creating}
                                    className="h-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold"
                                >
                                    {creating ? 'Creating...' : 'Create Conference'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

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
