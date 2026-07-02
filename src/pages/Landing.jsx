import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import SocialProofToast from '../components/SocialProofToast'

const STATS = [
  {
    icon: '📋',
    target: 12000,
    format: (n) => '+' + Math.round(n).toLocaleString('pt-BR'),
    label: 'ordens de serviço\ncriadas',
  },
  {
    icon: '🔧',
    target: 850,
    format: (n) => '+' + Math.round(n).toLocaleString('pt-BR'),
    label: 'técnicos\norganizados',
  },
  {
    icon: '💰',
    target: 4.8,
    format: (n) => 'R$ ' + n.toFixed(1).replace('.', ',') + ' mi',
    label: 'em serviços\nacompanhados',
  },
  {
    icon: '📍',
    target: 26,
    format: (n) => Math.round(n) + ' estados',
    label: 'atendidos\nno Brasil',
  },
]

function useCountUp(target, duration = 1600) {
  const [value, setValue] = useState(0)
  const raf = useRef(null)
  const start = useRef(null)

  const run = useCallback(() => {
    start.current = null
    function step(ts) {
      if (!start.current) start.current = ts
      const progress = Math.min((ts - start.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }, [target, duration])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return [value, run]
}

function StatCard({ icon, target, format, label }) {
  const [val, startCount] = useCountUp(target)
  const ref = useRef(null)
  const fired = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true
          startCount()
        }
      },
      { threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [startCount])

  const lines = label.split('\n')

  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '0 8px' }}>
      <div style={{ fontSize: 28, marginBottom: 6, lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontSize: 'clamp(22px, 4vw, 32px)',
        fontWeight: 800,
        color: '#0f172a',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}>
        {format(val)}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: '#64748b', lineHeight: 1.45 }}>
        {lines.map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)}
      </div>
    </div>
  )
}

function StatsStrip() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      borderTop: '1px solid #bae6fd',
      borderBottom: '1px solid #bae6fd',
      padding: '40px 24px',
    }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 32,
        alignItems: 'center',
      }}>
        {STATS.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>
    </div>
  )
}

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
  {
    name: 'Carlos M.',
    role: 'Técnico de refrigeração',
    city: 'São Paulo, SP',
    color: '#0284c7',
    ago: '14:23',
    text: 'Eu anotava tudo no caderno e foto no celular misturada com foto de família. Hoje tá tudo organizado por cliente. Mudou muito.',
  },
  {
    name: 'Rogério L.',
    role: 'Instalador autônomo',
    city: 'Belo Horizonte, MG',
    color: '#16a34a',
    ago: '09:41',
    text: 'Mandei o PDF pelo zap e o cliente perguntou: isso é de alguma empresa? Trabalho sozinho há 6 anos mas agora parece que tenho uma empresa mesmo.',
  },
  {
    name: 'Fábio T.',
    role: 'Técnico de ar-condicionado',
    city: 'Recife, PE',
    color: '#7c3aed',
    ago: '11:07',
    text: 'Voltou um cliente que eu nem lembrava mais por causa do lembrete de revisão. Aquela OS sozinha já pagou o app.',
  },
  {
    name: 'Renato S.',
    role: 'Técnico de refrigeração',
    city: 'Salvador, BA',
    color: '#be185d',
    ago: '16:55',
    text: 'Chego no cliente com tudo no app, histórico, OS anterior, tudo. Ele vê e já confia mais. Faz diferença demais.',
  },
  {
    name: 'Eduardo P.',
    role: 'Técnico de HVAC',
    city: 'Curitiba, PR',
    color: '#d97706',
    ago: '08:19',
    text: 'Uso em obra sem sinal nenhum. Quando chego em casa já sincronizou tudo. Faz 5 meses e nunca perdeu um dado.',
  },
  {
    name: 'Marcos A.',
    role: 'Instalador',
    city: 'Fortaleza, CE',
    color: '#0891b2',
    ago: '13:30',
    text: 'Fui direto no anual. Faço umas 8 OS por semana, o app se pagou na primeira semana. Não tem como não valer.',
  },
]

