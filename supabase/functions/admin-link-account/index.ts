import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing authorization header', status: 401 };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Create user-scoped client to verify JWT
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) {
    console.error('Token validation failed:', error);
    return { error: 'Invalid authentication token', status: 401 };
  }

  // Create admin client for service-role operations
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Resolve staff_id from profile
  const { data: profile } = await adminClient
    .from('profiles')
    .select('staff_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.staff_id) {
    return { error: 'No staff profile linked', status: 403 };
  }

  // Verify admin permission
  const { data: permission } = await adminClient.rpc('get_staff_permission', {
    p_staff_id: profile.staff_id,
  });

  if (permission !== 'admin') {
    return { error: 'Admin privileges required', status: 403 };
  }

  return { adminClient, staffId: profile.staff_id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ALL operations require admin auth
    const auth = await verifyAdmin(req);
    if ('error' in auth) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { adminClient: supabaseAdmin } = auth;

    // GET: Return profiles based on query param
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');

      if (action === 'get-all-linked') {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('id, user_id, email, full_name, avatar_url, staff_id')
          .not('staff_id', 'is', null)
          .order('email', { ascending: true });

        if (error) {
          console.error('Error fetching linked profiles:', error);
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

      if (action === 'get-linked-for-staff') {
        const staffId = url.searchParams.get('staff_id');
        if (!staffId) {
          return new Response(
            JSON.stringify({ error: 'staff_id ist erforderlich' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('id, user_id, email, full_name, avatar_url, staff_id')
          .eq('staff_id', staffId)
          .order('email', { ascending: true });

        if (error) {
          console.error('Error fetching profiles for staff:', error);
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

      // Default: Return unlinked profiles
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
    }

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
