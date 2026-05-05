import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    icon: '📋',
    title: 'Ordens de Serviço',
    desc: 'Crie, acompanhe e finalize OS com fotos, valores e histórico completo.',
  },
  {
    icon: '👥',
    title: 'Gestão de Clientes',
    desc: 'Endereço, telefone e todo o histórico de atendimento na palma da mão.',
  },
  {
    icon: '🔔',
    title: 'Lembretes de Manutenção',
    desc: 'Avise seus clientes automaticamente na época certa para a próxima revisão.',
  },
  {
    icon: '📄',
    title: 'Relatórios em PDF',
    desc: 'Gere laudos e comprovantes profissionais para enviar pelo WhatsApp.',
  },
  {
    icon: '📱',
    title: 'Funciona no celular',
    desc: 'App rápido e leve, feito para usar em campo, em qualquer Android ou iPhone.',
  },
  {
    icon: '🌐',
    title: 'Funciona offline',
    desc: 'Sem internet no local? Sem problema. Os dados ficam salvos e sincronizam depois.',
  },
]

const ACCENT = '#0284c7'
const ACCENT_DK = '#0369a1'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DK})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              ❄️
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>ClimaPro</span>
          </div>
          <button
            onClick={() => navigate('/entrar')}
            style={{ background: 'none', border: `1.5px solid ${ACCENT}`, color: ACCENT, fontWeight: 600, fontSize: 14, padding: '7px 18px', borderRadius: 10, cursor: 'pointer' }}
          >
            Entrar
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: `linear-gradient(160deg, ${ACCENT} 0%, ${ACCENT_DK} 100%)`, padding: '72px 24px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: 100, padding: '6px 16px', fontSize: 13, color: 'white', fontWeight: 600, marginBottom: 20 }}>
            Grátis por 7 dias — sem cartão de crédito
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 6vw, 46px)', fontWeight: 800, color: 'white', lineHeight: 1.15, margin: '0 0 20px' }}>
            O app feito para técnicos de ar-condicionado
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: '0 0 36px' }}>
            Chega de papelada e anotações perdidas. Organize suas ordens de serviço, clientes e lembretes em um só lugar — direto pelo celular.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/entrar?modo=cadastro')}
              style={{ background: 'white', color: ACCENT, fontWeight: 700, fontSize: 16, padding: '14px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
            >
              Começar grátis agora
            </button>
            <button
              onClick={() => navigate('/entrar')}
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, fontSize: 16, padding: '14px 28px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.4)', cursor: 'pointer' }}
            >
              Já tenho conta
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '72px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          Tudo que você precisa no dia a dia
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 16, marginBottom: 48 }}>
          Desenvolvido pensando na rotina de quem trabalha em campo
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ background: 'white', padding: '72px 24px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            Preço simples, sem surpresas
          </h2>
          <p style={{ color: '#64748b', fontSize: 16, marginBottom: 12 }}>
            7 dias grátis para experimentar. Depois, escolha o plano ideal.
          </p>
          <p style={{ color: ACCENT, fontWeight: 600, fontSize: 14, marginBottom: 48 }}>
            Sem cartão de crédito no período de teste
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>

            {/* Anual */}
            <div style={{ border: `2px solid ${ACCENT}`, borderRadius: 20, padding: 28, position: 'relative', boxShadow: '0 4px 20px rgba(2,132,199,0.15)' }}>
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: ACCENT, color: 'white', fontWeight: 700, fontSize: 12, padding: '4px 14px', borderRadius: 100 }}>
                MAIS POPULAR
              </div>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 4px' }}>Plano Anual</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>Melhor custo-benefício</p>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: '#0f172a' }}>R$ 149,90</span>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>/ano</span>
              </div>
              <p style={{ color: ACCENT, fontWeight: 600, fontSize: 14, margin: '0 0 20px' }}>R$ 12,49/mês — economize 37%</p>
              <button
                onClick={() => navigate('/entrar?modo=cadastro')}
                style={{ width: '100%', background: `linear-gradient(135deg, #38bdf8, ${ACCENT})`, color: 'white', fontWeight: 700, fontSize: 15, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer' }}
              >
                Começar grátis
              </button>
            </div>

            {/* Mensal */}
            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 20, padding: 28 }}>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 4px' }}>Plano Mensal</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>Cancele quando quiser</p>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: '#0f172a' }}>R$ 19,90</span>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>/mês</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 20px' }}>Sem fidelidade</p>
              <button
                onClick={() => navigate('/entrar?modo=cadastro')}
                style={{ width: '100%', background: 'white', color: ACCENT, fontWeight: 700, fontSize: 15, padding: '13px', borderRadius: 12, border: `1.5px solid ${ACCENT}`, cursor: 'pointer' }}
              >
                Começar grátis
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ background: `linear-gradient(160deg, ${ACCENT} 0%, ${ACCENT_DK} 100%)`, padding: '72px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 16px' }}>
          Comece a usar hoje mesmo
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, margin: '0 0 32px' }}>
          Mais de 5 minutos para criar sua conta? Impossível.
        </p>
        <button
          onClick={() => navigate('/entrar?modo=cadastro')}
          style={{ background: 'white', color: ACCENT, fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        >
          Criar conta grátis — 7 dias free
        </button>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0f172a', padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 8px' }}>
          © 2026 ClimaPro — Todos os direitos reservados
        </p>
        <button
          onClick={() => navigate('/privacidade')}
          style={{ background: 'none', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Política de Privacidade
        </button>
        <span style={{ color: '#334155', margin: '0 8px' }}>·</span>
        <a href="mailto:climapro.suporte@gmail.com" style={{ color: '#475569', fontSize: 13 }}>
          climapro.suporte@gmail.com
        </a>
      </footer>

    </div>
  )
}
