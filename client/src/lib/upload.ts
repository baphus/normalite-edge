import api from '@/lib/axios';

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected image file'));
    reader.readAsDataURL(file);
});

export const uploadImageToCloudinary = async (file: File, folder: 'profile-pics' | 'question-images') => {
    const fileDataUrl = await readFileAsDataUrl(file);

    const response = await api.post('/uploads/image', {
        fileDataUrl,
        folder,
    });

    const secureUrl = String(response.data?.data?.secureUrl || '');
    if (!secureUrl) {
        throw new Error('Upload succeeded but secure URL was not returned');
    }

    return secureUrl;
};
