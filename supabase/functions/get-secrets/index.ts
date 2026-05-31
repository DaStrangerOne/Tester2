import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const secrets = {
      ONSPACE_AI_API_KEY:        Deno.env.get('ONSPACE_AI_API_KEY')        ?? '(not set)',
      ONSPACE_AI_BASE_URL:       Deno.env.get('ONSPACE_AI_BASE_URL')       ?? '(not set)',
      SUPABASE_URL:              Deno.env.get('SUPABASE_URL')              ?? '(not set)',
      SUPABASE_ANON_KEY:         Deno.env.get('SUPABASE_ANON_KEY')         ?? '(not set)',
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '(not set)',
      SUPABASE_DB_URL:           Deno.env.get('SUPABASE_DB_URL')           ?? '(not set)',
    };

    return new Response(JSON.stringify(secrets), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
