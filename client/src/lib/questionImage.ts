import { uploadImageToCloudinary } from '@/lib/upload';
import { toast } from 'sonner';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/**
 * Validates and uploads a question image, reporting failures via toast.
 * Returns the secure URL, or null if the user picked nothing / it was rejected.
 *
 * Shared by the exam and study-material editors, and by their import previews,
 * which previously carried four near-identical copies of this between them.
 */
export async function uploadQuestionImageFromEvent(
    event: React.ChangeEvent<HTMLInputElement>,
): Promise<string | null> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return null;

    if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file.');
        return null;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        toast.error('Image must be 3MB or smaller.');
        return null;
    }

    try {
        const secureUrl = await uploadImageToCloudinary(file, 'question-images');
        toast.success('Image attached successfully.');
        return secureUrl;
    } catch (error) {
        console.error('Failed to attach question image', error);
        toast.error('Failed to attach image. Please try again.');
        return null;
    }
}
