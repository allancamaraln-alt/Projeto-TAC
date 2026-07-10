import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export type AdminAuthResult =
  | { ok: true; user: { id: string; email?: string }; adminClient: ReturnType<typeof createClient> }
  | { ok: false; response: Response }

// Confirma que a requisição vem de um usuário logado E que esse usuário tem
// is_admin=true no banco. Nunca confia numa flag de admin vinda do frontend —
// sempre reconsulta o profile com a service role. Usado por admin-tracking e
// admin-analytics (evita duplicar esse bloco pela 3ª vez).
export async function requireAdmin(req: Request): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    }
  }

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    }
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: callerProfile } = await adminClient
    .from('profiles').select('is_admin').eq('id', user.id).single()

  if (!callerProfile?.is_admin) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Acesso restrito a administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    }
  }

  return { ok: true, user, adminClient }
}
