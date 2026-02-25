import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { dashboardService } from '../services/dashboard.service';

export const dashboardController = {
    getStats: catchAsync(async (req: Request, res: Response) => {
        const role = req.user!.role;
        let stats;

        switch (role) {
            case 'REVIEWEE':
                stats = await dashboardService.getRevieweeStats(req.user!.userId);
                break;
            case 'REVIEWER':
                stats = await dashboardService.getReviewerStats(req.user!.userId);
                break;
            case 'ADMIN':
                stats = await dashboardService.getAdminStats();
                break;
            default:
                return ApiResponse.error(res, 400, 'Invalid role');
        }

        ApiResponse.success(res, stats);
    }),
};
