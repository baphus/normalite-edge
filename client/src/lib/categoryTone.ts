/**
 * Category colour for reviewee-facing browse surfaces.
 *
 * `/study` used to tint the whole card — background, border, side bar and both
 * button fills — from a map keyed on three literal category names. `Category`
 * is a database model with an admin CRUD page, so every category an admin
 * created fell through to a single default colour, and a rename silently
 * un-coloured an existing one.
 *
 * Colour survives here, confined to the badge, so it still helps a reviewee
 * scan a grid without competing with the maroon primary or the status pill.
 * The seeded categories keep the hues they have today; anything else gets a
 * stable hue derived from its id, so admin-created categories are distinct and
 * do not change colour between loads.
 *
 * Category is never conveyed by colour alone — the badge always carries the
 * name (WCAG 1.4.1). Every tone below is slate-200-weight border on a -50
 * background with -700 text, the same recipe as `StatusPill`, which clears AA
 * for normal text.
 */

const TONES = [
    'border-blue-200 bg-blue-50 text-blue-700',
    'border-amber-200 bg-amber-50 text-amber-700',
    'border-violet-200 bg-violet-50 text-violet-700',
    'border-teal-200 bg-teal-50 text-teal-700',
    'border-rose-200 bg-rose-50 text-rose-700',
    'border-cyan-200 bg-cyan-50 text-cyan-700',
] as const;

/** Mid-tone hex colours matching the TONES hues above, offered when creating a category. */
export const PRESET_COLORS = [
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#14b8a6', // teal
    '#f43f5e', // rose
    '#06b6d4', // cyan
] as const;

/**
 * Continuity with the colours reviewees already associate with the seeded
 * categories. A Map, not an object literal: category names are admin-editable
 * free text, and a plain-object lookup for a category named "constructor" or
 * "toString" would return an inherited function — truthy, and straight into a
 * className.
 *
 * Matching here is by name, so renaming a seeded category drops it to the
 * id-derived tone below. That is a one-time change to a stable value, not a
 * collapse to a shared default.
 */
const SEEDED_TONES = new Map<string, (typeof TONES)[number]>([
    ['general education', TONES[0]],
    ['professional education', TONES[1]],
    ['specialization', TONES[2]],
]);

const NEUTRAL_TONE = 'border-slate-200 bg-slate-100 text-slate-600';

/** djb2. Small, stable, and dependency-free — the spread matters, the cryptography does not. */
function hash(value: string): number {
    let acc = 5381;
    for (let index = 0; index < value.length; index += 1) {
        acc = ((acc << 5) + acc + value.charCodeAt(index)) >>> 0;
    }
    return acc;
}

/**
 * Border/background/text classes for a category badge.
 *
 * `key` should be the category id where one is available, so the tone survives
 * a rename; the name is an acceptable fallback.
 */
export function categoryToneClasses(name: string | null | undefined, key?: string | null): string {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed.toLowerCase() === 'no category') return NEUTRAL_TONE;

    const seeded = SEEDED_TONES.get(trimmed.toLowerCase());
    if (seeded) return seeded;

    return TONES[hash(key || trimmed) % TONES.length];
}
