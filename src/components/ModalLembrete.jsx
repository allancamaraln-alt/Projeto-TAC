import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const OPCOES = [
  { meses: 3,  label: '3 meses' },
  { meses: 6,  label: '6 meses' },
  { meses: 9,  label: '9 meses' },
  { meses: 12, label: '1 ano'   },
]

function addMeses(meses) {
  const d = new Date()
  d.setMonth(d.getMonth() + meses)
  return d
}

export default function ModalLembrete({ os, onClose }) {
  const { profile } = useAuth()
  const [meses, setMeses] = useState(6)
  const [salvando, setSalvando] = useState(false)

  const dataPrevia = addMeses(meses)
  const dataLabel = dataPrevia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  async function salvar() {
    setSalvando(true)
    await supabase.from('lembretes_manutencao').insert({
      tecnico_id: profile.id,
      cliente_id: os.cliente_id,
      ordem_id: os.id,
      tipo_servico: os.tipo_servico,
      data_prevista: dataPrevia.toISOString().split('T')[0],
      intervalo_meses: meses,
    })
    setSalvando(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full rounded-t-3xl px-5 pt-5 pb-10 space-y-5">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-base">Programar revisão preventiva</h2>
            <p className="text-sm text-gray-400">{os.clientes?.nome} · {os.tipo_servico}</p>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Com que frequência este equipamento precisa de manutenção?
        </p>

        <div className="grid grid-cols-4 gap-2">
          {OPCOES.map(({ meses: m, label }) => (
            <button
              key={m}
              onClick={() => setMeses(m)}
              className={`py-3 rounded-2xl text-sm font-bold transition-all ${
                meses === m
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105'
                  : 'bg-gray-100 text-gray-600 active:scale-95'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 bg-orange-50 rounded-2xl px-4 py-3">
          <svg className="w-5 h-5 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-orange-700">
            Você receberá um lembrete em <strong>{dataLabel}</strong>
          </p>
        </div>

        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-60"
          style={{ boxShadow: '0 4px 16px rgba(249,115,22,0.35)' }}
        >
          {salvando ? 'Salvando...' : 'Programar revisão'}
        </button>

        <button onClick={onClose} className="w-full text-center text-sm text-gray-400 py-1">
          Agora não
        </button>
      </div>
    </div>
  )
}
