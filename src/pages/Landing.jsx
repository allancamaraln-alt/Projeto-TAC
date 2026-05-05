import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const FEATURES = [
  { icon: '📋', title: 'Ordens de Serviço', desc: 'Crie, acompanhe e finalize OS com fotos, valores e histórico completo.' },
  { icon: '👥', title: 'Gestão de Clientes', desc: 'Endereço, telefone e todo o histórico de atendimento na palma da mão.' },
  { icon: '🔔', title: 'Lembretes de Manutenção', desc: 'Avise seus clientes automaticamente na época certa para a próxima revisão.' },
  { icon: '📄', title: 'Relatórios em PDF', desc: 'Gere laudos e comprovantes profissionais para enviar pelo WhatsApp.' },
  { icon: '💰', title: 'Relatório de Faturamento', desc: 'Veja quanto faturou na semana, no mês ou nos últimos 3 meses. Ticket médio e OS concluídas em um só lugar.' },
  { icon: '📱', title: 'Funciona no celular', desc: 'App rápido e leve, feito para usar em campo, em qualquer Android ou iPhone.' },
  { icon: '🌐', title: 'Acesso offline', desc: 'Sem sinal no local? O app abre e você consulta seus dados mesmo sem internet.' },
]

const TESTIMONIALS = [
  { name: 'Carlos Mendes', city: 'São Paulo, SP', text: 'Antes eu anotava tudo em papel e esquecia metade. Agora tenho tudo no ClimaPro e nunca mais perdi um cliente por falta de follow-up.' },
  { name: 'Rogério Lima', city: 'Belo Horizonte, MG', text: 'O PDF de laudo impressiona os clientes. Parece uma empresa grande, sendo que sou autônomo. Faz diferença na hora de fechar serviço.' },
  { name: 'Fábio Teixeira', city: 'Recife, PE', text: 'Os lembretes de revisão preventiva me trouxeram clientes que eu nem lembrava mais. Virou renda extra sem esforço nenhum.' },
]

const FAQS = [
  { q: 'Funciona no iPhone e no Android?', a: 'Sim. O ClimaPro é um app web que funciona em qualquer celular com navegador — sem precisar instalar nada. Também está disponível na Google Play Store para Android.' },
  { q: 'Precisa de internet para usar?', a: 'Não. O app funciona offline e sincroniza os dados automaticamente quando você tiver conexão. Perfeito para usar em locais sem sinal.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim, a qualquer momento, sem multa. No plano mensal o acesso continua até o fim do período pago. No anual, o cancelamento encerra a renovação.' },
  { q: 'Meus dados ficam seguros?', a: 'Sim. Os dados são armazenados com criptografia na plataforma Supabase e o acesso é restrito somente à sua conta.' },
  { q: 'O período de teste é realmente grátis?', a: 'Sim. 7 dias sem cartão de crédito. Só pedimos seu e-mail para criar a conta.' },
]

const ACCENT = '#0284c7'
const ACCENT_DK = '#0369a1'

