import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx prisma/seed.ts",
    },
    datasource: {
        // Strict separation: the Prisma CLI (migrate deploy, migrate dev,
        // seed, studio) connects ONLY through DIRECT_URL (direct host,
        // port 5432). Prisma Migrate needs a long-lived session with advisory
        // locks; via the Supabase transaction-mode pooler (port 6543) it
        // stalls after connecting. DATABASE_URL (the pooler) is exclusively
        // the runtime client's — it reads it directly via @prisma/adapter-pg
        // in src/config/db.ts. Failing fast here (no fallback) is deliberate:
        // running migrations through the pooler silently leaves drift.
        //
        // No shadowDatabaseUrl: it is a `migrate dev`-only feature, and
        // pointing it at DIRECT_URL makes Prisma reject the config outright
        // ("shadow database appears to be the same as the main database").
        // Supabase cannot create shadow databases anyway; when needed, Prisma
        // derives one from the main URL.
        url: process.env.DIRECT_URL!,
    },
});
