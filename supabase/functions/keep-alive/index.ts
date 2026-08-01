import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (_req) => {
  const { error } = await supabase.rpc("ping");

  if (error) {
    // Fallback: raw SQL ping if rpc fails
    const { error: sqlError } = await supabase
      .from("keep_alive")
      .select("1")
      .limit(1)
      .maybeSingle();

    // If the table doesn't exist, just do a lightweight auth call
    if (sqlError) {
      await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    }
  }

  return new Response(
    JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
});