const FAQS = [
  { q: 'Funciona no iPhone e no Android?', a: 'Sim. O ClimaPro é um app web que funciona em qualquer celular com navegador — sem precisar instalar nada. Também está disponível na Google Play Store para Android.' },
  { q: 'Precisa de internet para usar?', a: 'Não. O app funciona offline e sincroniza os dados automaticamente quando você tiver conexão. Perfeito para usar em locais sem sinal.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim, a qualquer momento, sem multa. No plano mensal o acesso continua até o fim do período pago. No anual, o cancelamento encerra a renovação.' },
  { q: 'Meus dados ficam seguros?', a: 'Sim. Os dados são armazenados com criptografia na plataforma Supabase e o acesso é restrito somente à sua conta.' },
  { q: 'Como funciona o pagamento?', a: 'Você escolhe o plano mensal ou anual e paga via cartão de crédito ou Pix. O acesso é liberado imediatamente após a confirmação.' },
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

const SEALS = [
  { icon: '📱', label: 'Acesso pelo celular' },
  { icon: '🔒', label: 'Dados protegidos' },
  { icon: '💬', label: 'Suporte rápido' },
  { icon: '🚫', label: 'Cancele quando quiser' },
  { icon: '☁️', label: 'Sistema em nuvem' },
  { icon: '📦', label: 'Sem instalação' },
]

function TrustSeals({ dark = false }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 28 }}>
      {SEALS.map(s => (
        <div key={s.label} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 13px',
          borderRadius: 100,
          background: dark ? 'rgba(255,255,255,0.13)' : '#f0f9ff',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.22)' : '#bae6fd'}`,
          fontSize: 12,
          fontWeight: 500,
          color: dark ? 'rgba(255,255,255,0.88)' : '#0369a1',
          backdropFilter: dark ? 'blur(4px)' : 'none',
        }}>
          <span style={{ fontSize: 13, lineHeight: 1 }}>{s.icon}</span>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function AnimatedCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const COUNT = 38
    let particles = []

    function resize() {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      particles = Array.from({ length: COUNT }, () => ({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r:  Math.random() * 1.8 + 0.8,
      }))
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const w = canvas.width
      const h = canvas.height

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx  = particles[i].x - particles[j].x
          const dy  = particles[i].y - particles[j].y
          const d   = Math.sqrt(dx * dx + dy * dy)
          const MAX = 130
          if (d < MAX) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(255,255,255,${(1 - d / MAX) * 0.12})`
            ctx.lineWidth   = 0.8
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      particles.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        ctx.fill()
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0)  { p.x = 0;  p.vx *= -1 }
        if (p.x > w)  { p.x = w;  p.vx *= -1 }
        if (p.y < 0)  { p.y = 0;  p.vy *= -1 }
        if (p.y > h)  { p.y = h;  p.vy *= -1 }
      })

      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}

function ExitIntentPopup({ onClose, onAccept }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(3px)',
        animation: 'fadeInOverlay 0.25s ease',
      }}
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUpCard { from { opacity: 0; transform: translateY(32px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 24,
          maxWidth: 440,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          animation: 'slideUpCard 0.35s cubic-bezier(0.34,1.2,0.64,1)',
          position: 'relative',
        }}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 2,
            background: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer',
            width: 28, height: 28, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748b', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Topo com gradiente */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          padding: '28px 28px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🤔</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 20, margin: '0 0 8px', lineHeight: 1.3 }}>
            O valor não coube no bolso agora?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            Antes de você ir, temos uma última oferta especial para você.
          </p>
        </div>

        {/* Corpo */}
        <div style={{ padding: '24px 28px 28px', textAlign: 'center' }}>
          {/* Badge de desconto */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fef3c7', border: '1.5px solid #fcd34d',
            borderRadius: 100, padding: '6px 18px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 16 }}>🏷️</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>Oferta exclusiva de saída — apenas agora</span>
          </div>

          {/* Preço */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'line-through', marginRight: 8 }}>R$ 19,90/mês</span>
            <span style={{ background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 100 }}>50% OFF</span>
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>R$ 9,95</span>
            <span style={{ fontSize: 15, color: '#64748b' }}>/mês</span>
          </div>
          <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
            Organize suas OS, clientes e envie PDFs pelo WhatsApp.<br />
            Cancele quando quiser — sem fidelidade.
          </p>

          {/* CTA principal */}
          <button
            onClick={onAccept}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white', fontWeight: 700, fontSize: 16,
              padding: '14px', borderRadius: 14, border: 'none',
              cursor: 'pointer', marginBottom: 12,
              boxShadow: '0 4px 16px rgba(22,163,74,0.35)',
            }}
          >
            Quero garantir por R$ 9,95/mês 🎉
          </button>

          {/* Link secundário */}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', fontSize: 13,
              textDecoration: 'underline', padding: 0,
            }}
          >
            Não, obrigado — prefiro pagar mais depois
          </button>
        </div>
      </div>
    </div>
  )
}

const WA_BG = "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8bfb5' fill-opacity='0.15'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40zm0-40h2l-2 2V0zm0 4l4-4h2l-6 6V4zm0 4l8-8h2L40 10V8zm0 4L52 0h2L40 14v-2zm0 4L56 0h2L40 18v-2zm0 4L60 0h2L40 22v-2zm0 4L64 0h2L40 26v-2zm0 4L68 0h2L40 30v-2zm0 4L72 0h2L40 34v-2zm0 4L76 0h2L40 38v-2zm0 4L80 0v2L42 40h-2zm4 0L80 4v2L46 40h-2zm4 0L80 8v2L50 40h-2zm4 0l28-28v2L54 40h-2zm4 0l24-24v2L58 40h-2zm4 0l20-20v2L62 40h-2zm4 0l16-16v2L66 40h-2zm4 0l12-12v2L70 40h-2zm4 0l8-8v2l-6 6h-2zm4 0l4-4v2l-2 2h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"

function TestimonialCard({ t }) {
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', background: 'white', border: '1px solid #e2e8f0', height: '100%' }}>
      <div style={{ background: 'linear-gradient(135deg, #128C7E, #075E54)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: t.color, border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'white', letterSpacing: 0.5 }}>
            {t.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#25D366', border: '2px solid #075E54' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{t.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>online agora</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </div>
      <div style={{ background: '#ece5dd', backgroundImage: WA_BG, padding: '14px 12px 10px', minHeight: 110, display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ background: 'white', borderRadius: '0 12px 12px 12px', padding: '10px 12px 8px', maxWidth: '90%', position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }}>
          <div style={{ position: 'absolute', top: 0, left: -8, width: 0, height: 0, borderTop: '8px solid white', borderLeft: '8px solid transparent' }} />
          <p style={{ margin: 0, fontSize: 13.5, color: '#1a1a1a', lineHeight: 1.55, fontStyle: 'italic' }}>"{t.text}"</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 5 }}>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{t.ago}</span>
            <svg width="14" height="10" viewBox="0 0 16 11" fill="none">
              <path d="M1 5.5L5 9.5L11 1.5" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 5.5L9 9.5L15 1.5" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      <div style={{ background: 'white', padding: '10px 14px 12px', borderTop: '1px solid #f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{t.role}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{t.city}</div>
        </div>
        <div style={{ color: '#fbbf24', fontSize: 14, letterSpacing: 1 }}>★★★★★</div>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const planosRef = useRef(null)
  const [showExitPopup, setShowExitPopup] = useState(false)
  const exitFiredRef = useRef(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [activeSlide, setActiveSlide] = useState(0)
  const sliderRef = useRef(null)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function handleSliderScroll() {
    const el = sliderRef.current
    if (!el) return
    setActiveSlide(Math.round(el.scrollLeft / el.clientWidth))
  }

  function goToSlide(i) {
    const el = sliderRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) localStorage.setItem('climapro_ref', ref.toUpperCase())
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem('exit_popup_shown')) return
    function handleMouseLeave(e) {
      if (e.clientY < 8 && !exitFiredRef.current) {
        exitFiredRef.current = true
        sessionStorage.setItem('exit_popup_shown', '1')
        setShowExitPopup(true)
      }
    }
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [])

  function scrollToPlanos() {
    planosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleExitAccept() {
    setShowExitPopup(false)
    navigate('/entrar?modo=cadastro&plano=monthly&cupom=SAIDA50')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>

      <SocialProofToast />
      {showExitPopup && (
        <ExitIntentPopup
          onClose={() => setShowExitPopup(false)}
          onAccept={handleExitAccept}
        />
      )}

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icons/icon-192.webp" alt="ClimaPro" style={{ width: 36, height: 36, borderRadius: 10 }} />
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
      <section style={{ background: `linear-gradient(160deg, ${ACCENT} 0%, ${ACCENT_DK} 100%)`, padding: '64px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <AnimatedCanvas />
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 48, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 280, maxWidth: 560 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: 100, padding: '6px 16px', fontSize: 13, color: 'white', fontWeight: 600, marginBottom: 20 }}>
              A partir de R$ 19,90/mês — cancele quando quiser
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 800, color: 'white', lineHeight: 1.15, margin: '0 0 20px' }}>
              O app feito para técnicos de ar-condicionado
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: '0 0 36px' }}>
              Chega de papelada e anotações perdidas. Organize suas ordens de serviço, clientes e lembretes em um só lugar — direto pelo celular.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={scrollToPlanos}
                className="btn-pulse-white"
                style={{ background: 'white', color: ACCENT, fontWeight: 700, fontSize: 16, padding: '14px 28px', borderRadius: 14, border: 'none', cursor: 'pointer' }}
              >
                Começar agora
              </button>
              <button
                onClick={() => navigate('/entrar')}
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, fontSize: 16, padding: '14px 28px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.4)', cursor: 'pointer' }}
              >
                Já tenho conta
              </button>
            </div>
            <TrustSeals dark />
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[['🔒', 'Dados protegidos'], ['📵', 'Funciona offline'], ['⚡', 'Pronto em 2 minutos'], ['❌', 'Cancele quando quiser']].map(([ic, lb]) => (
            <div key={lb} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', fontWeight: 500 }}>
              <span>{ic}</span><span>{lb}</span>
            </div>
          ))}
        </div>
      </div>

      <StatsStrip />

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
      <section style={{ background: '#f0fdf4', borderTop: '1px solid #e2e8f0', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            O que os técnicos dizem
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 16, marginBottom: 12 }}>
            Avaliações reais de quem já usa no dia a dia
          </p>
          {isMobile && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', animation: 'swipeHint 1.4s ease-in-out infinite' }}>👆</span>
              Deslize para ver mais depoimentos
            </p>
          )}
          {!isMobile && <div style={{ marginBottom: 36 }} />}
          {isMobile ? (
            <div>
              <div
                ref={sliderRef}
                onScroll={handleSliderScroll}
                style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', margin: '0 -24px' }}
              >
                {TESTIMONIALS.map(t => (
                  <div key={t.name} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', padding: '0 24px', boxSizing: 'border-box' }}>
                    <TestimonialCard t={t} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                {TESTIMONIALS.map((_, i) => (
                  <div key={i} onClick={() => goToSlide(i)} style={{ width: i === activeSlide ? 20 : 6, height: 6, borderRadius: 3, background: i === activeSlide ? ACCENT : '#cbd5e1', transition: 'width 0.3s ease', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              {TESTIMONIALS.map(t => <TestimonialCard key={t.name} t={t} />)}
            </div>
          )}
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
      <section ref={planosRef} style={{ background: 'white', padding: '72px 24px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            Preço simples, sem surpresas
          </h2>
          <p style={{ color: '#64748b', fontSize: 16, marginBottom: 48 }}>
            Escolha o plano ideal e comece a usar agora mesmo.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, alignItems: 'start' }}>

            {/* Básico */}
            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 20, padding: 28, textAlign: 'left' }}>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 4px' }}>Plano Básico</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>Para técnicos começando a se organizar</p>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through', display: 'block', marginBottom: 2 }}>De R$ 29,90/mês</span>
                <div>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#0f172a' }}>R$ 19,90</span>
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>/mês</span>
                </div>
              </div>
              <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }}>
                {[
                  'Criação de ordens de serviço',
                  'Cadastro de clientes',
                  'Histórico básico de atendimentos',
                  'Organização em um só lugar',
                  'Lembretes simples de atendimentos',
                ].map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 9 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.45 }}>{b}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 20px', fontStyle: 'italic', lineHeight: 1.5 }}>
                Ideal para quem ainda usa papel, bloco ou WhatsApp para se organizar
              </p>
              <button
                onClick={() => navigate('/entrar?modo=cadastro&plano=monthly')}
                style={{ width: '100%', background: 'white', color: ACCENT, fontWeight: 700, fontSize: 15, padding: '13px', borderRadius: 12, border: `1.5px solid ${ACCENT}`, cursor: 'pointer' }}
              >
                Assinar agora
              </button>
            </div>

            {/* Profissional - Destaque */}
            <div style={{ border: `2px solid ${ACCENT}`, borderRadius: 20, padding: 28, position: 'relative', boxShadow: '0 4px 24px rgba(2,132,199,0.15)', textAlign: 'left' }}>
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: ACCENT, color: 'white', fontWeight: 700, fontSize: 12, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                MAIS VENDIDO
              </div>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 4px' }}>Plano Profissional</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>Para técnicos que atendem com frequência</p>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through', display: 'block', marginBottom: 2 }}>De R$ 59,90/mês</span>
                <div>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#0f172a' }}>R$ 39,90</span>
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>/mês</span>
                </div>
              </div>
              <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }}>
                {[
                  'Tudo do plano Básico',
                  'Relatório de faturamento',
                  'Mais organização para clientes e OS',
                  'Lembretes e notificações com som',
                  'Histórico completo dos serviços',
                  'Melhor controle dos atendimentos',
                ].map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 9 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.45 }}>{b}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 20px', fontStyle: 'italic', lineHeight: 1.5 }}>
                Ideal para quem quer parar de perder informação e trabalhar de forma mais organizada
              </p>
              <button
                onClick={() => navigate('/entrar?modo=cadastro&plano=professional')}
                className="btn-pulse"
                style={{ width: '100%', background: `linear-gradient(135deg, #38bdf8, ${ACCENT})`, color: 'white', fontWeight: 700, fontSize: 15, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer' }}
              >
                Assinar agora
              </button>
            </div>

            {/* Premium */}
            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 20, padding: 28, textAlign: 'left' }}>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: '0 0 4px' }}>Plano Premium</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>Para alto volume ou pequenas equipes</p>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through', display: 'block', marginBottom: 2 }}>De R$ 239,80/ano</span>
                <div>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#0f172a' }}>R$ 149,90</span>
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>/ano</span>
                </div>
              </div>
              <p style={{ color: ACCENT, fontWeight: 600, fontSize: 13, margin: '0 0 16px' }}>R$ 12,49/mês — economize 37%</p>
              <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }}>
                {[
                  'Tudo do plano Profissional',
                  'Relatório de faturamento avançado',
                  'Controle completo da operação',
                  'Organização avançada de histórico',
                  'Recursos para alto volume de clientes',
                  'Prioridade em suporte',
                ].map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 9 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.45 }}>{b}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 20px', fontStyle: 'italic', lineHeight: 1.5 }}>
                Ideal para quem quer transformar a operação em uma estrutura profissional
              </p>
              <button
                onClick={() => navigate('/entrar?modo=cadastro&plano=annual')}
                style={{ width: '100%', background: 'white', color: ACCENT, fontWeight: 700, fontSize: 15, padding: '13px', borderRadius: 12, border: `1.5px solid ${ACCENT}`, cursor: 'pointer' }}
              >
                Assinar agora
              </button>
            </div>

          </div>
          <TrustSeals />
        </div>
      </section>

      {/* CTA final */}
      <section style={{ background: `linear-gradient(160deg, ${ACCENT} 0%, ${ACCENT_DK} 100%)`, padding: '72px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 16px' }}>
          Comece a usar hoje mesmo
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, margin: '0 0 32px' }}>
          Cadastro em menos de 2 minutos. Cancele quando quiser.
        </p>
        <button
          onClick={scrollToPlanos}
          style={{ background: 'white', color: ACCENT, fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        >
          Criar minha conta
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
