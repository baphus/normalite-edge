/**
 * Account status has two states since admin approval was removed. PENDING no
 * longer exists in the database enum.
 *
 * The legacy aliases below (APPROVED / REJECTED / SUSPENDED / PENDING) are
 * still mapped rather than rejected, so any older client or stored payload
 * collapses onto a real state instead of throwing. New callers should use
 * ACTIVE or DISABLED directly.
 */
export type ApiUserStatus = 'ACTIVE' | 'DISABLED';

const DISABLED_ALIASES = new Set(['DISABLED', 'REJECTED', 'SUSPENDED']);

/**
 * Map an inbound status onto the database enum.
 *
 * Anything unrecognised resolves to ACTIVE, which is the default state for a
 * newly provisioned account. Inbound values are constrained by the Zod schemas
 * in user.validator.ts, so arbitrary strings cannot reach this from the API —
 * disabling an account always requires passing DISABLED explicitly.
 */
export const toDbUserStatus = (status: string): string =>
    DISABLED_ALIASES.has(status) ? 'DISABLED' : 'ACTIVE';

/** Map the database enum onto the API contract. */
export const fromDbUserStatus = (status: string): ApiUserStatus =>
    DISABLED_ALIASES.has(status) ? 'DISABLED' : 'ACTIVE';

export const resolveProgramTrack = (input: {
    program_track?: string;
    programTrack?: string;
    program?: string;
}) => {
    return input.program_track || input.programTrack || input.program;
};
