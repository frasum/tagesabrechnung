import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UpdatePinRequest {
  staff_id: string;
  pin_code: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: UpdatePinRequest = await req.json();

    // Validate input
    if (!body.staff_id || !body.pin_code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing staff_id or pin_code",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate PIN format (should be 4 digits)
    const pin_code = body.pin_code.toString().trim();
    if (!/^\d{4}$/.test(pin_code)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "PIN muss 4 Ziffern haben",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate UUID format for staff_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.staff_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid staff_id format",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role (backend-only)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Verify staff exists
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("id")
      .eq("id", body.staff_id)
      .single();

    if (staffError || !staffData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Staff member not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upsert PIN in the protected staff_pins table
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
        JSON.stringify({
          success: false,
          error: "Failed to update PIN",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating PIN:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
