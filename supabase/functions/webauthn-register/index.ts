import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Base64url helpers
function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);

    // GET: Generate registration challenge
    if (req.method === "GET") {
      const staffId = url.searchParams.get("staff_id");
      if (!staffId) {
        return new Response(JSON.stringify({ error: "staff_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify staff exists
      const { data: staff, error: staffErr } = await supabase
        .from("staff")
        .select("id, name")
        .eq("id", staffId)
        .single();

      if (staffErr || !staff) {
        return new Response(JSON.stringify({ error: "Staff not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate challenge
      const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
      const challenge = base64urlEncode(challengeBytes.buffer);

      // Store challenge
      const { error: insertErr } = await supabase
        .from("webauthn_challenges")
        .insert({
          challenge,
          staff_id: staffId,
          type: "register",
        });

      if (insertErr) {
        console.error("Challenge insert error:", insertErr);
        return new Response(JSON.stringify({ error: "Failed to create challenge" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean up expired challenges
      await supabase
        .from("webauthn_challenges")
        .delete()
        .lt("expires_at", new Date().toISOString());

      // Build WebAuthn creation options
      // Use the app's origin hostname for RP ID, not the edge function hostname
      const originParam = url.searchParams.get("origin");
      let rpId: string;
      if (originParam) {
        try {
          rpId = new URL(originParam).hostname;
        } catch {
          rpId = url.hostname;
        }
      } else {
        rpId = url.hostname === "localhost" ? "localhost" : url.hostname;
      }

      return new Response(
        JSON.stringify({
          challenge,
          rp: { name: "Tagesabrechnung", id: rpId },
          user: {
            id: base64urlEncode(new TextEncoder().encode(staffId).buffer as ArrayBuffer),
            name: staff.name,
            displayName: staff.name,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256
            { alg: -257, type: "public-key" },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
          attestation: "none",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Complete registration
    if (req.method === "POST") {
      const body = await req.json();
      const { staff_id, credential_id, public_key, attestation_object, client_data_json, device_name } = body;

      if (!staff_id || !credential_id || !public_key || !client_data_json) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decode and verify clientDataJSON
      const clientDataBytes = base64urlDecode(client_data_json);
      const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));

      if (clientData.type !== "webauthn.create") {
        return new Response(JSON.stringify({ error: "Invalid ceremony type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify challenge exists and is valid
      const { data: challengeRecord, error: challengeErr } = await supabase
        .from("webauthn_challenges")
        .select("*")
        .eq("challenge", clientData.challenge)
        .eq("staff_id", staff_id)
        .eq("type", "register")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (challengeErr || !challengeRecord) {
        return new Response(JSON.stringify({ error: "Invalid or expired challenge" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete used challenge
      await supabase
        .from("webauthn_challenges")
        .delete()
        .eq("id", challengeRecord.id);

      // Store credential
      const { error: credErr } = await supabase
        .from("webauthn_credentials")
        .insert({
          staff_id,
          credential_id,
          public_key,
          counter: 0,
          device_name: device_name || null,
        });

      if (credErr) {
        console.error("Credential insert error:", credErr);
        if (credErr.code === "23505") {
          return new Response(JSON.stringify({ error: "Credential already registered" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Failed to store credential" }), {
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
    console.error("webauthn-register error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
