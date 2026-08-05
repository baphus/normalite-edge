import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PROFILE_FIELDS, type ProfileRole } from '@/lib/profileForm';

/**
 * Role-aware identification card shown on profile surfaces.
 *
 * The card is the same artifact for every role, but its title and the details
 * it surfaces are role-specific:
 *  - title: Administrator / Faculty / Student Identification Card
 *  - affiliation rows are driven by `PROFILE_FIELDS` (the same single source
 *    of truth the profile form validates against), so an admin sees only
 *    identity, a reviewer adds campus, and a reviewee gets the full student
 *    field set.
 *
 * The photo is read-only unless `onPictureChange` is provided, in which case
 * the camera and "Update photo" affordances drive a hidden file input.
 */
const CARD_TITLES: Record<string, string> = {
    ADMIN: 'Administrator Identification Card',
    REVIEWER: 'Faculty Identification Card',
    REVIEWEE: 'Student Identification Card',
};

const BADGE_LABELS: Record<string, string> = {
    ADMIN: 'Administrator',
    REVIEWER: 'Faculty',
    REVIEWEE: 'Student',
};

interface IdentificationCardProps {
    className?: string;
    role?: string;
    displayName: string;
    email?: string;
    picture?: string | null;
    campus?: string | null;
    track?: string | null;
    yearLevel?: string | null;
    section?: string | null;
    studentId?: string | null;
    /** Used for the decorative serial code in the footer. */
    userId?: string;
    /** When provided, the photo becomes editable (camera + update photo). */
    onPictureChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isUploadingPicture?: boolean;
}

const IdentificationCard: React.FC<IdentificationCardProps> = ({
    className,
    role,
    displayName,
    email,
    picture,
    campus,
    track,
    yearLevel,
    section,
    studentId,
    userId,
    onPictureChange,
    isUploadingPicture,
}) => {
    const [imgError, setImgError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const editable = Boolean(onPictureChange);

    const cardTitle = CARD_TITLES[role || ''] || 'Identification Card';
    const badgeLabel = BADGE_LABELS[role || ''] || role || 'Member';

    // Affiliation rows are driven by the same per-role field config the
    // profile form uses. Rows a role does not collect are never rendered.
    const fields = role ? PROFILE_FIELDS[role as ProfileRole] : undefined;
    const rows: Array<{ label: string; value: string }> = [
        fields?.campus ? { label: 'Campus', value: campus || '—' } : null,
        fields?.track ? { label: 'Track', value: track || '—' } : null,
        fields?.yearLevel ? { label: 'Year Level', value: yearLevel || '—' } : null,
        fields?.section ? { label: 'Section', value: section || '—' } : null,
        fields?.studentId ? { label: 'Student ID', value: studentId || '—' } : null,
    ].filter((row): row is { label: string; value: string } => row !== null);

    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2);

    return (
        <Card className={cn('border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm', className)}>
            <CardContent className="p-0">
                {/* ── Header Band ─────────────────────────────── */}
                <div className="bg-primary px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[8px] font-medium text-white/60 tracking-[0.2em] uppercase leading-none">Republic of the Philippines</p>
                            <p className="text-[15px] font-black text-white tracking-tight leading-tight mt-1">NORMALITE EDGE</p>
                            <p className="text-[10px] font-semibold text-white/80 leading-snug mt-0.5">Cebu Normal University</p>
                            <p className="text-[8px] font-medium text-white/50 tracking-[0.18em] uppercase mt-2">{cardTitle}</p>
                        </div>
                        <div className="border border-white/30 rounded px-2 py-1 shrink-0 mt-0.5">
                            <p className="text-[9px] uppercase tracking-wider font-bold text-white">{badgeLabel}</p>
                        </div>
                    </div>
                </div>

                {/* ── Body ────────────────────────────────────── */}
                <div className="px-4 pt-4 pb-4 space-y-4">
                    {/* Photo + identity */}
                    <div className="flex gap-4 items-start">
                        <div className={editable ? 'relative group shrink-0' : 'shrink-0'}>
                            {picture && !imgError ? (
                                <img
                                    src={picture}
                                    alt="Profile"
                                    className="h-24 w-18 object-cover border-2 border-primary"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="h-24 w-18 bg-primary/10 text-primary font-black text-xl flex items-center justify-center border-2 border-primary">
                                    {initials}
                                </div>
                            )}
                            {editable && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 h-6 w-6 border border-gray-200 bg-white text-gray-400 flex items-center justify-center group-hover:text-primary transition-colors shadow-sm"
                                >
                                    <Camera size={12} />
                                </button>
                            )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                            <div>
                                <p className="text-[8px] uppercase tracking-[0.18em] font-semibold text-gray-400 leading-none">Name</p>
                                <p className="text-sm font-black text-gray-900 break-words leading-snug mt-0.5">{displayName}</p>
                            </div>
                            <div>
                                <p className="text-[8px] uppercase tracking-[0.18em] font-semibold text-gray-400 leading-none">Email</p>
                                <p className="text-[10px] font-medium text-gray-600 break-all leading-snug mt-0.5">{email || '—'}</p>
                            </div>
                            {editable && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingPicture}
                                    className="text-[10px] font-semibold text-primary disabled:opacity-50"
                                >
                                    {isUploadingPicture ? 'Uploading...' : 'Update photo →'}
                                </button>
                            )}
                        </div>
                    </div>

                    {editable && (
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={onPictureChange}
                            className="hidden"
                        />
                    )}

                    {/* Divider */}
                    <div className="border-t border-dashed border-gray-200" />

                    {/* Info rows */}
                    {rows.length > 0 && (
                        <div className="space-y-3">
                            {rows.map((row) => (
                                <div key={row.label} className="flex items-start justify-between gap-3">
                                    <p className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 shrink-0">{row.label}</p>
                                    <p className="text-[11px] font-semibold text-gray-800 text-right leading-snug">{row.value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ID code footer row */}
                    <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                        <p className="font-mono text-[9px] tracking-[0.14em] text-gray-400 uppercase">
                            {(userId || '00000000').toString().slice(0, 8).toUpperCase()}-NE
                        </p>
                        <p className="text-[9px] uppercase tracking-widest font-black text-primary">{new Date().getFullYear()}</p>
                    </div>
                </div>

                {/* ── Bottom accent stripe ─────────────────────── */}
                <div className="h-1.5 bg-primary" />
            </CardContent>
        </Card>
    );
};

export default IdentificationCard;
