import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { AlertCircle, ArrowRight, Camera, UserRound } from 'lucide-react';
import api from '@/lib/axios';
import { uploadImageToCloudinary } from '@/lib/upload';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NO_SUFFIX_VALUE, SUFFIX_OPTIONS, YEAR_LEVEL_OPTIONS } from '@/lib/userOptions';
import {
    buildProfileDefaults,
    buildProfileSchema,
    isProfileRole,
    PROFILE_FIELDS,
    type ProfileFormValues,
    type ProfileRole,
} from '@/lib/profileForm';
import AuthLayout from '@/components/marketing/AuthLayout';
import ImageCropDialog from '@/components/ui/image-crop-dialog';

type Option = { id: string; name: string; code?: string | null };

const iconClass =
    'absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 transition-colors group-focus-within:text-primary pointer-events-none';

const ErrorNotice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <span>{children}</span>
    </div>
);

/**
 * The profile form itself.
 *
 * Mounted only once the role is known, and remounted when it changes
 * (`key={role}` at the call site). Both matter: the validation schema and the
 * form defaults are derived from the role, and react-hook-form captures
 * `defaultValues` on first render — so a form mounted before the role arrived
 * would validate against one field set while rendering another.
 */
const ProfileForm: React.FC<{
    role: ProfileRole;
    suggestedFirstName: string | null;
    suggestedLastName: string | null;
}> = ({ role, suggestedFirstName, suggestedLastName }) => {
    const navigate = useNavigate();
    const { refreshProfile } = useAuth();

    const fields = PROFILE_FIELDS[role];

    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [tracks, setTracks] = useState<Option[]>([]);
    const [campuses, setCampuses] = useState<Option[]>([]);
    const [picture, setPicture] = useState<string>('');
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [showCropDialog, setShowCropDialog] = useState(false);
    const profileImageInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(buildProfileSchema(role)),
        defaultValues: buildProfileDefaults(role),
    });

    // Prefill the name if available (from Google or from the invite).
    useEffect(() => {
        if (suggestedFirstName) setValue('firstName', suggestedFirstName);
        if (suggestedLastName) setValue('lastName', suggestedLastName);
    }, [suggestedFirstName, suggestedLastName, setValue]);

    useEffect(() => {
        if (!fields.track) return;

        api.get('/tracks')
            .then((res) => setTracks(res.data?.data || []))
            .catch(() => setError('Unable to load program tracks. Please refresh and try again.'));
    }, [fields.track]);

    useEffect(() => {
        if (!fields.campus) return;

        api.get('/campuses')
            .then((res) => setCampuses(res.data?.data || []))
            .catch(() => setError('Unable to load campuses. Please refresh and try again.'));
    }, [fields.campus]);

    const handleProfilePictureSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.');
            return;
        }

        const maxFileSizeInBytes = 3 * 1024 * 1024;
        if (file.size > maxFileSizeInBytes) {
            setError('Image must be 3MB or smaller.');
            return;
        }

        // Read the file and show crop dialog
        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(reader.result as string);
            setShowCropDialog(true);
        };
        reader.readAsDataURL(file);

        // Reset the input so the same file can be selected again
        event.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        try {
            setIsUploadingPicture(true);
            const file = new File([croppedBlob], 'profile-pic.jpg', { type: 'image/jpeg' });
            const secureUrl = await uploadImageToCloudinary(file, 'profile-pics');
            setPicture(secureUrl);
            setImgError(false);
        } catch {
            setError('Failed to upload profile picture. Please try again.');
        } finally {
            setIsUploadingPicture(false);
            setCropImageSrc(null);
        }
    };

    const onSubmit = async (data: ProfileFormValues) => {
        setSubmitting(true);
        setError(null);

        try {
            await api.post('/auth/complete-profile', {
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                middleInitial: data.middleInitial?.trim() || undefined,
                suffix: data.suffix?.trim() || undefined,
                picture: picture || undefined,
                track_id: data.trackId || undefined,
                campus_id: data.campusId || undefined,
                yearLevel: data.yearLevel?.trim() || undefined,
                section: data.section?.trim() || undefined,
                studentId: data.studentId?.trim() || undefined,
                contactNumber: data.contactNumber?.trim() || undefined,
            });

            await refreshProfile();
            navigate('/dashboard', { replace: true });
        } catch (err) {
            if (isAxiosError<{ message?: string }>(err)) {
                setError(err.response?.data?.message ?? err.message);
            } else {
                setError('Could not finish setting up your account. Please try again.');
            }
            setSubmitting(false);
        }
    };

    /**
     * Submit blocked by validation. Every field in the schema is rendered (see
     * `PROFILE_FIELDS`), so the inline messages already say what is wrong —
     * but a submit that produces no visible response at all is the worst
     * possible outcome, so say something regardless.
     */
    const onInvalid = () => {
        setError('Please check the highlighted fields and try again.');
    };

    const suffixValue = watch('suffix');

    return (
        <>
            {error && (
                <div className="mb-6">
                    <ErrorNotice>{error}</ErrorNotice>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5">
                {/* Profile Photo Upload */}
                <div className="flex flex-col items-center gap-3">
                    <div className="relative group">
                        {picture && !imgError ? (
                            <img
                                src={picture}
                                alt="Profile"
                                className="h-24 w-24 rounded-full object-cover border-2 border-primary"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="h-24 w-24 rounded-full bg-primary/10 text-primary flex items-center justify-center border-2 border-primary">
                                <UserRound size={40} />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => profileImageInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-400 flex items-center justify-center group-hover:text-primary transition-colors shadow-sm"
                        >
                            <Camera size={14} />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => profileImageInputRef.current?.click()}
                        disabled={isUploadingPicture}
                        className="text-xs font-semibold text-primary disabled:opacity-50"
                    >
                        {isUploadingPicture ? 'Uploading...' : 'Add profile photo'}
                    </button>
                    <input
                        ref={profileImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureSelect}
                        className="hidden"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="firstName">First name</Label>
                        <div className="group relative">
                            <div className={iconClass}>
                                <UserRound size={18} />
                            </div>
                            <Input id="firstName" className="h-12 pl-11" {...register('firstName')} />
                        </div>
                        {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="lastName">Last name</Label>
                        <Input id="lastName" className="h-12" {...register('lastName')} />
                        {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="middleInitial">Middle initial <span className="text-gray-400 normal-case font-normal">(optional)</span></Label>
                        <Input id="middleInitial" maxLength={1} className="h-12" {...register('middleInitial')} />
                        {errors.middleInitial && (
                            <p className="text-xs text-red-500">{errors.middleInitial.message}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="suffix">Suffix</Label>
                        <Select
                            value={suffixValue || NO_SUFFIX_VALUE}
                            onValueChange={(value) =>
                                setValue('suffix', value === NO_SUFFIX_VALUE ? '' : value, {
                                    shouldValidate: true,
                                })
                            }
                        >
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_SUFFIX_VALUE}>None</SelectItem>
                                {SUFFIX_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {fields.track && (
                    <div className="space-y-1.5">
                        <Label>Program track</Label>
                        <Select
                            value={watch('trackId') || ''}
                            onValueChange={(value) => setValue('trackId', value, { shouldValidate: true })}
                        >
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select your program track" />
                            </SelectTrigger>
                            <SelectContent sideOffset={5}>
                                {tracks.map((track) => (
                                    <SelectItem key={track.id} value={track.id}>
                                        {track.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.trackId && <p className="text-xs text-red-500">{errors.trackId.message}</p>}
                    </div>
                )}

                {fields.campus && (
                    <div className="space-y-1.5">
                        <Label>Campus</Label>
                        <Select
                            value={watch('campusId') || ''}
                            onValueChange={(value) => setValue('campusId', value, { shouldValidate: true })}
                        >
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select your campus" />
                            </SelectTrigger>
                            <SelectContent sideOffset={5}>
                                {campuses.map((campus) => (
                                    <SelectItem key={campus.id} value={campus.id}>
                                        {campus.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.campusId && <p className="text-xs text-red-500">{errors.campusId.message}</p>}
                    </div>
                )}

                {(fields.yearLevel || fields.section) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {fields.yearLevel && (
                            <div className="space-y-1.5">
                                <Label>Year level</Label>
                                <Select
                                    value={watch('yearLevel') || ''}
                                    onValueChange={(value) => setValue('yearLevel', value, { shouldValidate: true })}
                                >
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Select year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {YEAR_LEVEL_OPTIONS.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.yearLevel && <p className="text-xs text-red-500">{errors.yearLevel.message}</p>}
                            </div>
                        )}

                        {fields.section && (
                            <div className="space-y-1.5">
                                <Label htmlFor="section">Section</Label>
                                <Input id="section" className="h-12" placeholder="e.g. A" {...register('section')} />
                                {errors.section && <p className="text-xs text-red-500">{errors.section.message}</p>}
                            </div>
                        )}
                    </div>
                )}

                {(fields.studentId || fields.contactNumber) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {fields.studentId && (
                            <div className="space-y-1.5">
                                <Label htmlFor="studentId">Student ID</Label>
                                <Input id="studentId" className="h-12" placeholder="e.g. 2025-12345" {...register('studentId')} />
                                {errors.studentId && <p className="text-xs text-red-500">{errors.studentId.message}</p>}
                            </div>
                        )}

                        {fields.contactNumber && (
                            <div className="space-y-1.5">
                                <Label htmlFor="contactNumber">
                                    Contact number
                                    {fields.contactNumber === 'optional' && (
                                        <span className="text-gray-400 normal-case font-normal"> (optional)</span>
                                    )}
                                </Label>
                                <Input id="contactNumber" className="h-12" placeholder="09XXXXXXXXX" {...register('contactNumber')} />
                                {errors.contactNumber && <p className="text-xs text-red-500">{errors.contactNumber.message}</p>}
                            </div>
                        )}
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={submitting}
                    className="flex h-12 w-full items-center gap-2 rounded-lg bg-primary text-base font-semibold text-white shadow-sm transition-all hover:bg-[#5a1010] active:scale-[0.99]"
                >
                    {submitting ? 'Setting up…' : 'Start reviewing'}
                    {!submitting && <ArrowRight size={18} />}
                </Button>
            </form>

            {cropImageSrc && (
                <ImageCropDialog
                    open={showCropDialog}
                    onClose={() => {
                        setShowCropDialog(false);
                        setCropImageSrc(null);
                    }}
                    imageSrc={cropImageSrc}
                    onCropComplete={handleCropComplete}
                    aspect={1}
                    title="Crop profile photo"
                />
            )}
        </>
    );
};

/**
 * Profile completion page for both Google SSO and invited users.
 *
 * - Google SSO users: creating a new account (no row exists yet).
 * - Invited users: updating placeholder names set by the admin.
 *
 * Fields shown depend on the user's role, which comes from GET /auth/me. When
 * that call fails we do not know the role, and rendering a form we cannot
 * validate would strand the user on a submit button that does nothing — so
 * the failure is surfaced with a retry instead.
 */
const CompleteProfilePage: React.FC = () => {
    const { status, pending, profileError, refreshProfile, logout } = useAuth();
    const navigate = useNavigate();

    const [retrying, setRetrying] = useState(false);

    // Someone who already has an account, or who is not signed in at all, has
    // no business here.
    useEffect(() => {
        if (status === 'ready') navigate('/dashboard', { replace: true });
        if (status === 'signedOut') navigate('/login', { replace: true });
    }, [status, navigate]);

    const handleRetry = async () => {
        setRetrying(true);
        try {
            await refreshProfile();
        } finally {
            setRetrying(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F7F4EE] font-lexend text-[#6B5B5B]">
                Loading…
            </div>
        );
    }

    // Signed in with Google, but not with an institutional account.
    if (pending && !pending.eligible) {
        return (
            <AuthLayout
                title="That account can't be used"
                subtitle="Normalite EDGE is limited to Cebu Normal University Google accounts."
                footer={<>Need help? Contact your administrator.</>}
            >
                <div className="space-y-5">
                    <ErrorNotice>
                        {pending.ineligibleReason === 'provider' ? (
                            <>
                                <strong>{pending.email}</strong> is a university address, but you signed
                                in with a password. CNU accounts must use{' '}
                                <strong>Sign in with Google</strong>.
                            </>
                        ) : (
                            <>
                                You signed in as <strong>{pending.email}</strong>, which is not a
                                <strong> @cnu.edu.ph</strong> account. Sign in again with your university
                                Google account.
                            </>
                        )}
                    </ErrorNotice>
                    <Button
                        type="button"
                        onClick={() => void logout()}
                        className="h-12 w-full rounded-lg bg-primary text-base font-semibold text-white"
                    >
                        Sign out and try again
                    </Button>
                </div>
            </AuthLayout>
        );
    }

    const role = pending?.role;

    // Either GET /auth/me failed outright, or it answered without a usable
    // role. Both leave us unable to ask for the right details, and a form
    // built on a guessed role cannot be submitted.
    if (!pending || !isProfileRole(role)) {
        return (
            <AuthLayout
                title="We couldn't load your details"
                subtitle="Your sign-in worked, but we couldn't finish setting up your account."
                footer={
                    <button
                        type="button"
                        onClick={() => void logout()}
                        className="font-semibold text-primary hover:underline"
                    >
                        Use a different account
                    </button>
                }
            >
                <div className="space-y-5">
                    <ErrorNotice>
                        {profileError ?? 'The server did not return your account details.'}
                    </ErrorNotice>
                    <Button
                        type="button"
                        onClick={() => void handleRetry()}
                        disabled={retrying}
                        className="h-12 w-full rounded-lg bg-primary text-base font-semibold text-white"
                    >
                        {retrying ? 'Retrying…' : 'Try again'}
                    </Button>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            wide
            title="Finish your profile"
            subtitle={
                pending.email
                    ? `Signed in as ${pending.email}. Tell us what you're reviewing for.`
                    : "Tell us what you're reviewing for."
            }
            footer={
                <button
                    type="button"
                    onClick={() => void logout()}
                    className="font-semibold text-primary hover:underline"
                >
                    Use a different account
                </button>
            }
        >
            <ProfileForm
                key={role}
                role={role}
                suggestedFirstName={pending.firstName}
                suggestedLastName={pending.lastName}
            />
        </AuthLayout>
    );
};

export default CompleteProfilePage;
