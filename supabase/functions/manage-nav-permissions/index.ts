import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    if (req.method === 'GET') {
      // Get permissions for a specific staff member or all managers
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

      // Get all manager permissions (for admin view)
      const { data, error } = await supabase
        .from('manager_nav_permissions')
        .select('staff_id, nav_path');

      if (error) throw error;

      // Group by staff_id
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

    if (req.method === 'POST') {
      const body = await req.json();
      const { staff_id, paths, caller_staff_id } = body;

      // Verify caller is admin
      if (!caller_staff_id) {
        return new Response(
          JSON.stringify({ error: 'Missing caller_staff_id' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: callerPermission } = await supabase.rpc('get_staff_permission', { p_staff_id: caller_staff_id });
      if (callerPermission !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions. Admin role required.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!staff_id || !Array.isArray(paths)) {
        return new Response(
          JSON.stringify({ error: 'staff_id and paths array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete existing permissions for this staff member
      const { error: deleteError } = await supabase
        .from('manager_nav_permissions')
        .delete()
        .eq('staff_id', staff_id);

      if (deleteError) throw deleteError;

      // Insert new permissions if any paths provided
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
