import { useState, useEffect, useRef } from 'react'

const EVENTS = [
  { nome: 'Luiz',     cidade: 'Fortaleza, CE',         cor: '#0284c7', tipo: 'plano',   plano: 'mensal' },
  { nome: 'João',     cidade: 'Goiânia, GO',           cor: '#16a34a', tipo: 'os' },
  { nome: 'Marcos',   cidade: 'Campinas, SP',           cor: '#7c3aed', tipo: 'pdf' },
  { nome: 'Alan',     cidade: 'Belo Horizonte, MG',    cor: '#be185d', tipo: 'cliente' },
  { nome: 'Carlos',   cidade: 'São Paulo, SP',          cor: '#0891b2', tipo: 'plano',   plano: 'anual' },
  { nome: 'Eduardo',  cidade: 'Curitiba, PR',           cor: '#d97706', tipo: 'os' },
  { nome: 'Fábio',    cidade: 'Recife, PE',             cor: '#dc2626', tipo: 'pdf' },
  { nome: 'Bruno',    cidade: 'Brasília, DF',           cor: '#9333ea', tipo: 'cliente' },
  { nome: 'Anderson', cidade: 'Manaus, AM',             cor: '#0369a1', tipo: 'plano',   plano: 'mensal' },
  { nome: 'Rogério',  cidade: 'Porto Alegre, RS',       cor: '#15803d', tipo: 'os' },
  { nome: 'Thiago',   cidade: 'Florianópolis, SC',      cor: '#b45309', tipo: 'pdf' },
  { nome: 'Paulo',    cidade: 'Salvador, BA',           cor: '#be185d', tipo: 'cliente' },
  { nome: 'Diego',    cidade: 'Natal, RN',              cor: '#0284c7', tipo: 'plano',   plano: 'anual' },
  { nome: 'Lucas',    cidade: 'Belém, PA',              cor: '#7c3aed', tipo: 'os' },
  { nome: 'Rafael',   cidade: 'Maceió, AL',             cor: '#16a34a', tipo: 'pdf' },
  { nome: 'Júlio',    cidade: 'Vitória, ES',            cor: '#0891b2', tipo: 'cliente' },
  { nome: 'Gustavo',  cidade: 'Campo Grande, MS',       cor: '#d97706', tipo: 'plano',   plano: 'mensal' },
  { nome: 'Bruno',    cidade: 'João Pessoa, PB',        cor: '#dc2626', tipo: 'os' },
]

const TIPO_CONFIG = {
  plano: {
    label: 'Nova assinatura',
    labelColor: '#16a34a',
    dot: '#22c55e',
    icon: '🎉',
    msg: (e) => `começou o plano ${e.plano} no ClimaPro`,
  },
  os: {
    label: 'Ordem de serviço',
    labelColor: '#0284c7',
    dot: '#38bdf8',
    icon: '📋',
    msg: () => 'acabou de criar uma ordem de serviço',
  },
  pdf: {
    label: 'PDF enviado',
    labelColor: '#7c3aed',
    dot: '#a78bfa',
    icon: '📄',
    msg: () => 'enviou uma OS em PDF para o cliente',
  },
  cliente: {
    label: 'Novo cliente',
    labelColor: '#d97706',
    dot: '#fbbf24',
    icon: '👤',
    msg: () => 'cadastrou o primeiro cliente no ClimaPro',
  },
}

const SHOW_MS       = 5000
const INTERVAL_MIN  = 9000
const INTERVAL_MAX  = 15000
const INITIAL_DELAY = 3500


export default function SocialProofToast() {
  const [visible,   setVisible]   = useState(false)
  const [current,   setCurrent]   = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const indexRef = useRef(Math.floor(Math.random() * EVENTS.length))
  const timerRef = useRef(null)

  function next() {
    if (dismissed) return
    const ev = EVENTS[indexRef.current % EVENTS.length]
    indexRef.current += 1
    setCurrent(ev)
    setVisible(true)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      const delay = INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN)
      timerRef.current = setTimeout(next, delay)
    }, SHOW_MS)
  }

  useEffect(() => {
    timerRef.current = setTimeout(next, INITIAL_DELAY)
    return () => clearTimeout(timerRef.current)
  }, [])

  if (!current || dismissed) return null

  const cfg = TIPO_CONFIG[current.tipo]

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 16,
      zIndex: 9999,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(130%) scale(0.92)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.45s cubic-bezier(0.34,1.4,0.64,1), opacity 0.3s ease',
      maxWidth: 310,
      filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.14)) drop-shadow(0 2px 8px rgba(0,0,0,0.08))',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        padding: '11px 13px 11px 11px',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        border: '1.5px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Barra lateral colorida por tipo */}
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 4,
          background: `linear-gradient(180deg, ${cfg.dot}, ${cfg.labelColor})`,
          borderRadius: '18px 0 0 18px',
        }} />

        {/* Avatar com badge de check */}
        <div style={{ position: 'relative', flexShrink: 0, marginLeft: 4 }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: '50%',
            background: current.cor,
            border: '2px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 15, color: 'white', letterSpacing: 0.5,
          }}>
            {current.nome.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{
            position: 'absolute',
            bottom: -1, right: -1,
            width: 17, height: 17,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Label do tipo de evento */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: cfg.dot,
              display: 'inline-block',
              boxShadow: `0 0 0 2px ${cfg.dot}44`,
            }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: cfg.labelColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>
            {current.nome}
            <span style={{ fontWeight: 400, color: '#64748b' }}>, de {current.cidade},</span>
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#334155', lineHeight: 1.35 }}>
            {cfg.msg(current)}
          </p>
        </div>

        {/* Botão fechar */}
        <button
          onClick={() => { setVisible(false); setDismissed(true); clearTimeout(timerRef.current) }}
          style={{
            background: '#f1f5f9', border: 'none', cursor: 'pointer',
            width: 20, height: 20, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, alignSelf: 'flex-start', padding: 0,
            color: '#94a3b8',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
