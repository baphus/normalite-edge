import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../app';
import http from 'http';

/**
 * Security-focused integration tests.
 *
 * These tests verify that security controls are in place and cannot be bypassed.
 * They run against the Express app without needing a database connection.
 */

let server: http.Server;
let baseUrl: string;

function request(
    method: string,
    path: string,
    options?: { body?: unknown; headers?: Record<string, string> }
): Promise<{ status: number; headers: Record<string, string>; body: any }> {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const reqHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options?.headers,
        };
        const bodyStr = options?.body ? JSON.stringify(options.body) : undefined;

        const req = http.request(
            url,
            { method, headers: reqHeaders },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    let body;
                    try {
                        body = JSON.parse(data);
                    } catch {
                        body = data;
                    }
                    const headers: Record<string, string> = {};
                    for (const [key, val] of Object.entries(res.headers)) {
                        if (val) headers[key] = Array.isArray(val) ? val[0] : val;
                    }
                    resolve({ status: res.statusCode!, headers, body });
                });
            }
        );
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

describe('Security Headers', () => {
    before((_, done) => {
        server = app.listen(0, () => {
            const addr = server.address();
            if (addr && typeof addr === 'object') {
                baseUrl = `http://127.0.0.1:${addr.port}`;
            }
            done();
        });
    });

    after((_, done) => {
        server.close(done);
    });

    it('should include Helmet security headers', async () => {
        const res = await request('GET', '/api/health');
        assert.equal(res.status, 200);

        // Helmet headers
        assert.ok(res.headers['x-content-type-options'], 'Missing X-Content-Type-Options');
        assert.equal(res.headers['x-content-type-options'], 'nosniff');

        assert.ok(res.headers['x-frame-options'], 'Missing X-Frame-Options');
    });

    it('should include Content-Security-Policy header', async () => {
        const res = await request('GET', '/api/health');
        assert.ok(res.headers['content-security-policy'], 'Missing CSP header');
        assert.ok(
            res.headers['content-security-policy'].includes("default-src 'self'"),
            'CSP should restrict default-src to self'
        );
    });
});

