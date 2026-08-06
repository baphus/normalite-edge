import React from 'react';
import { MetricTile } from '@/components/manage/MetricTile';

interface StatTilesProps {
    /** Published study decks / materials available. */
    totalMaterials: number;
    /** Submitted mock exams taken. */
    totalExamsTaken: number;
    /** Overall average; `null` renders the MetricTile em-dash (no data). */
    average: number | null;
}

/**
 * Three headline stat tiles. Uses `MetricTile` so every tile owns the
 * design system's metric value role (24px, 600, tabular figures, 11px label).
 *
 * The streak is rendered separately by `StreakWidget`.
 */
export const StatTiles: React.FC<StatTilesProps> = ({ totalMaterials, totalExamsTaken, average }) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="reviewee-stat-tiles">
        <MetricTile label="Total decks" value={String(totalMaterials)} />
        <MetricTile label="Exams taken" value={String(totalExamsTaken)} />
        <MetricTile
            label="Avg score"
            value={average !== null ? `${average}%` : null}
            hint={average !== null ? `LET passing: 75%` : undefined}
        />
    </div>
);

export default StatTiles;
