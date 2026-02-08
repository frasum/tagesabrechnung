import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ValidatePinRequest {
  name: string;
  pin_code: string;
}

interface ValidatePinResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    role: "waiter" | "kitchen";
  };
  permission_level?: "staff" | "manager" | "admin";
  error?: string;
}

// Rate limiting configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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

    const body: ValidatePinRequest = await req.json();

    // Validate input
    if (!body.name || !body.pin_code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing name or pin_code",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate input format
    if (typeof body.name !== "string" || typeof body.pin_code !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid input types",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sanitize inputs
    const name = body.name.trim();
    const pin_code = body.pin_code.toString().trim();

    // Validate PIN format (should be 4 digits)
    if (!/^\d{4}$/.test(pin_code)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid PIN format",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate name length
    if (name.length < 1 || name.length > 255) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid name length",
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

    // Check rate limiting - count recent failed attempts for this identifier
    const lockoutTime = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
    const { count: recentAttempts } = await supabase
      .from("auth_attempts")
      .select("*", { count: "exact", head: true })
      .eq("identifier", name.toLowerCase())
      .eq("success", false)
      .gte("attempted_at", lockoutTime);

    if (recentAttempts !== null && recentAttempts >= MAX_ATTEMPTS) {
      // Log the blocked attempt
      await supabase.from("auth_attempts").insert({
        identifier: name.toLowerCase(),
        attempted_at: new Date().toISOString(),
        success: false,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: `Zu viele Fehlversuche. Bitte warten Sie ${LOCKOUT_MINUTES} Minuten.`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find staff member by name
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("id, name, role, is_active")
      .eq("name", name)
      .eq("is_active", true)
      .single();

    if (staffError || !staffData) {
      // Log failed attempt
      await supabase.from("auth_attempts").insert({
        identifier: name.toLowerCase(),
        attempted_at: new Date().toISOString(),
        success: false,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültiger Name oder PIN-Code",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get PIN from protected staff_pins table
    const { data: pinData, error: pinError } = await supabase
      .from("staff_pins")
      .select("pin_code")
      .eq("staff_id", staffData.id)
      .single();

    if (pinError || !pinData || pinData.pin_code !== pin_code) {
      // Log failed attempt
      await supabase.from("auth_attempts").insert({
        identifier: name.toLowerCase(),
        attempted_at: new Date().toISOString(),
        success: false,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültiger Name oder PIN-Code",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log successful attempt
    await supabase.from("auth_attempts").insert({
      identifier: name.toLowerCase(),
      attempted_at: new Date().toISOString(),
      success: true,
    });

    // Fetch permission level from user_roles table
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("permission_level")
      .eq("staff_id", staffData.id)
      .single();

    const permissionLevel = roleData?.permission_level || "staff";

    // Success - return user info (without PIN) including permission level
    const response: ValidatePinResponse = {
      success: true,
      user: {
        id: staffData.id,
        name: staffData.name,
        role: staffData.role as "waiter" | "kitchen",
      },
      permission_level: permissionLevel,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error validating PIN:", error);

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
