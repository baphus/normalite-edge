import express from 'express';
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
// Global: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
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

// Upload: 20 uploads per hour
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Upload limit reached, please try again later' },
});

// ─── Middleware ─────────────────────────────────────────
app.use(cors(corsOptions));

// Higher body limit for upload routes only (base64 images). Registered before
// the global parser deliberately: whichever runs first consumes the stream, so
// behind the 2mb one this could never take effect. The real ceiling on an
// upload is still `uploadImageSchema`, which caps the payload well under 5mb —
// this only decides whether an oversized body gets a clear 400 or a raw parser
// error.
app.use('/api/v1/uploads', express.json({ limit: '5mb' }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply rate limiters.
// Sign-in itself is rate-limited by Supabase, since it never reaches this
// service. What is limited here is account creation and the admin
// provisioning surface.
app.use('/api/v1/auth/complete-profile', authLimiter);
app.use('/api/v1/auth/session-start', authLimiter);
// Note the plural: the router mounts at /api/v1/uploads, and an `app.use`
// prefix only matches on segment boundaries — registered against the singular
// form, this limiter applied to nothing.
app.use('/api/v1/uploads', uploadLimiter);
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
