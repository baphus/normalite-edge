import https from 'https';
import { env } from '../config/env';

/**
 * Render Free Tier Ping Script
 * 
 * Render spins down free web services after 15 minutes of inactivity.
 * This script runs every 14 minutes to ping the /api/v1/health endpoint
 * and keep the server awake.
 */

// Use RENDER_EXTERNAL_URL if available (Render sets this automatically).
// Do not use hardcoded fallback — fail gracefully if env var is not set.
const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || '';
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes

function pingServer() {
    // Ping the health check route you already have set up in app.ts!
    const url = `${BACKEND_URL}/api/health`;
    
    console.log(`[Keep-Alive] Pinging ${url} at ${new Date().toISOString()}`);
    
    https.get(url, (res) => {
        if (res.statusCode === 200) {
            console.log(`[Keep-Alive] Success: Server is awake! (Status: ${res.statusCode})`);
        } else {
            console.log(`[Keep-Alive] Warning: Received status ${res.statusCode}`);
        }
    }).on('error', (err) => {
        console.error(`[Keep-Alive] Error pinging server:`, err.message);
    });
}

// Start the ping interval
export function startKeepAlive() {
    // Only run in production with a configured URL
    if (env.NODE_ENV === 'production' && BACKEND_URL) {
        console.log(`[Keep-Alive] Started service. Pinging every 14 minutes.`);
        // Run immediately once
        pingServer();
        // Then run on interval
        setInterval(pingServer, PING_INTERVAL);
    } else if (env.NODE_ENV === 'production' && !BACKEND_URL) {
        console.log(`[Keep-Alive] Disabled (RENDER_EXTERNAL_URL not set)`);
    } else {
        console.log(`[Keep-Alive] Disabled (not in production environment)`);
    }
}
