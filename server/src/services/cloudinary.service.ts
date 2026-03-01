import crypto from 'crypto';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export class CloudinaryService {
    private getConfig() {
        const cloudName = env.CLOUDINARY_CLOUD_NAME;
        const apiKey = env.CLOUDINARY_API_KEY;
        const apiSecret = env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            throw ApiError.internal('Cloudinary is not configured. Missing CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET');
        }

        return { cloudName, apiKey, apiSecret };
    }

    async uploadImage(fileDataUrl: string, folder: 'profile-pics' | 'question-images') {
        const { cloudName, apiKey, apiSecret } = this.getConfig();
        const timestamp = Math.floor(Date.now() / 1000);
        const normalizedFolder = `normalite-edge/${folder}`;

        const paramsToSign = `folder=${normalizedFolder}&timestamp=${timestamp}`;
        const signature = crypto
            .createHash('sha1')
            .update(`${paramsToSign}${apiSecret}`)
            .digest('hex');

        const formData = new FormData();
        formData.append('file', fileDataUrl);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('folder', normalizedFolder);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        const payload = await response.json();

        if (!response.ok) {
            const message = payload?.error?.message || 'Failed to upload image to Cloudinary';
            throw ApiError.badRequest(message);
        }

        return {
            secureUrl: String(payload.secure_url || ''),
            publicId: String(payload.public_id || ''),
            width: Number(payload.width || 0),
            height: Number(payload.height || 0),
            bytes: Number(payload.bytes || 0),
            format: String(payload.format || ''),
        };
    }
}

export const cloudinaryService = new CloudinaryService();
