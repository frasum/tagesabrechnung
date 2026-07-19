import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-staff-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UpdatePinRequest {
  staff_id: string;
  pin_code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Dual auth: try OAuth first, fall back to x-staff-id
    let callerStaffId: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ") && authHeader !== `Bearer ${supabaseAnonKey}`) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("staff_id")
          .eq("user_id", user.id)
          .single();
        callerStaffId = profile?.staff_id ?? null;
      }
    }

    // Fallback: x-staff-id header (PIN-based admin)
    if (!callerStaffId) {
      callerStaffId = req.headers.get("x-staff-id");
    }

    if (!callerStaffId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin/manager permission
    const { data: callerPermission } = await supabase.rpc("get_staff_permission", {
      p_staff_id: callerStaffId,
    });

    if (callerPermission !== "admin" && callerPermission !== "manager") {
      return new Response(
        JSON.stringify({ success: false, error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: UpdatePinRequest = await req.json();

    if (!body.staff_id || !body.pin_code) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing staff_id or pin_code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pin_code = body.pin_code.toString().trim();
    if (!/^\d{4}$/.test(pin_code)) {
      return new Response(
        JSON.stringify({ success: false, error: "PIN muss 4 Ziffern haben" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.staff_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid staff_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("id")
      .eq("id", body.staff_id)
      .single();

    if (staffError || !staffData) {
      return new Response(
        JSON.stringify({ success: false, error: "Staff member not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: pinError } = await supabase
      .from("staff_pins")
      .upsert(
        {
          staff_id: body.staff_id,
          pin_code: pin_code,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "staff_id" }
      );

    if (pinError) {
      console.error("Error updating PIN:", pinError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update PIN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating PIN:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
