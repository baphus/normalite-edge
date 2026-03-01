import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { cloudinaryService } from '../services/cloudinary.service';

export const uploadController = {
    uploadImage: catchAsync(async (req: Request, res: Response) => {
        const result = await cloudinaryService.uploadImage(req.body.fileDataUrl, req.body.folder);
        ApiResponse.success(res, result, 'Image uploaded successfully');
    }),
};
