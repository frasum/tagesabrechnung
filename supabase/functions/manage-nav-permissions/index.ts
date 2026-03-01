import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);

    // GET: Read permissions - keep accessible for navigation filtering
    if (req.method === 'GET') {
      const staffId = url.searchParams.get('staff_id');

      if (staffId) {
        const { data, error } = await supabase
          .from('manager_nav_permissions')
          .select('nav_path')
          .eq('staff_id', staffId);

        if (error) throw error;

        return new Response(JSON.stringify({ paths: data.map(p => p.nav_path) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('manager_nav_permissions')
        .select('staff_id, nav_path');

      if (error) throw error;

      const grouped: Record<string, string[]> = {};
      for (const row of data || []) {
        if (!grouped[row.staff_id]) {
          grouped[row.staff_id] = [];
        }
        grouped[row.staff_id].push(row.nav_path);
      }

      return new Response(JSON.stringify({ permissions: grouped }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: Update permissions - REQUIRES AUTH
    if (req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Resolve caller's staff_id from profile
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('staff_id')
        .eq('user_id', user.id)
        .single();

      if (!callerProfile?.staff_id) {
        return new Response(
          JSON.stringify({ error: 'No staff profile linked to your account' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: callerPermission } = await supabase.rpc('get_staff_permission', { 
        p_staff_id: callerProfile.staff_id 
      });
      if (callerPermission !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions. Admin role required.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { staff_id, paths } = body;

      if (!staff_id || !Array.isArray(paths)) {
        return new Response(
          JSON.stringify({ error: 'staff_id and paths array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('manager_nav_permissions')
        .delete()
        .eq('staff_id', staff_id);

      if (deleteError) throw deleteError;

      if (paths.length > 0) {
        const rows = paths.map(nav_path => ({ staff_id, nav_path }));
        const { error: insertError } = await supabase
          .from('manager_nav_permissions')
          .insert(rows);

        if (insertError) throw insertError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
