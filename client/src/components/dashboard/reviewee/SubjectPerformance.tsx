import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MetricTile } from '@/components/manage/MetricTile';
import { SectionLabel } from './SectionLabel';
import type { SubjectPerformanceItem } from './types';

interface SubjectPerformanceProps {
    subjects: SubjectPerformanceItem[];
}

/**
 * Per-subject breakdown rendered as MetricTile cards. Hidden entirely when
 * there are no submitted attempts to break down.
 */
export const SubjectPerformance: React.FC<SubjectPerformanceProps> = ({ subjects }) => {
    if (subjects.length === 0) return null;

    return (
        <Card>
            <CardContent className="p-4 sm:p-5">
                <SectionLabel>Subject performance</SectionLabel>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {subjects.map((s) => (
                        <MetricTile
                            key={s.subject}
                            label={s.subject}
                            value={`${s.avg}%`}
                            hint={`${s.count} attempt${s.count === 1 ? '' : 's'} · best ${s.best}%`}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default SubjectPerformance;
