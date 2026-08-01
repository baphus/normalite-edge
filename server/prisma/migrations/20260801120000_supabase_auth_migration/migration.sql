-- Align public.users with Supabase Auth (auth.users).
--
-- Identity and credentials move to Supabase GoTrue. public.users keeps only
-- application state and remains the authorization gate: an auth.users row with
-- no matching row here grants access to nothing.
--
-- Safe as a destructive migration because public.users is empty at the time of
-- writing. Verify `SELECT count(*) FROM users;` returns 0 before applying.

-- 1. Primary keys now originate from auth.users.id rather than being generated
--    here, so the two tables share one canonical UUID per person.
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

-- 2. Credentials are owned by auth.users from here on.
ALTER TABLE "users" DROP COLUMN "password_hash";
ALTER TABLE "users" DROP COLUMN "refresh_token_hash";

-- 3. Admin approval is removed — Google Workspace membership plus profile
--    completion is sufficient, so there is no longer a PENDING state.
--
--    The default must be dropped before the enum label can be removed,
--    otherwise the ALTER TYPE fails on a default referencing a value that no
--    longer exists.
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;

UPDATE "users" SET "status" = 'ACTIVE' WHERE "status" = 'PENDING';

ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
ALTER TABLE "users"
    ALTER COLUMN "status" TYPE "UserStatus"
    USING ("status"::text::"UserStatus");
DROP TYPE "UserStatus_old";

ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
