import { z } from 'zod';

export const createSessionSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    meetingLink: z.string().url('meetingLink must be a valid URL'),
    platform: z.string().min(1, 'Platform is required'),
    scheduledDate: z.string().datetime('scheduledDate must be ISO datetime'),
    startTime: z.string().min(1, 'startTime is required'),
    endTime: z.string().min(1, 'endTime is required'),
    program_track: z.string().optional(),
    programTrack: z.string().optional(),
    program: z.string().optional(),
});

export const updateSessionSchema = createSessionSchema.partial();
