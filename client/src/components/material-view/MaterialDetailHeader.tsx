import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPill, type StatusTone } from '@/components/manage/StatusPill';
import { formatShortDate } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';

interface Track {
    id: string;
    name: string;
    code?: string | null;
}

interface MaterialCreator {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
}

export interface MaterialDetails {
    id: string;
    title: string;
    description?: string | null;
    category: string | null;
    visibility: 'DRAFT' | 'PUBLISHED';
    totalItems: number;
    tracks: Track[];
    creator?: MaterialCreator;
    createdAt: string;
}

const STATUS_TONE: Record<string, StatusTone> = {
    PUBLISHED: 'live',
    DRAFT: 'draft',
};

const STATUS_LABEL: Record<string, string> = {
    PUBLISHED: 'Published',
    DRAFT: 'Draft',
};

interface MaterialDetailHeaderProps {
    material: MaterialDetails;
    canEdit: boolean;
}

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-baseline gap-1">
        <dt className="text-slate-400">{label}</dt>
        <dd className="font-semibold text-slate-700">{children}</dd>
    </div>
);

export const MaterialDetailHeader: React.FC<MaterialDetailHeaderProps> = ({
    material,
    canEdit,
}) => {
    const { user } = useAuth();

    const visibleTo = useMemo(() => {
        if (!material.tracks || material.tracks.length === 0) return 'All Program Tracks';
        return material.tracks.map((track) => track.name).join(', ');
    }, [material.tracks]);

    const creatorName = useMemo(() => {
        if (!material.creator) return 'Unknown author';
        if (user?.role === 'REVIEWER' && material.creator.id === user?.id) return 'You';
        return material.creator.name
            || `${material.creator.firstName || ''} ${material.creator.lastName || ''}`.trim()
            || 'Unknown author';
    }, [material.creator, user?.id, user?.role]);

    const status = material.visibility || 'DRAFT';

    return (
        <header className="flex flex-col gap-2">
            <nav aria-label="Breadcrumb">
                <ol className="flex items-center gap-1.5 text-[12px] text-slate-500">
                    <li>
                        <Link
                            to="/materials"
                            className="inline-flex items-center gap-1 rounded transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                        >
                            <ArrowLeft size={12} aria-hidden="true" /> Material library
                        </Link>
                    </li>
                    <li aria-hidden="true" className="text-slate-300">/</li>
                    <li className="truncate text-slate-500">{material.category || 'Material details'}</li>
                </ol>
            </nav>

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">
                        {material.title || 'Untitled material'}
                    </h1>
                    <StatusPill
                        tone={STATUS_TONE[status] || 'neutral'}
                        label={STATUS_LABEL[status] || 'Unknown'}
                    />
                </div>

                {canEdit && (
                    <Button
                        asChild
                        className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90"
                    >
                        <Link to={`/materials/${material.id}/edit`}>
                            <Pencil size={13} aria-hidden="true" /> Edit material
                        </Link>
                    </Button>
                )}
            </div>

            <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
                <Fact label="Flashcards">
                    <span className="tabular-nums">{material.totalItems}</span>
                </Fact>
                <Fact label="Author">{creatorName}</Fact>
                <Fact label="Created">{formatShortDate(material.createdAt)}</Fact>
                <Fact label="Visible to">{visibleTo}</Fact>
            </dl>
        </header>
    );
};

export default MaterialDetailHeader;
