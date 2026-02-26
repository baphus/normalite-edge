export type ApiUserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';

export const toDbUserStatus = (status: string): string => {
    if (status === 'ACTIVE' || status === 'APPROVED') return 'ACTIVE';
    if (status === 'DISABLED' || status === 'REJECTED') return 'DISABLED';
    if (status === 'PENDING') return 'PENDING';
    return 'PENDING';
};

export const fromDbUserStatus = (status: string): ApiUserStatus => {
    if (status === 'ACTIVE' || status === 'APPROVED') return 'ACTIVE';
    if (status === 'DISABLED' || status === 'REJECTED') return 'DISABLED';
    return 'PENDING';
};

export const resolveProgramTrack = (input: {
    program_track?: string;
    programTrack?: string;
    program?: string;
}) => {
    return input.program_track || input.programTrack || input.program;
};
