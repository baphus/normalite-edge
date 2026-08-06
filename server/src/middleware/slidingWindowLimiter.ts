import type { Request, Response, NextFunction } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

/**
 * Sliding Window Counter Rate Limiter
 *
 * Unlike fixed-window (which allows bursts at window boundaries), this uses a
 * weighted estimate from the current + previous window counts. ~90%+ accurate
 * with O(1) memory per client.
 *
 * Algorithm:
 *   weighted_count = (prev_count × overlap_ratio) + curr_count
 *   where overlap_ratio = 1 - (elapsed_in_current_window / window_ms)
 *
 * Reference: https://redis.io/glossary/rate-limiting/
 */

interface WindowData {
    currCount: number;
    prevCount: number;
    currWindowStart: number;
}

interface SlidingWindowConfig {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
    message?: string;
}

export function slidingWindowLimiter(config: SlidingWindowConfig) {
    const store = new Map<string, WindowData>();
    const { windowMs, max, message = 'Too many requests, please try again later' } = config;
    const keyGenerator = config.keyGenerator ?? ((req: Request) => ipKeyGenerator(req.ip ?? 'unknown'));

    // Periodic cleanup: evict stale entries every 5 minutes
    const CLEANUP_INTERVAL = 5 * 60 * 1000;
    let lastCleanup = Date.now();

    function cleanup(now: number) {
        if (now - lastCleanup < CLEANUP_INTERVAL) return;
        lastCleanup = now;
        for (const [key, data] of store) {
            if (now - data.currWindowStart > windowMs * 2) {
                store.delete(key);
            }
        }
    }

    return (req: Request, res: Response, next: NextFunction) => {
        const now = Date.now();
        cleanup(now);

        const key = keyGenerator(req);
        const windowStart = Math.floor(now / windowMs) * windowMs;
        const elapsed = now - windowStart;

        let data = store.get(key);

        // New window or first request
        if (!data || data.currWindowStart !== windowStart) {
            const prevCount = data ? data.currCount : 0;
            data = {
                currCount: 0,
                prevCount,
                currWindowStart: windowStart,
            };
            store.set(key, data);
        }

        data.currCount++;

        // Weighted estimate: how much of the previous window overlaps
        const overlapRatio = 1 - elapsed / windowMs;
        const weightedCount = data.prevCount * overlapRatio + data.currCount;

        // Set informational headers
        const remaining = Math.max(0, Math.ceil(max - weightedCount));
        const resetIn = Math.ceil((windowMs - elapsed) / 1000);

        res.setHeader('RateLimit-Policy', `${max};w=${Math.ceil(windowMs / 1000)}`);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs - elapsed) / 1000));

        if (weightedCount > max) {
            res.setHeader('Retry-After', resetIn);
            return res.status(429).json({
                success: false,
                message,
                retryAfter: resetIn,
            });
        }

        next();
    };
}
