import "dotenv/config";
import { Client } from "pg";

const databaseUrl = process.env.DIRECT_URL;
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "DIRECT_URL, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are required."
  );
}

const jobName = "normalite-edge-keep-alive";
const urlSecretName = "normalite_edge_keep_alive_api_url";
const keySecretName = "normalite_edge_keep_alive_service_role_key";
// The Auth admin endpoint is deliberately used instead of a public-table query:
// this project does not grant the service role access to the public schema.
const apiUrl = `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`;

const jobCommand = `
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = '${urlSecretName}'),
    headers := jsonb_build_object(
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = '${keySecretName}'),
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = '${keySecretName}')
    ),
    timeout_milliseconds := 5000
  );
`;

async function upsertVaultSecret(
  client: Client,
  name: string,
  value: string,
  description: string
) {
  const { rows } = await client.query<{ id: string }>(
    "SELECT id FROM vault.decrypted_secrets WHERE name = $1",
    [name]
  );

  if (rows[0]) {
    await client.query(
      "SELECT vault.update_secret($1::uuid, $2, $3, $4)",
      [rows[0].id, value, name, description]
    );
    return;
  }

  await client.query("SELECT vault.create_secret($1, $2, $3)", [
    value,
    name,
    description,
  ]);
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  console.log("Connecting to Supabase database…");
  await client.connect();

  try {
    console.log("Enabling required Supabase extensions…");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_cron");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions");
    await client.query("CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault");

    await upsertVaultSecret(
      client,
      urlSecretName,
      apiUrl,
      "Normalite EDGE daily keep-alive Supabase API endpoint"
    );
    await upsertVaultSecret(
      client,
      keySecretName,
      serviceRoleKey,
      "Normalite EDGE service-role key for daily keep-alive"
    );

    console.log("Saving credentials in Supabase Vault and scheduling daily activity…");
    await client.query("SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = $1", [
      jobName,
    ]);
    await client.query("SELECT cron.schedule($1, $2, $3)", [
      jobName,
      "17 3 * * *",
      jobCommand,
    ]);

    const { rows } = await client.query<{ schedule: string; jobname: string }>(
      "SELECT schedule, jobname FROM cron.job WHERE jobname = $1",
      [jobName]
    );

    if (!rows[0]) throw new Error("Keep-alive Cron job was not created.");
    console.log(`Configured ${rows[0].jobname} (${rows[0].schedule} UTC).`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof AggregateError) {
    console.error(
      "Could not connect to the configured Supabase database. Check database network access, then retry."
    );
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exitCode = 1;
});
