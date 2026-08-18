/**
 * Libera acesso temporário (sem cobrança) para um usuário específico,
 * setando profiles.subscribed_until = agora + N dias.
 *
 * Uso:
 *   node scripts/grant-access.mjs <email> [dias]
 *
 * Exemplos:
 *   node scripts/grant-access.mjs palvesdossantos514@gmail.com        (padrão: 7 dias)
 *   node scripts/grant-access.mjs palvesdossantos514@gmail.com 14
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
const dias = Number(diasArg) || 7

if (!email || !email.includes('@')) {
  console.error('❌ Uso: node scripts/grant-access.mjs <email> [dias]')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function main() {
  const { data: perfil, error: buscaError } = await supabase
    .from('profiles')
    .select('id, nome, email, subscribed_until')
    .eq('email', email)
    .maybeSingle()

  if (buscaError) throw new Error(`Erro ao buscar perfil: ${buscaError.message}`)
  if (!perfil) {
    console.error(`❌ Nenhum usuário encontrado com o email ${email}`)
    process.exit(1)
  }

  const novaData = new Date(Date.now() + dias * 24 * 60 * 60 * 1000)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ subscribed_until: novaData.toISOString() })
    .eq('id', perfil.id)

  if (updateError) throw new Error(`Erro ao atualizar perfil: ${updateError.message}`)

  console.log(`✅ Acesso liberado para ${perfil.nome || perfil.email} <${perfil.email}>`)
  console.log(`   Válido até: ${novaData.toLocaleString('pt-BR')} (${dias} dias a partir de agora)`)
}

main().catch(err => {
  console.error('\n💥 Erro fatal:', err.message)
  process.exit(1)
})
