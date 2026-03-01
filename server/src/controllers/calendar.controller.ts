import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { calendarService } from '../services/calendar.service';
import { ApiError } from '../utils/ApiError';

export const calendarController = {
    getEvents: catchAsync(async (req: Request, res: Response) => {
        const { year, month } = req.query;

        const now = new Date();
        const y = year ? parseInt(year as string, 10) : now.getFullYear();
        const m = month ? parseInt(month as string, 10) : now.getMonth() + 1;

        if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
            throw new ApiError(400, 'Invalid year or month');
        }

        const events = await calendarService.getEvents(
            y,
            m,
            req.user!.userId,
            req.user!.role as 'ADMIN' | 'REVIEWER' | 'REVIEWEE'
        );

        ApiResponse.success(res, events, 'Calendar events fetched');
    }),
};
