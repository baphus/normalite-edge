import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { trackService } from '../services/track.service';

export const trackController = {
    listTracks: catchAsync(async (_req: Request, res: Response) => {
        const tracks = await trackService.listTracks();
        ApiResponse.success(res, tracks);
    }),
};
