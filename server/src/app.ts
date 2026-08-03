import express, { type Request } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { corsOptions } from './config/cors';
import { errorHandler } from './middleware/errorHandler';
import v1Routes from './routes/v1';

const app = express();
app.set('trust proxy', 1); // Trust Render's reverse proxy for correct IP identification

// ─── Security Headers ──────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires inline styles
            imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://*.googleusercontent.com'],
            connectSrc: ["'self'", 'https://res.cloudinary.com'],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow Cloudinary images
}));

// ─── Rate Limiting ─────────────────────────────────────
/**
 * Extract a stable key from the request for rate limiting.
 *
 * Authenticated requests are keyed by the Supabase user ID (decoded from the
 * JWT payload without signature verification — we only need a stable key, not
 * an access grant).  Unauthenticated or malformed-token requests fall back to
 * IP, so anonymous traffic is still bounded.
 *
 * This prevents users behind a shared NAT (campus, school, corporate network)
 * from exhausting a single IP bucket during normal browsing.
 */
function rateLimitKey(req: Request): string {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
        try {
            const payload = JSON.parse(
                Buffer.from(auth.slice(7).split('.')[1], 'base64url').toString(),
            );
            if (typeof payload.sub === 'string') return `user:${payload.sub}`;
        } catch {
            // Malformed token — fall through to IP keying.
        }
    }
    return req.ip ?? 'unknown';
}

// Global: 100 requests per 15 minutes per user (or IP for anonymous traffic)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKey,
    message: { success: false, message: 'Too many requests, please try again later' },
});

// Strict: 5 attempts per 15 minutes for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts, please try again later' },
});

// Upload limits are per-identity and live on the uploads router itself — an
// `app.use` prefix is matched against the un-normalised URL, so `//uploads/…`
// would slip past one registered here.

// ─── Middleware ─────────────────────────────────────────
app.use(cors(corsOptions));

// One body limit for everything, uploads included. A separate 5mb mount for
// /api/v1/uploads used to sit here; it was dead (registered against the
// singular /api/v1/upload, and behind this parser, which consumes the stream
// first) and pointless either way — `uploadImageSchema` caps a payload at
// 2,000,000 characters, which already fits inside 2mb. Reinstating it would
// only have raised how much an unauthenticated caller can make us buffer.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply rate limiters.
// Sign-in itself is rate-limited by Supabase, since it never reaches this
// service. What is limited here is account creation and the admin
// provisioning surface.
app.use('/api/v1/auth/complete-profile', authLimiter);
app.use('/api/v1/auth/session-start', authLimiter);
app.use('/api/v1', globalLimiter);

// ─── Health Check ──────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ────────────────────────────────────────
app.use('/api/v1', v1Routes);

// ─── 404 Handler ───────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ──────────────────────────────
app.use(errorHandler);

export default app;
