/**
 * Recuperação de usuários com trial vencido.
 * Envia email personalizado para cada usuário que:
 *   - Terminou o trial (trial_starts_at + 7 dias < agora)
 *   - Não tem assinatura ativa (subscribed_until IS NULL ou < agora)
 *
 * Uso:
 *   node scripts/recover-trial-users.mjs
 *
 * Variáveis de ambiente necessárias (copie para .env.local):
 *   SUPABASE_SERVICE_ROLE_KEY=...   (Project Settings → API → service_role)
 *   GMAIL_USER=allancamaraln@gmail.com
 *   GMAIL_APP_PASSWORD=...          (Google Account → Segurança → Senhas de app)
 *   APP_URL=https://app.climatecnico.com.br  (URL do app para o CTA)
 */

import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
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

// --- Validação de credenciais ---
const SUPABASE_URL = 'https://iofeaimkdpfhvcjdhjid.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD
const APP_URL = process.env.APP_URL || 'https://climaproapp.com.br'

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada.')
  console.error('   Adicione ao .env.local: SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui')
  process.exit(1)
}
if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error('❌ GMAIL_USER e GMAIL_APP_PASSWORD são obrigatórios.')
  console.error('   Gere uma senha de app em: https://myaccount.google.com/apppasswords')
  process.exit(1)
}

// --- Clientes ---
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
})

// --- Busca usuários com trial vencido ---
async function buscarUsuariosTrialVencido() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, nome, trial_starts_at, subscribed_until')
    .not('email', 'is', null)
    .not('trial_starts_at', 'is', null)
    .lt('trial_starts_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .or('subscribed_until.is.null,subscribed_until.lt.' + new Date().toISOString())

  if (error) throw new Error(`Erro ao consultar Supabase: ${error.message}`)
  return data || []
}

// --- Template do email ---
function gerarEmailHTML(nome, appUrl) {
  const primeiroNome = nome?.split(' ')[0] || 'Técnico'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seu acesso ao ClimaPro</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:0;line-height:0;">
              <img src="https://iofeaimkdpfhvcjdhjid.supabase.co/storage/v1/object/public/avatars/email-assets/climapro-header.jpg"
                   alt="ClimaPro" width="560" style="width:100%;max-width:560px;display:block;border-radius:12px 12px 0 0;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827;">Oi, ${primeiroNome}! 👋</p>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                Notamos que seu <strong>período de teste gratuito encerrou</strong> e sentimos sua falta no ClimaPro!
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Durante o período gratuito, você teve acesso a tudo que o app oferece — ordens de serviço, controle de clientes, lembretes de manutenção e muito mais. Não perca o ritmo que você começou a construir.
              </p>

              <!-- Benefícios -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;">O que você continua tendo acesso</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#374151;">📋 <strong>Ordens de serviço</strong> com numeração automática e PDF</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#374151;">👥 <strong>Clientes</strong> organizados com histórico completo</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#374151;">🔔 <strong>Lembretes de manutenção</strong> para nunca perder um retorno</p>
                    <p style="margin:0;font-size:14px;color:#374151;">📊 <strong>Relatórios</strong> para acompanhar seu desempenho</p>
                  </td>
                </tr>
              </table>

              <!-- Preços -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <!-- Plano Anual -->
                  <td width="48%" style="border:2px solid #0ea5e9;border-radius:12px;padding:20px;vertical-align:top;text-align:center;position:relative;">
                    <p style="margin:0 0 2px;display:inline-block;background:#0ea5e9;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Mais popular</p>
                    <p style="margin:10px 0 2px;font-size:15px;font-weight:700;color:#111827;">Plano Anual</p>
                    <p style="margin:0 0 12px;font-size:12px;color:#6b7280;">Melhor custo-benefício</p>
                    <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:#111827;">R$ 149,90<span style="font-size:13px;font-weight:400;color:#6b7280;">/ano</span></p>
                    <p style="margin:0;font-size:12px;color:#0ea5e9;font-weight:600;">R$ 12,49/mês — economize 37%</p>
                  </td>
                  <td width="4%"></td>
                  <!-- Plano Mensal -->
                  <td width="48%" style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;vertical-align:top;text-align:center;">
                    <p style="margin:0 0 2px;display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;color:transparent;">-</p>
                    <p style="margin:10px 0 2px;font-size:15px;font-weight:700;color:#111827;">Plano Mensal</p>
                    <p style="margin:0 0 12px;font-size:12px;color:#6b7280;">Cancele quando quiser</p>
                    <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:#111827;">R$ 19,90<span style="font-size:13px;font-weight:400;color:#6b7280;">/mês</span></p>
                    <p style="margin:0;font-size:12px;color:#6b7280;">Sem fidelidade</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:8px;">
                      Reativar meu acesso →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
                Você recebeu este email porque criou uma conta no ClimaPro.<br/>
                Dúvidas? Responda este email — estamos aqui para ajudar.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// --- Envia email ---
async function enviarEmail(usuario) {
  const nome = usuario.nome || 'Técnico'
  await transporter.sendMail({
    from: `"ClimaPro" <${GMAIL_USER}>`,
    to: usuario.email,
    subject: `${nome.split(' ')[0]}, seu teste no ClimaPro acabou — continue sem perder nada`,
    html: gerarEmailHTML(nome, APP_URL),
  })
}

// --- Main ---
async function main() {
  console.log('🔍 Buscando usuários com trial vencido...\n')

  const usuarios = await buscarUsuariosTrialVencido()

  if (usuarios.length === 0) {
    console.log('✅ Nenhum usuário com trial vencido encontrado.')
    return
  }

  console.log(`📋 ${usuarios.length} usuário(s) encontrado(s):\n`)
  for (const u of usuarios) {
    const trialFim = new Date(new Date(u.trial_starts_at).getTime() + 7 * 24 * 60 * 60 * 1000)
    const diasVencido = Math.floor((Date.now() - trialFim) / (1000 * 60 * 60 * 24))
    console.log(`  • ${u.nome || '(sem nome)'} <${u.email}> — venceu há ${diasVencido} dia(s)`)
  }

  console.log('\n📧 Enviando emails...\n')

  let enviados = 0
  let erros = 0

  for (const usuario of usuarios) {
    try {
      await enviarEmail(usuario)
      console.log(`  ✅ ${usuario.email}`)
      enviados++
    } catch (err) {
      console.error(`  ❌ ${usuario.email} — ${err.message}`)
      erros++
    }
    // Pequena pausa para não estourar limite do Gmail
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n🏁 Concluído: ${enviados} enviado(s), ${erros} erro(s).`)
}

main().catch(err => {
  console.error('\n💥 Erro fatal:', err.message)
  process.exit(1)
})
