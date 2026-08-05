import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx prisma/seed.ts",
    },
    datasource: {
        // Prisma CLI commands (migrate deploy, migrate dev, seed, studio) must
        // connect directly to the database, not through the Supabase
        // transaction-mode pooler (port 6543). Prisma Migrate needs a
        // long-lived session with advisory locks; via pgBouncer in transaction
        // mode it stalls after connecting. The runtime Prisma Client is
        // unaffected — it reads DATABASE_URL itself via @prisma/adapter-pg
        // in src/config/db.ts.
        url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
        shadowDatabaseUrl: process.env.DIRECT_URL || undefined,
    },
});
