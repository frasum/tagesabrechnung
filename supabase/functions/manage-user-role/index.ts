import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PermissionLevel = "staff" | "manager" | "admin";

interface ManageRoleRequest {
  staff_id: string;
  permission_level: PermissionLevel;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // GET: Fetch permission level for a staff member
    if (req.method === "GET") {
      const url = new URL(req.url);
      const staffId = url.searchParams.get("staff_id");

      if (!staffId) {
        return new Response(
          JSON.stringify({ error: "Missing staff_id parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("permission_level")
        .eq("staff_id", staffId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned (use default)
        throw error;
      }

      return new Response(
        JSON.stringify({ 
          staff_id: staffId,
          permission_level: data?.permission_level || "staff" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Set/update permission level
    if (req.method === "POST") {
      const body: ManageRoleRequest = await req.json();

      if (!body.staff_id || !body.permission_level) {
        return new Response(
          JSON.stringify({ error: "Missing staff_id or permission_level" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate permission level
      if (!["staff", "manager", "admin"].includes(body.permission_level)) {
        return new Response(
          JSON.stringify({ error: "Invalid permission_level" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert the role
      const { data, error } = await supabase
        .from("user_roles")
        .upsert(
          { 
            staff_id: body.staff_id, 
            permission_level: body.permission_level 
          },
          { onConflict: "staff_id" }
        )
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error managing user role:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
