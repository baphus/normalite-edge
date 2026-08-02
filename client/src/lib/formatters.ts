/** Shared display formatting for the manage dashboards. */

export function formatShortDate(value?: string, fallback = '—'): string {
    if (!value) return fallback;
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/** Minutes rendered as `45m` / `2h`, falling back to minutes when not a whole hour. */
export function formatDurationMinutes(minutes: number, fallback = '—'): string {
    if (!minutes) return fallback;
    if (minutes < 60) return `${minutes}m`;
    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours}h` : `${minutes}m`;
}
