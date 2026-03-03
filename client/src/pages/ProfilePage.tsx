import React, { useEffect, useRef, useState } from 'react';
import { Mail, Smartphone, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { uploadImageToCloudinary } from '@/lib/upload';
import { toast } from 'sonner';

const ProfilePage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [middleInitial, setMiddleInitial] = useState('');
    const [suffix, setSuffix] = useState('');
    const [email, setEmail] = useState('');
    const [picture, setPicture] = useState<string>('');
    const [imgError, setImgError] = useState(false);
    const [trackId, setTrackId] = useState('');
    const [yearLevel, setYearLevel] = useState('');
    const [section, setSection] = useState('');
    const [tracks, setTracks] = useState<Array<{ id: string; name: string }>>([]);
    const [tracksLoading, setTracksLoading] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const profileImageInputRef = useRef<HTMLInputElement | null>(null);
    const isReviewee = user?.role === 'REVIEWEE';

    useEffect(() => {
        const resolvedFirstName = user?.firstName?.trim() || user?.name?.trim().split(/\s+/).filter(Boolean)[0] || '';
        const resolvedLastName = user?.lastName?.trim() || user?.name?.trim().split(/\s+/).filter(Boolean).slice(1).join(' ') || '';

        setFirstName(resolvedFirstName);
        setLastName(resolvedLastName);
        setMiddleInitial(user?.middleInitial || '');
        setSuffix(user?.suffix || '');
        setEmail(user?.email || '');
        setPicture(user?.picture || '');
        setImgError(false);
        setTrackId(user?.track_id || '');
        setYearLevel(user?.yearLevel || '');
        setSection(user?.section || '');
    }, [user]);

    useEffect(() => {
        if (!isReviewee) return;

        const fetchTracks = async () => {
            try {
                setTracksLoading(true);
                const response = await api.get('/tracks');
                setTracks(response.data?.data || []);
            } catch (error) {
                console.error('Failed to load tracks', error);
                toast.error('Unable to load program tracks. Please refresh and try again.');
            } finally {
                setTracksLoading(false);
            }
        };

        void fetchTracks();
    }, [isReviewee]);

    const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.name || 'User';

    const userInitials = displayName
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2);

    const handleProfilePictureSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file.');
            return;
        }
        const maxFileSizeInBytes = 3 * 1024 * 1024;
        if (file.size > maxFileSizeInBytes) {
            toast.error('Image must be 3MB or smaller.');
            return;
        }
        try {
            setIsUploadingPicture(true);
            const secureUrl = await uploadImageToCloudinary(file, 'profile-pics');
            setPicture(secureUrl);
            toast.success('Profile picture updated.');
        } catch (error) {
            console.error('Failed to upload profile picture', error);
            toast.error('Failed to upload profile picture. Please try again.');
        } finally {
            setIsUploadingPicture(false);
        }
    };

    const handleCancel = () => {
        const resolvedFirstName = user?.firstName?.trim() || user?.name?.trim().split(/\s+/).filter(Boolean)[0] || '';
        const resolvedLastName = user?.lastName?.trim() || user?.name?.trim().split(/\s+/).filter(Boolean).slice(1).join(' ') || '';

        setFirstName(resolvedFirstName);
        setLastName(resolvedLastName);
        setMiddleInitial(user?.middleInitial || '');
        setSuffix(user?.suffix || '');
        setEmail(user?.email || '');
        setPicture(user?.picture || '');
        setImgError(false);
        setTrackId(user?.track_id || '');
        setYearLevel(user?.yearLevel || '');
        setSection(user?.section || '');
    };

    const handleSaveProfile = async () => {
        if (!firstName.trim()) {
            toast.error('First name is required.');
            return;
        }
        if (!lastName.trim()) {
            toast.error('Last name is required.');
            return;
        }
        if (isReviewee && !trackId.trim()) {
            toast.error('Program track is required.');
            return;
        }
        if (isReviewee && !yearLevel.trim()) {
            toast.error('Year is required.');
            return;
        }
        if (isReviewee && !section.trim()) {
            toast.error('Section is required.');
            return;
        }
        try {
            setIsSavingProfile(true);
            const payload: Record<string, string | undefined> = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                middleInitial: middleInitial.trim() || undefined,
                suffix: suffix.trim() || undefined,
                picture: picture || undefined,
            };

            if (isReviewee) {
                payload.track_id = trackId.trim() || undefined;
                payload.yearLevel = yearLevel.trim() || undefined;
                payload.section = section.trim() || undefined;
            }

            const response = await api.patch('/auth/me/profile', payload);
            const nextUser = response.data?.data || user;
            updateUser(nextUser);
            toast.success('Profile updated successfully.');
        } catch (error: any) {
            console.error('Failed to update profile', error);
            toast.error(error?.response?.data?.message || 'Failed to update profile.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Profile</h1>
                <p className="text-gray-500 font-medium tracking-tight">Update your personal details and how others see you.</p>
            </header>
            <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black">Personal Information</CardTitle>
                    <CardDescription className="font-medium italic">Update your personal details and how others see you.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            {picture && !imgError ? (
                                <img
                                    src={picture}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-[2rem] object-cover ring-4 ring-white shadow-lg border border-gray-100"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary text-3xl font-black ring-4 ring-white shadow-lg">
                                    {userInitials}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => profileImageInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-md border border-gray-100 text-gray-400 group-hover:text-primary transition-colors"
                            >
                                <Smartphone size={16} />
                            </button>
                        </div>
                        <div className="space-y-1">
                            <p className="font-black text-gray-900 uppercase tracking-tight">{displayName}</p>
                            {user?.program && (
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    {user.program}{user.major ? ` • ${user.major}` : ''}
                                </p>
                            )}
                            <input
                                ref={profileImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(event) => {
                                    void handleProfilePictureSelect(event);
                                }}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="link"
                                className="p-0 h-auto text-primary text-xs font-black uppercase tracking-widest"
                                onClick={() => profileImageInputRef.current?.click()}
                                disabled={isUploadingPicture}
                            >
                                {isUploadingPicture ? 'Uploading...' : 'Change Photo'}
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">First Name</Label>
                            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Last Name</Label>
                            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Middle Initial</Label>
                            <Input value={middleInitial} onChange={(event) => setMiddleInitial(event.target.value.slice(0, 1).toUpperCase())} placeholder="M" className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" maxLength={1} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Suffix</Label>
                            <Input value={suffix} onChange={(event) => setSuffix(event.target.value)} placeholder="Jr." className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <Input value={email} disabled className="pl-12 h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                            </div>
                        </div>
                        {isReviewee && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Program Track</Label>
                                    <Select value={trackId} onValueChange={setTrackId} disabled={tracksLoading || tracks.length === 0}>
                                        <SelectTrigger className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20">
                                            <SelectValue placeholder={tracksLoading ? 'Loading tracks...' : 'Select program track'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tracks.map((track) => (
                                                <SelectItem key={track.id} value={track.id}>
                                                    {track.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Year</Label>
                                    <Select value={yearLevel} onValueChange={setYearLevel}>
                                        <SelectTrigger className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20">
                                            <SelectValue placeholder="Select year level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="3rd Year">3rd Year</SelectItem>
                                            <SelectItem value="4th Year">4th Year</SelectItem>
                                            <SelectItem value="Alumni">Alumni</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Section</Label>
                                    <Input value={section} onChange={(event) => setSection(event.target.value)} placeholder="A" className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-end gap-3">
                <Button variant="outline" className="h-12 rounded-2xl px-8 font-black border-gray-100" onClick={handleCancel}>Cancel</Button>
                <Button onClick={() => void handleSaveProfile()} disabled={isSavingProfile || isUploadingPicture} className="h-12 rounded-2xl px-8 bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 gap-2">
                    <Save size={18} /> {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </Button>
            </div>
        </div>
    );
};

export default ProfilePage;