function PhoneMockup() {
  return (
    <div style={{ position: 'relative', width: 220, margin: '0 auto' }}>
      <div style={{
        width: 220, borderRadius: 36, background: '#1e293b',
        padding: '12px 8px', boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
      }}>
        <div style={{ borderRadius: 28, overflow: 'hidden', background: '#f1f5f9' }}>
          {/* Status bar */}
          <div style={{ background: ACCENT, padding: '8px 16px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>ClimaPro</span>
            <span style={{ fontSize: 16 }}>❄️</span>
          </div>
          {/* Header */}
          <div style={{ background: `linear-gradient(160deg, ${ACCENT}, ${ACCENT_DK})`, padding: '12px 14px 14px' }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, marginBottom: 2 }}>Boa tarde,</div>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>Carlos Técnico 👋</div>
          </div>
          {/* Cards */}
          <div style={{ padding: '10px 10px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[['📋', 'Nova OS'], ['📊', 'Relatório']].map(([ic, lb]) => (
              <div key={lb} style={{ background: 'white', borderRadius: 10, padding: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{ic}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#0f172a' }}>{lb}</div>
              </div>
            ))}
          </div>
          {/* Stats */}
          <div style={{ padding: '0 10px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[['3', 'Em andamento', '#fef3c7', '#d97706'], ['12', 'Concluídos', '#dcfce7', '#16a34a']].map(([n, lb, bg, color]) => (
              <div key={lb} style={{ background: bg, borderRadius: 8, padding: '6px 8px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color }}>{n}</div>
                <div style={{ fontSize: 7, color: '#64748b' }}>{lb}</div>
              </div>
            ))}
          </div>
          {/* List */}
          <div style={{ padding: '0 10px 6px' }}>
            <div style={{ fontSize: 7, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>RECENTES</div>
            {[['Mateus Silva', 'Manutenção preventiva', '#16a34a'], ['João Costa', 'Instalação split', '#d97706']].map(([name, desc, color]) => (
              <div key={name} style={{ background: 'white', borderRadius: 8, padding: '6px 8px', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#0f172a' }}>{name}</div>
                  <div style={{ fontSize: 7, color: '#64748b' }}>{desc}</div>
                </div>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
              </div>
            ))}
          </div>
          {/* Nav */}
          <div style={{ background: 'white', padding: '6px 0', display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #e2e8f0' }}>
            {['🏠', '📋', '👥', '🔔', '👤'].map(ic => (
              <span key={ic} style={{ fontSize: 14 }}>{ic}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #e2e8f0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{q}</span>
        <span style={{ fontSize: 20, color: ACCENT, flexShrink: 0, marginLeft: 12, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </button>
      {open && (
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px', paddingRight: 32 }}>{a}</p>
      )}
    </div>
  )
}

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
      <section style={{ background: `linear-gradient(160deg, ${ACCENT} 0%, ${ACCENT_DK} 100%)`, padding: '64px 24px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 48, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280, maxWidth: 560 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: 100, padding: '6px 16px', fontSize: 13, color: 'white', fontWeight: 600, marginBottom: 20 }}>
              Grátis por 7 dias — sem cartão de crédito
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 800, color: 'white', lineHeight: 1.15, margin: '0 0 20px' }}>
              O app feito para técnicos de ar-condicionado
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: '0 0 36px' }}>
              Chega de papelada e anotações perdidas. Organize suas ordens de serviço, clientes e lembretes em um só lugar — direto pelo celular.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
          <div style={{ flex: '0 0 auto' }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[['✅', 'Sem cartão de crédito'], ['🔒', 'Dados protegidos'], ['📵', 'Funciona offline'], ['⚡', 'Pronto em 2 minutos']].map(([ic, lb]) => (
            <div key={lb} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', fontWeight: 500 }}>
              <span>{ic}</span><span>{lb}</span>
            </div>
          ))}
        </div>
      </div>

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

      {/* Testimonials */}
      <section style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            O que os técnicos dizem
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 16, marginBottom: 48 }}>
            Avaliações de quem já usa no dia a dia
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: '#f8fafc', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#fbbf24', fontSize: 16, marginBottom: 12 }}>★★★★★</div>
                <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px', fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.city}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '72px 24px', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          Perguntas frequentes
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 16, marginBottom: 48 }}>
          Dúvidas comuns antes de começar
        </p>
        <div>
          {FAQS.map(faq => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
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
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: ACCENT, color: 'white', fontWeight: 700, fontSize: 12, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>
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
                Testar grátis por 7 dias
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
                Testar grátis por 7 dias
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
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, margin: '0 0 8px' }}>
          Cadastro em menos de 2 minutos. Sem cartão de crédito.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: '0 0 32px' }}>
          Cancele a qualquer momento, sem burocracia.
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
