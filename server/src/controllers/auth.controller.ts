import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { authService } from '../services/auth.service';

export const authController = {
    /**
     * GET /api/v1/auth/me
     *
     * Reports authentication state for the caller's Supabase session.
     * Answers 200 even when no application profile exists yet — see
     * AuthService.getAuthState for why that matters.
     */
    getMe: catchAsync(async (req: Request, res: Response) => {
        const state = await authService.getAuthState(req.supabaseUser!);
        ApiResponse.success(res, state);
    }),

    /**
     * POST /api/v1/auth/complete-profile
     * Create the application account for a Google-authenticated reviewee.
     */
    completeProfile: catchAsync(async (req: Request, res: Response) => {
        const user = await authService.completeProfile(req.supabaseUser!, req.body);
        ApiResponse.created(res, { user }, 'Profile created');
    }),

    /**
     * POST /api/v1/auth/session-start
     * Record a sign-in in the application audit log.
     */
    sessionStart: catchAsync(async (req: Request, res: Response) => {
        await authService.recordSessionStart(req.user!, req.supabaseUser?.provider ?? null);
        ApiResponse.success(res, null, 'Session recorded');
    }),

    /**
     * POST /api/v1/auth/logout
     * Records the sign-out. Supabase ends the session client-side.
     */
    logout: catchAsync(async (req: Request, res: Response) => {
        await authService.logout(req.user!.userId);
        ApiResponse.success(res, null, 'Logged out successfully');
    }),

    /**
     * PATCH /api/v1/auth/me/profile
     */
    updateProfile: catchAsync(async (req: Request, res: Response) => {
        const user = await authService.updateProfile(req.user!.userId, req.body);
        ApiResponse.success(res, user, 'Profile updated');
    }),

    /**
     * POST /api/v1/auth/onboarding
     */
    completeOnboarding: catchAsync(async (req: Request, res: Response) => {
        const user = await authService.completeOnboarding(req.user!.userId, req.body);
        ApiResponse.success(res, user, 'Onboarding completed');
    }),

    /**
     * POST /api/v1/auth/me/tours
     */
    completeTour: catchAsync(async (req: Request, res: Response) => {
        const user = await authService.completeTour(req.user!.userId, req.body.tourId);
        ApiResponse.success(res, user, 'Tour marked as completed');
    }),
};
