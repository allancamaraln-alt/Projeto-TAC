import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/format'

const ICONS = {
  chegada: '🚗',
  diagnostico: '🔍',
  peca_trocada: '🔧',
  pagamento: '💰',
  garantia: '🛡️',
  observacao: '📝',
  conclusao: '✅',
  outro: '•',
}

// Linha do tempo estruturada do Modo Atendimento IA — só exibição/auditoria,
// os dados reais (financeiro/OS/laudo) já foram gravados pelas ferramentas
// de domínio quando o evento foi registrado (ver src/hooks/useAtendimento.js).
export default function AtendimentoTimeline({ conversationId, refreshKey }) {
  const [eventos, setEventos] = useState([])

  useEffect(() => {
    if (!conversationId) return
    supabase
      .from('atendimento_eventos')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setEventos(data || []))
  }, [conversationId, refreshKey])

  if (!eventos.length) {
    return (
      <p className="text-center text-sm text-gray-400 pt-10">
        Nenhum evento registrado ainda nesta sessão.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {eventos.map(ev => (
        <div key={ev.id} className="flex items-start gap-2.5 bg-white rounded-xl border border-gray-100 px-3.5 py-2.5">
          <span className="text-base leading-none mt-0.5">{ICONS[ev.tipo] || '•'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700">{ev.descricao}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{formatDateTime(ev.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
