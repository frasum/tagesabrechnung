import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// Parse COSE public key and import for verification
async function importPublicKey(publicKeyBase64: string, alg: number): Promise<CryptoKey> {
  const keyBytes = base64urlDecode(publicKeyBase64);
  
  if (alg === -7) {
    // ES256 - the key is raw 65-byte uncompressed EC point
    return crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
  } else {
    // RS256 - SPKI format
    return crypto.subtle.importKey(
      "spki",
      keyBytes,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }
}

// Convert DER signature to raw r||s format for WebCrypto
function derToRaw(derSig: Uint8Array): Uint8Array {
  // DER: 0x30 [total-len] 0x02 [r-len] [r] 0x02 [s-len] [s]
  let offset = 2; // skip 0x30 and length
  if (derSig[1] & 0x80) offset += (derSig[1] & 0x7f);
  
  // r
  offset++; // skip 0x02
  const rLen = derSig[offset++];
  const r = derSig.slice(offset, offset + rLen);
  offset += rLen;
  
  // s
  offset++; // skip 0x02
  const sLen = derSig[offset++];
  const s = derSig.slice(offset, offset + sLen);
  
  // Pad/trim to 32 bytes each
  const raw = new Uint8Array(64);
  raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  return raw;
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

    // GET: Generate authentication challenge
    if (req.method === "GET") {
      const credentialId = url.searchParams.get("credential_id");

      // Generate challenge
      const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
      const challenge = base64urlEncode(challengeBytes.buffer);

      // Store challenge (no staff_id yet for auth - we'll verify on POST)
      const { error: insertErr } = await supabase
        .from("webauthn_challenges")
        .insert({
          challenge,
          type: "authenticate",
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

      const options: Record<string, unknown> = {
        challenge,
        rpId,
        userVerification: "required",
        timeout: 60000,
      };

      // If credential_id provided, restrict to that credential
      if (credentialId) {
        options.allowCredentials = [
          { id: credentialId, type: "public-key", transports: ["internal"] },
        ];
      }

      return new Response(JSON.stringify(options), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Verify authentication
    if (req.method === "POST") {
      const body = await req.json();
      const { credential_id, authenticator_data, client_data_json, signature } = body;

      if (!credential_id || !authenticator_data || !client_data_json || !signature) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decode clientDataJSON and verify type
      const clientDataBytes = base64urlDecode(client_data_json);
      const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));

      if (clientData.type !== "webauthn.get") {
        return new Response(JSON.stringify({ error: "Invalid ceremony type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify challenge
      const { data: challengeRecord, error: challengeErr } = await supabase
        .from("webauthn_challenges")
        .select("*")
        .eq("challenge", clientData.challenge)
        .eq("type", "authenticate")
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

      // Look up credential
      const { data: credential, error: credErr } = await supabase
        .from("webauthn_credentials")
        .select("*, staff:staff_id(id, name, role)")
        .eq("credential_id", credential_id)
        .single();

      if (credErr || !credential) {
        return new Response(JSON.stringify({ error: "Credential not found" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify signature using Web Crypto API
      const authDataBytes = base64urlDecode(authenticator_data);
      const clientDataHash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", clientDataBytes)
      );

      // signedData = authData || hash(clientDataJSON)
      const signedData = new Uint8Array(authDataBytes.length + clientDataHash.length);
      signedData.set(authDataBytes, 0);
      signedData.set(clientDataHash, authDataBytes.length);

      const sigBytes = base64urlDecode(signature);

      try {
        // Try ES256 first (most common for platform authenticators)
        const publicKey = await importPublicKey(credential.public_key, -7);
        const rawSig = derToRaw(sigBytes);
        const valid = await crypto.subtle.verify(
          { name: "ECDSA", hash: "SHA-256" },
          publicKey,
          rawSig,
          signedData
        );

        if (!valid) {
          return new Response(JSON.stringify({ error: "Signature verification failed" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (verifyErr) {
        console.error("Signature verification error:", verifyErr);
        return new Response(JSON.stringify({ error: "Signature verification failed" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update counter (replay protection)
      const authDataView = new DataView(authDataBytes.buffer);
      const newCounter = authDataView.getUint32(33); // counter is at byte 33

      if (newCounter > 0 && newCounter <= credential.counter) {
        return new Response(JSON.stringify({ error: "Replay detected" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("webauthn_credentials")
        .update({ counter: newCounter })
        .eq("id", credential.id);

      // Get permission level
      const staffId = credential.staff_id;
      const { data: permData } = await supabase
        .rpc("get_staff_permission", { p_staff_id: staffId });

      const staff = credential.staff as { id: string; name: string; role: string } | null;

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: staffId,
            name: staff?.name || "Unbekannt",
            role: staff?.role || "waiter",
          },
          permission_level: permData || "staff",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webauthn-authenticate error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
