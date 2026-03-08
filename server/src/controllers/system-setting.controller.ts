import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { systemSettingService } from '../services/system-setting.service';

export const systemSettingController = {
    getSettings: catchAsync(async (_req: Request, res: Response) => {
        const settings = await systemSettingService.getSettings();
        ApiResponse.success(res, settings);
    }),

    updateSettings: catchAsync(async (req: Request, res: Response) => {
        const settings = await systemSettingService.updateSettings({
            allowMultipleAttempts: req.body.allowMultipleAttempts,
            enforceExamSingleTab: req.body.enforceExamSingleTab,
            tabSwitchGraceSeconds: req.body.tabSwitchGraceSeconds,
        });

        ApiResponse.success(res, settings, 'System settings updated successfully');
    }),
};
