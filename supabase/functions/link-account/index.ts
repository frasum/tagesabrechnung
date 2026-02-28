import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client for user verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { staffName, pinCode } = await req.json();

    if (!staffName || !pinCode) {
      return new Response(
        JSON.stringify({ error: 'Name und PIN erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find the staff member
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('id, name, role')
      .eq('name', staffName)
      .eq('is_active', true)
      .single();

    if (staffError || !staff) {
      return new Response(
        JSON.stringify({ error: 'Mitarbeiter nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the PIN
    const { data: pinData, error: pinError } = await supabaseAdmin
      .from('staff_pins')
      .select('pin_code')
      .eq('staff_id', staff.id)
      .single();

    if (pinError || !pinData || pinData.pin_code !== pinCode) {
      return new Response(
        JSON.stringify({ error: 'Ungültiger PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if THIS user is already linked to a DIFFERENT staff member
    // (Allow multiple OAuth accounts to be linked to the same staff)
    const { data: currentUserProfile } = await supabaseAdmin
      .from('profiles')
      .select('staff_id')
      .eq('user_id', user.id)
      .single();

    if (currentUserProfile?.staff_id && currentUserProfile.staff_id !== staff.id) {
      return new Response(
        JSON.stringify({ error: 'Dein Konto ist bereits mit einem anderen Mitarbeiter verknüpft' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Link the account by updating the profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ staff_id: staff.id })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Verknüpfen des Kontos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        staff: { 
          id: staff.id, 
          name: staff.name, 
          role: staff.role 
        } 
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
