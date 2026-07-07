import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { authService } from '../services/auth.service';
import { env } from '../config/env';

export const authController = {
    /**
     * POST /api/v1/auth/register
     * Register a new reviewee.
     */
    register: catchAsync(async (req: Request, res: Response) => {
        const result = await authService.register(req.body);
        ApiResponse.created(res, result, 'Registration successful. Your account is pending admin approval.');
    }),

    /**
     * POST /api/v1/auth/login
     * Login with email and password.
     */
    login: catchAsync(async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const result = await authService.login(email, password);

        // Set refresh token in httpOnly cookie
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: false, // Explicitly false for localhost HTTP
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
        });

        ApiResponse.success(res, {
            accessToken: result.accessToken,
            user: result.user,
        }, 'Logged in successfully');
    }),

    /**
     * POST /api/v1/auth/refresh
     * Refresh the access token using the refresh token cookie.
     */
    refreshToken: catchAsync(async (req: Request, res: Response) => {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            console.warn('Refresh attempt failed: No refresh token cookie found in request');
            return ApiResponse.error(res, 401, 'Refresh token not found');
        }

        const result = await authService.refreshAccessToken(refreshToken);
        ApiResponse.success(res, result, 'Token refreshed');
    }),

    /**
     * POST /api/v1/auth/logout
     */
    logout: catchAsync(async (req: Request, res: Response) => {
        await authService.logout(req.user!.userId);

        res.clearCookie('refreshToken', { path: '/' });
        ApiResponse.success(res, null, 'Logged out successfully');
    }),

    /**
     * GET /api/v1/auth/me
     */
    getMe: catchAsync(async (req: Request, res: Response) => {
        const user = await authService.getCurrentUser(req.user!.userId);
        ApiResponse.success(res, user);
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
