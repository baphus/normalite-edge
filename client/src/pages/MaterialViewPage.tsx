import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollectionError } from '@/components/manage/CollectionState';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/axios';
import {
    MaterialDetailHeader,
    type MaterialDetails,
} from '@/components/material-view/MaterialDetailHeader';
import { MaterialOverviewTab } from '@/components/material-view/MaterialOverviewTab';
import { MaterialQuestionsTab } from '@/components/material-view/MaterialQuestionsTab';

const TAB_VALUES = ['overview', 'questions'] as const;
type TabValue = (typeof TAB_VALUES)[number];

const isTabValue = (value: string | null): value is TabValue =>
    TAB_VALUES.includes((value || '') as TabValue);

/** Shown on the loading and error branches, which do not render the header. */
const BackToLibrary: React.FC = () => (
    <Link
        to="/materials"
        className="inline-flex w-fit items-center gap-1 rounded text-[12px] text-slate-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
    >
        <ArrowLeft size={12} aria-hidden="true" /> Material library
    </Link>
);

const MaterialViewPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();

    const [material, setMaterial] = useState<MaterialDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const generationRef = useRef(0);

    const loadMaterial = useCallback(async () => {
        if (!id) return;
        const generation = generationRef.current;
        const stale = () => generation !== generationRef.current;

        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/decks/${id}?questions=true`);
            if (stale()) return;
            setMaterial((response.data?.data || null) as MaterialDetails | null);
        } catch (loadErr) {
            if (stale()) return;
            console.error('Failed to load deck details', loadErr);
            setMaterial(null);
            setError('Could not load this material');
        } finally {
            if (!stale()) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        generationRef.current += 1;

        if (!id) {
            setError('Missing material ID');
            setLoading(false);
            return;
        }
        void loadMaterial();
    }, [id, loadMaterial]);

    const tabParam = searchParams.get('tab');
    const activeTab: TabValue = isTabValue(tabParam) ? tabParam : 'overview';

    const handleTabChange = useCallback(
        (value: string) => {
            setSearchParams(
                (current) => {
                    const next = new URLSearchParams(current);
                    next.set('tab', value);
                    return next;
                },
                { replace: true },
            );
        },
        [setSearchParams],
    );

    const questions = useMemo(() => {
        return (material?.questions || [])
            .slice()
            .sort((first, second) => (first.orderNo ?? 0) - (second.orderNo ?? 0));
    }, [material]);

    const questionCount = questions.length;

    // Drafts can always be edited; published ones cannot.
    const canEdit = material?.visibility !== 'PUBLISHED';

    if (loading) {
        return (
            <div className="flex flex-col gap-3 pb-6 font-lexend">
                <BackToLibrary />
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-72" />
                    <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-9 w-80 rounded-lg" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-[92px] rounded-xl" />
                    ))}
                </div>
                <span className="sr-only" role="status">Loading material...</span>
            </div>
        );
    }

    if (error || !material) {
        return (
            <div className="flex flex-col gap-3 pb-6 font-lexend">
                <BackToLibrary />
                <CollectionError
                    message={error || 'Material not found'}
                    onRetry={error ? () => void loadMaterial() : undefined}
                />
            </div>
        );
    }

    const tabTriggerClass =
        'rounded-md px-3 text-[12px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-white';

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <MaterialDetailHeader
                material={material}
                canEdit={canEdit}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-3">
                <TabsList className="h-9 w-full justify-start gap-1 rounded-lg border border-slate-200 bg-white p-1 sm:w-auto">
                    <TabsTrigger value="overview" className={tabTriggerClass}>
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="questions" className={tabTriggerClass}>
                        Questions
                        <span className="ml-1.5 tabular-nums opacity-70">{questionCount}</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-0">
                    <MaterialOverviewTab material={material} />
                </TabsContent>

                <TabsContent value="questions" className="mt-0">
                    <MaterialQuestionsTab questions={questions} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default MaterialViewPage;