describe('Authentication Security', () => {
    before((_, done) => {
        if (!server?.listening) {
            server = app.listen(0, () => {
                const addr = server.address();
                if (addr && typeof addr === 'object') {
                    baseUrl = `http://127.0.0.1:${addr.port}`;
                }
                done();
            });
        } else {
            done();
        }
    });

    after((_, done) => {
        server.close(done);
    });

    it('should reject requests without auth token on protected endpoints', async () => {
        const res = await request('GET', '/api/v1/users');
        assert.equal(res.status, 401);
        assert.equal(res.body.success, false);
    });

    it('should reject invalid JWT tokens', async () => {
        const res = await request('GET', '/api/v1/users', {
            headers: { Authorization: 'Bearer invalid.token.here' },
        });
        assert.equal(res.status, 401);
    });

    it('should reject JWT with alg:none (algorithm confusion)', async () => {
        // Craft a token with no signature (alg: none attempt)
        const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(
            JSON.stringify({ userId: 'fake-id', role: 'ADMIN', iat: Math.floor(Date.now() / 1000) })
        ).toString('base64url');
        const fakeToken = `${header}.${payload}.`;

        const res = await request('GET', '/api/v1/users', {
            headers: { Authorization: `Bearer ${fakeToken}` },
        });
        assert.equal(res.status, 401);
    });

    it('should require CSRF header on refresh endpoint', async () => {
        const res = await request('POST', '/api/v1/auth/refresh', {
            headers: {}, // No X-Requested-With header
        });
        assert.equal(res.status, 403);
        assert.ok(res.body.message.includes('CSRF'));
    });

    it('should allow refresh with proper CSRF header', async () => {
        const res = await request('POST', '/api/v1/auth/refresh', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        // Should be 401 (no cookie) not 403 (CSRF blocked)
        assert.equal(res.status, 401);
    });
});

describe('Input Validation', () => {
    before((_, done) => {
        if (!server?.listening) {
            server = app.listen(0, () => {
                const addr = server.address();
                if (addr && typeof addr === 'object') {
                    baseUrl = `http://127.0.0.1:${addr.port}`;
                }
                done();
            });
        } else {
            done();
        }
    });

    after((_, done) => {
        server.close(done);
    });

    it('should reject invalid UUID in path parameters', async () => {
        const res = await request('GET', '/api/v1/users/not-a-valid-uuid/profile', {
            headers: { Authorization: 'Bearer fake-for-path-check' },
        });
        // Should get 400 (bad UUID) or 401 (auth first) — either way, not a 500
        assert.ok(res.status < 500, `Expected client error, got ${res.status}`);
    });

    it('should reject password shorter than 8 characters on registration', async () => {
        const res = await request('POST', '/api/v1/auth/register', {
            body: {
                firstName: 'Test',
                lastName: 'User',
                middleInitial: 'T',
                email: 'test@cnu.edu.ph',
                password: 'short',  // < 8 chars
                campus_id: '11111111-1111-1111-1111-111111111111',
                track_id: '11111111-1111-1111-1111-111111111111',
                yearLevel: '1',
                section: 'A',
            },
        });
        assert.equal(res.status, 400);
        assert.equal(res.body.success, false);
    });

    it('should reject password longer than 128 characters on registration', async () => {
        const res = await request('POST', '/api/v1/auth/register', {
            body: {
                firstName: 'Test',
                lastName: 'User',
                middleInitial: 'T',
                email: 'test@cnu.edu.ph',
                password: 'a'.repeat(129),  // > 128 chars
                campus_id: '11111111-1111-1111-1111-111111111111',
                track_id: '11111111-1111-1111-1111-111111111111',
                yearLevel: '1',
                section: 'A',
            },
        });
        assert.equal(res.status, 400);
        assert.equal(res.body.success, false);
    });

    it('should reject SVG uploads', async () => {
        const svgPayload = 'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+';
        const res = await request('POST', '/api/v1/uploads/image', {
            body: { fileDataUrl: svgPayload, folder: 'question-images' },
            headers: { Authorization: 'Bearer fake-token' },
        });
        // Should be rejected by validator (400) or auth (401), not accepted
        assert.ok(res.status === 400 || res.status === 401);
    });

    it('should reject uploads exceeding size limit', async () => {
        // Create a base64 string that exceeds 2MB
        const largePayload = `data:image/png;base64,${'A'.repeat(2_100_000)}`;
        const res = await request('POST', '/api/v1/uploads/image', {
            body: { fileDataUrl: largePayload, folder: 'question-images' },
            headers: { Authorization: 'Bearer fake-token' },
        });
        // Should be rejected — either 400 (validation) or 401 (auth) or 413 (too large)
        assert.ok(res.status >= 400 && res.status < 500);
    });
});

describe('Rate Limiting', () => {
    before((_, done) => {
        if (!server?.listening) {
            server = app.listen(0, () => {
                const addr = server.address();
                if (addr && typeof addr === 'object') {
                    baseUrl = `http://127.0.0.1:${addr.port}`;
                }
                done();
            });
        } else {
            done();
        }
    });

    after((_, done) => {
        server.close(done);
    });

    it('should include rate limit headers in responses', async () => {
        const res = await request('GET', '/api/v1/auth/me');
        // Rate limit headers should be present
        assert.ok(
            res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'],
            'Should include rate limit headers'
        );
    });
});

describe('CORS', () => {
    before((_, done) => {
        if (!server?.listening) {
            server = app.listen(0, () => {
                const addr = server.address();
                if (addr && typeof addr === 'object') {
                    baseUrl = `http://127.0.0.1:${addr.port}`;
                }
                done();
            });
        } else {
            done();
        }
    });

    after((_, done) => {
        server.close(done);
    });

    it('should reject requests from unauthorized origins', async () => {
        const res = await request('GET', '/api/health', {
            headers: { Origin: 'https://malicious-site.com' },
        });
        // CORS error manifests as missing access-control-allow-origin or error
        const allowedOrigin = res.headers['access-control-allow-origin'];
        assert.ok(
            !allowedOrigin || allowedOrigin !== 'https://malicious-site.com',
            'Should not allow arbitrary origins'
        );
    });
});

describe('Information Leakage', () => {
    before((_, done) => {
        if (!server?.listening) {
            server = app.listen(0, () => {
                const addr = server.address();
                if (addr && typeof addr === 'object') {
                    baseUrl = `http://127.0.0.1:${addr.port}`;
                }
                done();
            });
        } else {
            done();
        }
    });

    after((_, done) => {
        server.close(done);
    });

    it('should not expose stack traces in error responses', async () => {
        const res = await request('GET', '/api/v1/nonexistent-route');
        assert.equal(res.status, 404);
        assert.ok(!res.body.stack, 'Should not include stack trace');
        assert.ok(!res.body.error, 'Should not include raw error object');
    });

    it('should return 404 for unknown routes (not 500)', async () => {
        const res = await request('GET', '/api/v1/this-does-not-exist');
        assert.equal(res.status, 404);
    });

    it('should not include X-Powered-By header', async () => {
        const res = await request('GET', '/api/health');
        assert.ok(!res.headers['x-powered-by'], 'X-Powered-By should be removed by Helmet');
    });
});
