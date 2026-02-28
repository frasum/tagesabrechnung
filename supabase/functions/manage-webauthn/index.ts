import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  try {
    // GET: List credentials for a staff member
    if (req.method === "GET") {
      const staffId = url.searchParams.get("staff_id");
      if (!staffId) {
        return new Response(JSON.stringify({ error: "staff_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("webauthn_credentials")
        .select("id, device_name, created_at")
        .eq("staff_id", staffId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("List credentials error:", error);
        return new Response(JSON.stringify({ error: "Failed to list credentials" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ credentials: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE: Remove a credential
    if (req.method === "DELETE") {
      const body = await req.json();
      const { credential_id, staff_id } = body;

      if (!credential_id || !staff_id) {
        return new Response(JSON.stringify({ error: "credential_id and staff_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("webauthn_credentials")
        .delete()
        .eq("id", credential_id)
        .eq("staff_id", staff_id);

      if (error) {
        console.error("Delete credential error:", error);
        return new Response(JSON.stringify({ error: "Failed to delete credential" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("manage-webauthn error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
