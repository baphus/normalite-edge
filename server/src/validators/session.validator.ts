import { z } from 'zod';

export const createSessionSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    meetingLink: z.string().url('meetingLink must be a valid URL'),
    recordingLink: z.string().url('recordingLink must be a valid URL').optional(),
    platform: z.string().nullish(),
    scheduledDate: z.string().datetime('scheduledDate must be ISO datetime'),
    startTime: z.string().min(1, 'startTime is required'),
    endTime: z.string().min(1, 'endTime is required'),
    program_track: z.string().nullish(),
    programTrack: z.string().nullish(),
    program: z.string().nullish(),
});

export const updateSessionSchema = createSessionSchema.partial();
