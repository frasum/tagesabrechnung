import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calculationId, pdfPath } = await req.json();
    if (!calculationId || !pdfPath) {
      return new Response(JSON.stringify({ error: "calculationId and pdfPath required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Download PDF from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from("payroll-pdfs")
      .download(pdfPath);

    if (dlError || !fileData) {
      console.error("Download error:", dlError);
      return new Response(JSON.stringify({ error: "PDF download failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64 (chunked to avoid call stack overflow)
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

    // Call Gemini via Lovable AI Gateway with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Du bist ein Experte für deutsche Lohnabrechnungen. Du extrahierst strukturierte Daten aus PDF-Lohnabrechnungen.
Jede Seite enthält typischerweise eine individuelle Lohnabrechnung eines Mitarbeiters.
Extrahiere für jeden Mitarbeiter: Name, Brutto-Gehalt, Netto-Gehalt, steuerfreie SFN-Zuschläge (Sonntags-/Feiertags-/Nachtzuschläge), und den Auszahlungsbetrag.
Wenn ein Wert nicht gefunden werden kann, setze ihn auf null.
Achte besonders auf: "Gesamt-Brutto", "Netto-Verdienst"/"Netto", "steuerfreie Bezüge"/"SFN", "Auszahlung"/"Überweisungsbetrag".`,
          },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename: "lohnabrechnungen.pdf",
                  file_data: `data:application/pdf;base64,${base64}`,
                },
              },
              {
                type: "text",
                text: "Extrahiere aus jeder Lohnabrechnung in diesem PDF die Daten aller Mitarbeiter.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_payroll_data",
              description: "Extracted payroll data from all employee payslips in the PDF",
              parameters: {
                type: "object",
                properties: {
                  employees: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Full name of the employee" },
                        brutto: { type: "number", description: "Gross salary (Brutto-Gehalt) in EUR" },
                        netto: { type: "number", description: "Net salary (Netto-Gehalt) in EUR" },
                        sfn: { type: "number", description: "Tax-free SFN surcharges (steuerfreie Zuschläge) in EUR" },
                        auszahlung: { type: "number", description: "Payout amount (Auszahlungsbetrag) in EUR" },
                      },
                      required: ["name"],
                    },
                  },
                },
                required: ["employees"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_payroll_data" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht, bitte später erneut versuchen." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Guthaben aufgebraucht. Bitte laden Sie Ihr Konto auf." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI parsing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    
    // Extract tool call arguments
    let employees: any[] = [];
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        employees = parsed.employees || [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    // Save results to DB
    const { error: updateError } = await supabase
      .from("payroll_calculations")
      .update({ external_results: employees })
      .eq("id", calculationId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save parsed results" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ employees, count: employees.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-payroll-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
