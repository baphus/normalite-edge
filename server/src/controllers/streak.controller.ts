import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { streakService } from '../services/streak.service';

const streakController = {
    getStreak: catchAsync(async (req: Request, res: Response) => {
        const userId = req.user!.userId;
        // `tz` is the client's UTC offset in minutes (e.g. -480 for UTC+8).
        const tzParsed = parseInt(String(req.query.tz), 10);
        const timezoneOffset = Number.isNaN(tzParsed) ? 0 : tzParsed;
        const data = await streakService.getStreak(userId, timezoneOffset);
        res.json({ data });
    }),
};

export default streakController;
