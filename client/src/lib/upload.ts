import api from '@/lib/axios';
import { tokenStore } from '@/lib/tokenStore';

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected image file'));
    reader.readAsDataURL(file);
});

export const uploadImageToCloudinary = async (file: File, folder: 'profile-pics' | 'question-images') => {
    const fileDataUrl = await readFileAsDataUrl(file);

    // All uploads now require authentication (public endpoint removed)
    const endpoint = '/uploads/image';
    const payload = { fileDataUrl, folder };

    const response = await api.post(endpoint, payload);

    const secureUrl = String(response.data?.data?.secureUrl || '');
    if (!secureUrl) {
        throw new Error('Upload succeeded but secure URL was not returned');
    }

    return secureUrl;
};
