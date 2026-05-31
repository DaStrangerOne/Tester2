import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all user profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, email')
      .order('email', { ascending: true });

    if (profilesError) {
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch auth users list for metadata (created_at, last_sign_in)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    // Merge auth metadata into profiles
    const authMap: Record<string, any> = {};
    if (!authError && authData?.users) {
      for (const u of authData.users) {
        authMap[u.id] = {
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          provider: u.app_metadata?.provider ?? 'email',
        };
      }
    }

    const enriched = (profiles ?? []).map((p: any) => ({
      ...p,
      ...(authMap[p.id] ?? {}),
    }));

    return new Response(
      JSON.stringify({ users: enriched, total: enriched.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('get-users error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
