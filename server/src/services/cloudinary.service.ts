import crypto from 'crypto';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

type CloudinaryUploadPayload = {
    secure_url?: string;
    public_id?: string;
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
    error?: {
        message?: string;
    };
};

/**
 * Extract the Cloudinary public_id from a full asset URL.
 *
 * Cloudinary URLs follow the pattern:
 *   https://res.cloudinary.com/<cloud>/image/upload/<public_id>.<ext>
 *
 * The public_id may contain slashes (folder/path) but never a file extension
 * at the very end. We strip the last segment's extension to recover it.
 *
 * Returns null if the URL doesn't look like a Cloudinary asset.
 */
export function extractPublicId(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (parsed.hostname !== 'res.cloudinary.com') return null;

        //.pathname looks like /<cloud>/image/upload/v1234567890/folder/file.jpg
        const segments = parsed.pathname.split('/');
        const uploadIdx = segments.indexOf('upload');
        if (uploadIdx === -1) return null;

        // Everything after "upload" is the versioned public_id path
        const afterUpload = segments.slice(uploadIdx + 1);
        if (afterUpload.length === 0) return null;

        // Drop the file extension from the last segment
        const lastSegment = afterUpload[afterUpload.length - 1];
        const dotIdx = lastSegment.lastIndexOf('.');
        if (dotIdx > 0) {
            afterUpload[afterUpload.length - 1] = lastSegment.slice(0, dotIdx);
        }

        return afterUpload.join('/');
    } catch {
        return null;
    }
}

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

        const payloadUnknown: unknown = await response.json();
        const payload = (payloadUnknown && typeof payloadUnknown === 'object'
            ? payloadUnknown
            : {}) as CloudinaryUploadPayload;

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

    /**
     * Delete an asset from Cloudinary by its public_id.
     *
     * Fire-and-forget: logs failures but never throws, so a failed cleanup
     * doesn't block the caller or surface as a user-facing error.
     */
    async destroy(publicId: string): Promise<void> {
        try {
            const { cloudName, apiKey, apiSecret } = this.getConfig();
            const timestamp = Math.floor(Date.now() / 1000);

            const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
            const signature = crypto
                .createHash('sha1')
                .update(`${paramsToSign}${apiSecret}`)
                .digest('hex');

            const formData = new FormData();
            formData.append('public_id', publicId);
            formData.append('api_key', apiKey);
            formData.append('timestamp', String(timestamp));
            formData.append('signature', signature);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
                method: 'POST',
                body: formData,
            });

            const payload: unknown = await response.json();
            if (!response.ok || (payload && typeof payload === 'object' && 'error' in payload)) {
                console.error('[Cloudinary] Failed to delete asset:', publicId, payload);
            }
        } catch (error) {
            console.error('[Cloudinary] Error deleting asset:', publicId, error);
        }
    }

    /**
     * Delete an asset identified by its full Cloudinary URL.
     * Extracts the public_id automatically. No-op if the URL isn't a valid
     * Cloudinary asset URL.
     */
    async destroyByUrl(url: string): Promise<void> {
        const publicId = extractPublicId(url);
        if (publicId) {
            await this.destroy(publicId);
        }
    }
}

export const cloudinaryService = new CloudinaryService();
