import api from '@/lib/axios';

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected image file'));
    reader.readAsDataURL(file);
});

const postUpload = async (endpoint: string, payload: Record<string, string>) => {
    const response = await api.post(endpoint, payload);

    const secureUrl = String(response.data?.data?.secureUrl || '');
    if (!secureUrl) {
        throw new Error('Upload succeeded but secure URL was not returned');
    }

    return secureUrl;
};

export const uploadImageToCloudinary = async (file: File, folder: 'profile-pics' | 'question-images') => {
    const fileDataUrl = await readFileAsDataUrl(file);

    return postUpload('/uploads/image', { fileDataUrl, folder });
};

/**
 * Upload a profile picture before the account exists.
 *
 * `/uploads/image` requires a `public.users` row, which is only created when
 * the Complete Profile form is submitted — so a new Google user uploading from
 * that page would get a 403. This endpoint needs only a valid session and
 * always writes to the profile-pics folder.
 */
export const uploadProfilePictureBeforeRegistration = async (file: File) => {
    const fileDataUrl = await readFileAsDataUrl(file);

    return postUpload('/uploads/public-profile-image', { fileDataUrl });
};
