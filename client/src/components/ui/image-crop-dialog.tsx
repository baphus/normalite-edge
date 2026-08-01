import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ImageCropDialogProps {
    open: boolean;
    onClose: () => void;
    imageSrc: string;
    onCropComplete: (croppedBlob: Blob) => void;
    aspect?: number;
    title?: string;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
    open,
    onClose,
    imageSrc,
    onCropComplete,
    aspect = 1,
    title = 'Crop profile photo',
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    const [cropping, setCropping] = useState(false);

    const onCropCompleteInternal = (
        _croppedArea: any,
        croppedAreaPixels: any
    ) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCrop = async () => {
        if (!croppedAreaPixels) return;
        setCropping(true);
        try {
            const { getCroppedImg } = await import('@/lib/cropImage');
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(blob);
            onClose();
        } catch (err) {
            console.error('Crop failed', err);
        } finally {
            setCropping(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md rounded-lg font-lexend">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-gray-900">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                        Adjust the crop area to frame your photo.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative h-64 w-full rounded-lg overflow-hidden bg-gray-100">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropCompleteInternal}
                        cropShape="round"
                    />
                </div>

                <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        Zoom
                    </label>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full accent-primary"
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={cropping}
                        className="h-8 rounded-md border-gray-200 text-xs font-semibold"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCrop}
                        disabled={cropping || !croppedAreaPixels}
                        className="h-8 rounded-md bg-primary hover:bg-primary/95 text-white text-xs font-semibold"
                    >
                        {cropping ? 'Cropping...' : 'Apply'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImageCropDialog;
