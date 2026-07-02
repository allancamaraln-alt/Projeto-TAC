import { useNavigate } from 'react-router-dom'

const ACCENT = '#0284c7'

const BENEFICIOS = [
  'Tudo do plano Básico',
  'Relatório de faturamento',
  'Mais recursos de organização para ordens de serviço',
  'Histórico mais completo dos atendimentos',
  'Mais lembretes para acompanhar serviços e clientes',
  'Notificações com som',
]

export default function PlanoPlus() {
  const navigate = useNavigate()

  return (
    <div style={{
      position: 'fixed', inset: 0, overflowY: 'auto',
      background: 'linear-gradient(160deg, #0284c7 0%, #0369a1 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px',
    }}>

      {/* Fundo decorativo */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: 80, left: '-60px', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      </div>

      <div style={{ maxWidth: 460, width: '100%', position: 'relative' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 12, lineHeight: 1 }}>⚡</div>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 10px', lineHeight: 1.35 }}>
            Antes de finalizar, você pode liberar uma versão mais completa do ClimaPro por apenas R$ 10 a mais.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0, lineHeight: 1.65 }}>
            O <strong style={{ color: 'white' }}>Plano Técnico Plus</strong> tem tudo que você precisa para trabalhar de forma mais organizada — sem pagar pelo plano profissional completo.
          </p>
        </div>

        {/* Card da oferta */}
        <div style={{ background: 'white', borderRadius: 20, padding: '24px 24px 20px', marginBottom: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

          {/* Cabeçalho do plano */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 100, padding: '3px 10px', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>OFERTA ESPECIAL</span>
              </div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: '#0f172a' }}>Plano Técnico Plus</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>Mais completo, ainda acessível</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through', display: 'block' }}>R$ 39,90/mês</span>
                <span style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>R$ 29,90</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>/mês</span>
              </div>
              <div style={{ display: 'inline-block', background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 100, marginTop: 4 }}>
                só +R$ 10 vs Básico
              </div>
            </div>
          </div>

          {/* Benefícios */}
          <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none' }}>
            {BENEFICIOS.map(b => (
              <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 10 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <span style={{ fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{b}</span>
              </li>
            ))}
          </ul>

          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 20px', fontStyle: 'italic', lineHeight: 1.5 }}>
            Ideal para quem quer uma versão mais completa sem pagar pelo plano profissional
          </p>

          {/* CTA principal */}
          <button
            onClick={() => navigate('/entrar?modo=cadastro&plano=plus')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: 'white', fontWeight: 700, fontSize: 16,
              padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(2,132,199,0.35)',
              marginBottom: 10,
            }}
          >
            Quero o Técnico Plus — R$ 29,90/mês
          </button>

          {/* Link secundário */}
          <button
            onClick={() => navigate('/entrar?modo=cadastro&plano=monthly')}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', fontSize: 13, padding: '8px 0',
              textDecoration: 'underline', textDecorationColor: '#cbd5e1',
            }}
          >
            Não obrigado, continuar com o Básico — R$ 19,90/mês
          </button>
        </div>

        {/* Rodapé de segurança */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0 }}>
          🔒 Pagamento seguro via Mercado Pago · Cancele quando quiser
        </p>
      </div>
    </div>
  )
}
