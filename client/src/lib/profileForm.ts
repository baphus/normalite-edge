import * as z from 'zod';

/**
 * Roles that can complete a profile. Anything else — including an unknown or
 * missing role — must not render the form at all: we would have no way to know
 * which fields to ask for, and a form validated against the wrong field set
 * can never be submitted.
 */
export type ProfileRole = 'ADMIN' | 'REVIEWER' | 'REVIEWEE';

const PROFILE_ROLES: readonly string[] = ['ADMIN', 'REVIEWER', 'REVIEWEE'];

export const isProfileRole = (value: unknown): value is ProfileRole =>
    typeof value === 'string' && PROFILE_ROLES.includes(value);

/**
 * Which optional fields a role is asked for.
 *
 * This is the single source of truth for BOTH validation and rendering. It
 * exists because the two used to be derived separately, and drifted: the
 * schema fell back to the REVIEWEE field set whenever the role was unknown
 * while the page rendered none of those inputs, so validation failed on six
 * fields that were not on screen and submit silently did nothing.
 */
export interface ProfileFieldSet {
    campus: boolean;
    track: boolean;
    yearLevel: boolean;
    section: boolean;
    studentId: boolean;
    contactNumber: 'required' | 'optional' | false;
}

export const PROFILE_FIELDS: Record<ProfileRole, ProfileFieldSet> = {
    ADMIN: {
        campus: false,
        track: false,
        yearLevel: false,
        section: false,
        studentId: false,
        contactNumber: false,
    },
    REVIEWER: {
        campus: true,
        track: false,
        yearLevel: false,
        section: false,
        studentId: false,
        contactNumber: 'optional',
    },
    REVIEWEE: {
        campus: true,
        track: true,
        yearLevel: true,
        section: true,
        studentId: true,
        contactNumber: 'required',
    },
};

/**
 * Every field the form can hold. Fields a role is not asked for are simply
 * absent from that role's schema, so they stay `undefined` and are dropped
 * before the request is sent.
 */
export interface ProfileFormValues {
    firstName: string;
    lastName: string;
    middleInitial?: string;
    suffix?: string;
    trackId?: string;
    campusId?: string;
    yearLevel?: string;
    section?: string;
    studentId?: string;
    contactNumber?: string;
}

const PH_MOBILE = /^09\d{9}$/;
const PH_MOBILE_MESSAGE = 'Contact number must be in Philippine format (09XXXXXXXXX)';

/**
 * An optional contact number. Accepts a blank field — the input is registered
 * with an empty-string default, so a plain `.optional()` would reject an
 * untouched field rather than skipping it.
 */
const optionalContactNumber = z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || PH_MOBILE.test(value), PH_MOBILE_MESSAGE);

const requiredContactNumber = z
    .string()
    .trim()
    .min(1, 'Contact number is required')
    .regex(PH_MOBILE, PH_MOBILE_MESSAGE);

/**
 * Build the validation schema for a role from `PROFILE_FIELDS`.
 *
 * Invariant: a field is required here if and only if `PROFILE_FIELDS[role]`
 * says it is rendered. `profileForm.test.ts` asserts this holds for every role.
 */
export const buildProfileSchema = (
    role: ProfileRole,
): z.ZodType<ProfileFormValues, ProfileFormValues> => {
    const fields = PROFILE_FIELDS[role];

    const shape = {
        firstName: z.string().trim().min(1, 'First name is required'),
        lastName: z.string().trim().min(1, 'Last name is required'),
        middleInitial: z.string().trim().max(1, 'Middle initial must be 1 character').optional(),
        suffix: z.string().trim().max(20, 'Suffix is too long').optional(),
        ...(fields.track ? { trackId: z.string().trim().min(1, 'Program track is required') } : {}),
        ...(fields.campus ? { campusId: z.string().trim().min(1, 'Campus is required') } : {}),
        ...(fields.yearLevel ? { yearLevel: z.string().trim().min(1, 'Year is required') } : {}),
        ...(fields.section ? { section: z.string().trim().min(1, 'Section is required') } : {}),
        ...(fields.studentId ? { studentId: z.string().trim().min(1, 'Student ID is required') } : {}),
        ...(fields.contactNumber === 'required' ? { contactNumber: requiredContactNumber } : {}),
        ...(fields.contactNumber === 'optional' ? { contactNumber: optionalContactNumber } : {}),
    };

    // The shape is assembled conditionally, so its inferred type is a union
    // across roles rather than the flat `ProfileFormValues` the form works
    // with. Input and output are both stated so `zodResolver` lines up with
    // `useForm<ProfileFormValues>`.
    return z.object(shape) as unknown as z.ZodType<ProfileFormValues, ProfileFormValues>;
};

/**
 * Defaults for the fields a role actually renders. Building these from the
 * same config keeps every rendered input controlled from first paint.
 */
export const buildProfileDefaults = (role: ProfileRole): ProfileFormValues => {
    const fields = PROFILE_FIELDS[role];

    return {
        firstName: '',
        lastName: '',
        middleInitial: '',
        suffix: '',
        ...(fields.track ? { trackId: '' } : {}),
        ...(fields.campus ? { campusId: '' } : {}),
        ...(fields.yearLevel ? { yearLevel: '' } : {}),
        ...(fields.section ? { section: '' } : {}),
        ...(fields.studentId ? { studentId: '' } : {}),
        ...(fields.contactNumber ? { contactNumber: '' } : {}),
    };
};
