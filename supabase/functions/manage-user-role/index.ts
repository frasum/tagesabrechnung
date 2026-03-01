import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

// GET: Fetch permission level for a staff member (by staff_id or auth_user_id)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const staffId = url.searchParams.get("staff_id");
      const authUserId = url.searchParams.get("auth_user_id");

      let resolvedStaffId = staffId;
      if (authUserId && !staffId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("staff_id")
          .eq("user_id", authUserId)
          .single();
        resolvedStaffId = profile?.staff_id || null;
      }

      if (!resolvedStaffId) {
        return new Response(
          JSON.stringify({ 
            staff_id: null,
            staff_name: null,
            staff_role: null,
            permission_level: "staff" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const [staffResult, roleResult] = await Promise.all([
        supabase.from("staff").select("id, name, role").eq("id", resolvedStaffId).single(),
        supabase.from("user_roles").select("permission_level").eq("staff_id", resolvedStaffId).single()
      ]);

      if (staffResult.error && staffResult.error.code !== "PGRST116") {
        console.error("Error fetching staff:", staffResult.error);
      }
      if (roleResult.error && roleResult.error.code !== "PGRST116") {
        console.error("Error fetching role:", roleResult.error);
      }

      return new Response(
        JSON.stringify({ 
          staff_id: resolvedStaffId,
          staff_name: staffResult.data?.name || null,
          staff_role: staffResult.data?.role || null,
          permission_level: roleResult.data?.permission_level || "staff" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Set/update permission level - REQUIRES AUTH
    if (req.method === "POST") {
      // Verify caller via Supabase Auth
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid authentication token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Resolve caller's staff_id from their profile (not from request body!)
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("staff_id")
        .eq("user_id", user.id)
        .single();

      if (!callerProfile?.staff_id) {
        return new Response(
          JSON.stringify({ error: "No staff profile linked to your account" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify caller is admin server-side
      const { data: callerPermission } = await supabase.rpc("get_staff_permission", { 
        p_staff_id: callerProfile.staff_id 
      });
      if (callerPermission !== "admin") {
        return new Response(
          JSON.stringify({ error: "Insufficient permissions. Admin role required." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { staff_id, permission_level } = body as ManageRoleRequest;

      if (!staff_id || !permission_level) {
        return new Response(
          JSON.stringify({ error: "Missing staff_id or permission_level" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!["staff", "manager", "admin"].includes(permission_level)) {
        return new Response(
          JSON.stringify({ error: "Invalid permission_level" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("user_roles")
        .upsert(
          { staff_id, permission_level },
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
