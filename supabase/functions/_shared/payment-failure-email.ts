// E-mail de cobrança recusada, disparado pelo asaas-webhook quando uma assinatura
// (plano ou add-on de IA) vence sem pagamento (PAYMENT_OVERDUE). Mesmo template
// usado antes em auto-renew-subscriptions, só que agora reativo ao webhook em vez
// de um cron diário — o Asaas já cobra a assinatura sozinho a cada ciclo.

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
              Tentamos renovar sua assinatura do <strong>ClimaPro</strong>, mas a cobrança não foi confirmada.
            </p>

            <!-- Alert box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:14px 16px;">
                  <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">⚠️ Sua assinatura pode ser suspensa</p>
                  <p style="margin:6px 0 0;font-size:13px;color:#b45309;line-height:1.5;">
                    Para continuar usando o ClimaPro sem interrupção, atualize seu pagamento o quanto antes.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
              Acesse o app, abra a tela de pagamento e finalize sua assinatura. O processo leva menos de 1 minuto.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="https://app.climapro.com.br"
                     style="display:inline-block;background:linear-gradient(135deg,#0284c7,#0369a1);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.2px;">
                    Atualizar pagamento agora →
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

export async function enviarEmailFalhaPagamento(email: string, nome: string): Promise<void> {
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
