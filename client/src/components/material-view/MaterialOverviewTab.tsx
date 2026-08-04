import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MaterialDetails } from './MaterialDetailHeader';

interface MaterialOverviewTabProps {
    material: MaterialDetails;
}

export const MaterialOverviewTab: React.FC<MaterialOverviewTabProps> = ({ material }) => {
    const navigate = useNavigate();

    return (
        <section className="flex flex-col gap-4">
            <h2 className="sr-only">Material overview</h2>

            {/* Description */}
            {material.description && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        Description
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700">
                        {material.description}
                    </p>
                </div>
            )}

            {/* Study Actions */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Study Actions
                </p>
                <p className="mt-1 text-[13px] text-slate-700">
                    Pick a mode and start right away. Quiz mode gives instant correctness feedback with explanations.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                        className="h-10 gap-2 rounded-lg bg-primary text-[13px] font-semibold text-white hover:bg-primary/90"
                        onClick={() => navigate(`/study/${material.id}?mode=study`)}
                    >
                        <Brain size={15} aria-hidden="true" /> Begin Quiz
                    </Button>
                    <Button
                        variant="outline"
                        className="h-10 gap-2 rounded-lg border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:border-primary/30 hover:text-primary"
                        onClick={() => navigate(`/study/${material.id}?mode=flashcards`)}
                    >
                        <BookOpen size={15} aria-hidden="true" /> Study with Flashcards
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default MaterialOverviewTab;
