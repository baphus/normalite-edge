#!/usr/bin/env node
/**
 * Apply pending Prisma migrations, then get out of the way.
 *
 * This runs on every boot (see `npm start`) so that a migration can never be
 * left behind by a deploy. It exists because one was: `student_id` and
 * `contact_number` were added to schema.prisma and shipped, while the
 * migration that creates those columns was applied by hand afterwards. In
 * between, the deployed Prisma Client selected columns the database did not
 * have and every full-row read of `users` failed with P2022 — which, among
 * other things, broke Google sign-up.
 *
 * Failing here is deliberate: the server does not start. A deploy that dies
 * on a bad migration leaves the previous version serving, which is strictly
 * better than a new version answering 500 to every request that touches the
 * affected model.
 *
 * Retries exist only for the transient case. This project's database sleeps
 * when idle, so a boot can land while it is still waking up, and a restart
 * must not be turned into an outage by a connection blip. A genuinely broken
 * migration fails identically on every attempt and still stops the boot — it
 * just costs a few seconds first.
 */
import { spawnSync } from 'node:child_process';

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [5000, 10000];

const log = (message) => console.log(`[migrate] ${message}`);

const sleep = (ms) => {
    // Synchronous: this must finish before the server is allowed to start,
    // and this script is the whole process.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

const runMigrations = () =>
    spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    log(`applying pending migrations (attempt ${attempt}/${MAX_ATTEMPTS})…`);

    const result = runMigrations();

    if (result.status === 0) {
        log('database is up to date.');
        process.exit(0);
    }

    if (result.error) {
        log(`could not run the Prisma CLI: ${result.error.message}`);
    }

    if (attempt < MAX_ATTEMPTS) {
        const wait = BACKOFF_MS[attempt - 1];
        log(`failed (exit ${result.status}); retrying in ${wait / 1000}s…`);
        sleep(wait);
    }
}

log('');
log('MIGRATIONS FAILED — refusing to start the server.');
log('The running version (if any) keeps serving. Starting anyway would mean');
log('answering requests with a Prisma Client that does not match the database.');
log('');
log('Check DATABASE_URL / DIRECT_URL and the migration output above.');
process.exit(1);
