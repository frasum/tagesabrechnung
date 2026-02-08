import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // GET: Return list of unlinked profiles
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, email, full_name, avatar_url, staff_id')
        .is('staff_id', null)
        .order('email', { ascending: true });

      if (error) {
        console.error('Error fetching profiles:', error);
        return new Response(
          JSON.stringify({ error: 'Fehler beim Laden der Profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data || []),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Link/unlink profile
    const { staff_id, profile_id } = await req.json();

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the profile to check current state
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, staff_id, email')
      .eq('id', profile_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profil nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If linking (staff_id provided), check if staff exists
    if (staff_id) {
      const { data: staff, error: staffError } = await supabaseAdmin
        .from('staff')
        .select('id, name')
        .eq('id', staff_id)
        .single();

      if (staffError || !staff) {
        return new Response(
          JSON.stringify({ error: 'Mitarbeiter nicht gefunden' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if this staff already has a linked profile
      const { data: existingLink } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('staff_id', staff_id)
        .neq('id', profile_id)
        .maybeSingle();

      if (existingLink) {
        return new Response(
          JSON.stringify({ 
            error: `Mitarbeiter ist bereits mit ${existingLink.email} verknüpft` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update the profile with the new staff_id (or null to unlink)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ staff_id: staff_id ?? null })
      .eq('id', profile_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Aktualisieren der Verknüpfung' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: staff_id ? 'Verknüpfung erstellt' : 'Verknüpfung aufgehoben' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
