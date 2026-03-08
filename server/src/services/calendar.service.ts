import prisma from '../config/db';

export interface CalendarEvent {
    id: string;
    type: 'exam_start' | 'exam_deadline' | 'conference';
    title: string;
    date: string; // ISO date string YYYY-MM-DD
    time?: string; // HH:mm
    color: string;
    meta?: Record<string, unknown>;
}

export class CalendarService {
    /**
     * Get all calendar events for a given month.
     * @param year - Full year (e.g. 2026)
     * @param month - 1-indexed month (1 = January)
     * @param userId - Current user's ID
     * @param role - Current user's role
     */
    async getEvents(
        year: number,
        month: number,
        userId: string,
        role: 'ADMIN' | 'REVIEWER' | 'REVIEWEE'
    ): Promise<CalendarEvent[]> {
        const start = new Date(year, month - 1, 1, 0, 0, 0);
        const end = new Date(year, month, 0, 23, 59, 59);

        const events: CalendarEvent[] = [];

        // ── Exams (scheduleStart / scheduleEnd) ──────────────────────
        const examWhere: Record<string, unknown> = {
            OR: [
                { scheduleStart: { gte: start, lte: end } },
                { scheduleEnd: { gte: start, lte: end } },
            ],
        };

        if (role === 'REVIEWEE') {
            examWhere['status'] = 'LIVE';
        }

        const exams = await prisma.exam.findMany({
            where: examWhere,
            select: {
                id: true,
                title: true,
                subject: true,
                scheduleStart: true,
                scheduleEnd: true,
                status: true,
                programTrack: true,
            },
        });

        for (const exam of exams) {
            if (exam.scheduleStart) {
                const d = new Date(exam.scheduleStart);
                if (d >= start && d <= end) {
                    events.push({
                        id: `exam-start-${exam.id}`,
                        type: 'exam_start',
                        title: `${exam.title} – Opens`,
                        date: toDateString(exam.scheduleStart),
                        time: toTimeString(exam.scheduleStart),
                        color: 'blue',
                        meta: { examId: exam.id, status: exam.status, subject: exam.subject },
                    });
                }
            }
            if (exam.scheduleEnd) {
                const d = new Date(exam.scheduleEnd);
                if (d >= start && d <= end) {
                    events.push({
                        id: `exam-end-${exam.id}`,
                        type: 'exam_deadline',
                        title: `${exam.title} – Closes`,
                        date: toDateString(exam.scheduleEnd),
                        time: toTimeString(exam.scheduleEnd),
                        color: 'red',
                        meta: { examId: exam.id, status: exam.status, subject: exam.subject },
                    });
                }
            }
        }

        // ── Conferences ──────────────────────────────────────────────
        const conferences = await prisma.conference.findMany({
            where: {
                startAt: { gte: start, lte: end },
            },
            select: {
                id: true,
                title: true,
                description: true,
                startAt: true,
                endAt: true,
                meetingLink: true,
                recordingLink: true,
                programTrack: true,
                hostId: true,
            },
        });

        const hostIds = Array.from(new Set(conferences.map(c => c.hostId).filter(Boolean)));
        const hosts = hostIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: hostIds } },
                select: { id: true, firstName: true, lastName: true },
            })
            : [];
        const hostById = new Map(hosts.map(h => [h.id, h]));

        for (const conf of conferences) {
            const host = hostById.get(conf.hostId);
            const hostName = host
                ? [host.firstName, host.lastName].filter(Boolean).join(' ').trim()
                : 'Unknown host';

            events.push({
                id: `conf-${conf.id}`,
                type: 'conference',
                title: conf.title,
                date: toDateString(conf.startAt),
                time: toTimeString(conf.startAt),
                color: 'violet',
                meta: {
                    conferenceId: conf.id,
                    description: conf.description,
                    meetingLink: conf.meetingLink,
                    recordingLink: conf.recordingLink,
                    programTrack: conf.programTrack,
                    endAt: conf.endAt ? conf.endAt.toISOString() : null,
                    host: hostName,
                },
            });
        }

        return events.sort((a, b) => {
            const cmp = a.date.localeCompare(b.date);
            if (cmp !== 0) return cmp;
            return (a.time ?? '').localeCompare(b.time ?? '');
        });
    }
}

export const calendarService = new CalendarService();

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateString(date: Date): string {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function toTimeString(date: Date): string {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
