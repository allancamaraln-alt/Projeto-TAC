import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRACE_DAYS = 3
const PLANOS_RENOVAVEIS: Record<string, { description: string; amount: number; days: number }> = {
  monthly:      { description: 'ClimaPro Básico',       amount: 19.90, days: 30 },
  plus:         { description: 'ClimaPro Técnico Plus', amount: 29.90, days: 30 },
  professional: { description: 'ClimaPro Profissional', amount: 39.90, days: 30 },
}

function emailFalhaHtml(nome: string): string {
  const primeiroNome = nome.split(' ')[0] || 'Técnico'
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;margin-bottom:12px;">
              <span style="font-size:28px;">❄️</span>
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">ClimaPro</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Ordens de Serviço para Técnicos</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
              Olá, ${primeiroNome}! Problema no pagamento 😕
            </h2>
            <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
              Tentamos renovar sua assinatura do <strong>ClimaPro</strong> hoje, mas a cobrança no seu cartão foi recusada.
            </p>

            <!-- Alert box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:14px 16px;">
                  <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">⚠️ Sua assinatura pode ser suspensa</p>
                  <p style="margin:6px 0 0;font-size:13px;color:#b45309;line-height:1.5;">
                    Para continuar usando o ClimaPro sem interrupção, atualize seu cartão o quanto antes.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
              Acesse o app, abra a tela de pagamento e cadastre um novo cartão. O processo leva menos de 1 minuto.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="https://app.climapro.com.br"
                     style="display:inline-block;background:linear-gradient(135deg,#0284c7,#0369a1);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.2px;">
                    Atualizar cartão agora →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
              Se o problema persistir ou precisar de ajuda, responda este email — estamos aqui para ajudar.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              ClimaPro · Ordens de Serviço para Técnicos de AC<br>
              Você está recebendo este email porque tem uma assinatura ativa.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function enviarEmailFalha(email: string, nome: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('RESEND_API_KEY não configurada — email não enviado para', email)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ClimaPro <noreply@climapro.com.br>',
      to: [email],
      subject: `${nome.split(' ')[0]}, houve um problema no pagamento do ClimaPro`,
      html: emailFalhaHtml(nome),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`Falha ao enviar email para ${email}:`, body)
  } else {
    console.log(`📧 Email de falha enviado para ${email}`)
  }
}

serve(async (req) => {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const mpToken = Deno.env.get('MP_ACCESS_TOKEN')!

  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - GRACE_DAYS)
  const windowEnd = new Date(now)
  windowEnd.setDate(windowEnd.getDate() + 1)

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, nome, plan, mp_customer_id, mp_card_id, mp_card_brand, subscribed_until')
    .in('plan', ['monthly', 'plus', 'professional'])
    .eq('auto_renew', true)
    .not('mp_customer_id', 'is', null)
    .not('mp_card_id', 'is', null)
    .gte('subscribed_until', windowStart.toISOString())
    .lte('subscribed_until', windowEnd.toISOString())

  if (error) {
    console.error('Erro ao buscar usuários elegíveis:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const results: Array<{ id: string; email: string; status: string; detail?: string }> = []

  for (const user of users ?? []) {
    const plano = PLANOS_RENOVAVEIS[user.plan] ?? PLANOS_RENOVAVEIS['monthly']
    try {
      const tokenRes = await fetch('https://api.mercadopago.com/v1/card_tokens', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: user.mp_customer_id,
          card_id: user.mp_card_id,
        }),
      })
      const tokenData = await tokenRes.json()

      if (!tokenData.id) {
        throw new Error(`Token inválido: ${JSON.stringify(tokenData)}`)
      }

      const monthRef = now.toISOString().slice(0, 7)

      const paymentRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `auto-renew-${user.id}-${monthRef}`,
        },
        body: JSON.stringify({
          transaction_amount: plano.amount,
          token: tokenData.id,
          description: plano.description,
          installments: 1,
          payment_method_id: user.mp_card_brand,
          payer: {
            type: 'customer',
            id: user.mp_customer_id,
            email: user.email,
          },
          external_reference: user.id,
        }),
      })
      const payment = await paymentRes.json()

      if (payment.status === 'approved') {
        const until = new Date()
        until.setDate(until.getDate() + plano.days + GRACE_DAYS)

        await supabase.from('profiles').update({
          subscribed_until: until.toISOString(),
          plan_locked_at: new Date().toISOString(),
        }).eq('id', user.id)

        results.push({ id: user.id, email: user.email, status: 'renewed' })
        console.log(`✓ Renovado: ${user.email} até ${until.toISOString()}`)
      } else {
        // Envia email de falha apenas na primeira tentativa (dia do vencimento)
        const vencimento = new Date(user.subscribed_until)
        const eHoje = vencimento.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)
        if (eHoje) {
          await enviarEmailFalha(user.email, user.nome || 'Técnico')
        }

        results.push({
          id: user.id,
          email: user.email,
          status: 'failed',
          detail: payment.status_detail ?? payment.status,
        })
        console.error(`✗ Falha ao renovar ${user.email}: ${payment.status} — ${payment.status_detail}`)
      }
    } catch (err) {
      // Erro inesperado (ex: cartão removido do MP) — também notifica
      await enviarEmailFalha(user.email, user.nome || 'Técnico').catch(() => {})

      results.push({ id: user.id, email: user.email, status: 'error', detail: (err as Error).message })
      console.error(`✗ Erro inesperado para ${user.email}:`, err)
    }
  }

  console.log(`Auto-renew concluído: ${results.length} usuário(s) processado(s)`)
  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
