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
  error?: string;
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

    // Query staff table for user with matching name and PIN
    const { data, error } = await supabase
      .from("staff")
      .select("id, name, role, is_active")
      .eq("name", name)
      .eq("pin_code", pin_code)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid name or PIN code",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Success - return user info (without PIN)
    const response: ValidatePinResponse = {
      success: true,
      user: {
        id: data.id,
        name: data.name,
        role: data.role as "waiter" | "kitchen",
      },
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
