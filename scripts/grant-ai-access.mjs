/**
 * Libera acesso (ilimitado por padrão) ao Assistente de IA para um usuário,
 * setando profiles.ai_addon_until para uma data bem distante no futuro.
 * Esse campo é independente da assinatura normal (subscribed_until) — veja
 * has_ai_assistant() em supabase/schema.sql.
 *
 * Uso:
 *   node scripts/grant-ai-access.mjs <email> [dias]
 *
 * Exemplos:
 *   node scripts/grant-ai-access.mjs allancamaraln@gmail.com          (ilimitado)
 *   node scripts/grant-ai-access.mjs allancamaraln@gmail.com 30       (30 dias)
 *
 * Variável de ambiente necessária (já deve estar em .env.local):
 *   SUPABASE_SERVICE_ROLE_KEY=...   (Project Settings → API → service_role)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// --- Carrega .env.local se existir ---
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env.local')
try {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const [key, ...val] = line.split('=')
    if (key && val.length) process.env[key.trim()] = val.join('=').trim()
  }
} catch {
  // .env.local não existe, ignora (usa variáveis de ambiente do sistema)
}

const SUPABASE_URL = 'https://iofeaimkdpfhvcjdhjid.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada.')
  console.error('   Adicione ao .env.local: SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui')
  process.exit(1)
}

const [, , email, diasArg] = process.argv

if (!email || !email.includes('@')) {
  console.error('❌ Uso: node scripts/grant-ai-access.mjs <email> [dias]')
  process.exit(1)
}

// Sem "dias" informado -> acesso ilimitado (data bem distante no futuro)
const ILIMITADO = new Date('2099-12-31T23:59:59.000Z')
const novaData = diasArg ? new Date(Date.now() + Number(diasArg) * 24 * 60 * 60 * 1000) : ILIMITADO

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function main() {
  const { data: perfil, error: buscaError } = await supabase
    .from('profiles')
    .select('id, nome, email, ai_addon_until')
    .eq('email', email)
    .maybeSingle()

  if (buscaError) throw new Error(`Erro ao buscar perfil: ${buscaError.message}`)
  if (!perfil) {
    console.error(`❌ Nenhum usuário encontrado com o email ${email}`)
    process.exit(1)
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ ai_addon_until: novaData.toISOString(), ai_addon_auto_renew: false })
    .eq('id', perfil.id)

  if (updateError) throw new Error(`Erro ao atualizar perfil: ${updateError.message}`)

  console.log(`✅ Assistente de IA liberado para ${perfil.nome || perfil.email} <${perfil.email}>`)
  console.log(`   Válido até: ${novaData.toLocaleString('pt-BR')}${diasArg ? ` (${diasArg} dias a partir de agora)` : ' (ilimitado)'}`)
}

main().catch(err => {
  console.error('\n💥 Erro fatal:', err.message)
  process.exit(1)
})
