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

/** Date with time, for audit trails where the hour matters. */
export function formatDateTime(value?: string | null, fallback = '—'): string {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * One decimal, because two is false precision on a score — `41.67%` implies a
 * measurement resolution the underlying mark does not have.
 *
 * `null`/`undefined` is "no score", not zero. The distinction matters: an exam
 * nobody has submitted has no average, and rendering `0.0%` for it tells a
 * manager the cohort failed when in fact the cohort has not sat it.
 */
export function formatPercent(value?: number | null, fallback = '—'): string {
    if (value === null || value === undefined) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return `${numeric.toFixed(1)}%`;
}

/** Seconds rendered as `1h 20m` / `4m 10s` / `35s`. */
export function formatDurationSeconds(seconds?: number | null, fallback = '—'): string {
    const numeric = Math.max(0, Math.round(Number(seconds || 0)));
    if (!numeric) return fallback;

    const hours = Math.floor(numeric / 3600);
    const minutes = Math.floor((numeric % 3600) / 60);
    const remainder = numeric % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${remainder}s`;
    return `${remainder}s`;
}
