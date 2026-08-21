import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatOS, formatBRL, formatDateWeekday, resumoPagamento } from '../lib/format'
import { gerarLinkCobranca } from '../lib/whatsapp'
import { useToast } from '../hooks/useToast'

const FORMAS_PAGAMENTO = [
  { value: 'pix',            label: 'Pix' },
  { value: 'dinheiro',       label: 'Dinheiro / Espécie' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito',  label: 'Cartão de Débito' },
  { value: 'outros',         label: 'Outros' },
]

const hojeISO = () => new Date().toISOString().split('T')[0]

// Card de uma OS com saldo pendente — usado no card "A receber hoje" do
// Início, na lista de vencidos do Relatório e nos filtros "A receber"/"Em
// atraso" de Ordens (OrdensList.jsx). Reúne as duas ações que fecham o
// ciclo da cobrança: mandar lembrete pelo WhatsApp com um clique, e marcar
// o saldo como recebido (com data e forma de pagamento) quando o cliente
// pagar.
export default function CobrancaPendenteCard({ os, onAtualizado }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [data, setData] = useState(hojeISO)
  const [forma, setForma] = useState('')
  const [marcando, setMarcando] = useState(false)
  const toast = useToast()
  const pag = resumoPagamento(os)

  async function marcarRecebido() {
    if (!forma) return
    setMarcando(true)
    const novosPagamentos = [...pag.pagamentos, { forma, valor: pag.saldo, data }]
    const { error } = await supabase
      .from('ordens_servico')
      .update({ pagamentos: novosPagamentos, data_pagamento_pendente: null })
      .eq('id', os.id)
    setMarcando(false)
    if (error) {
      toast('Erro ao atualizar. Tente novamente.', 'error')
      return
    }
    toast('Saldo marcado como recebido!')
    onAtualizado?.(os.id)
  }

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0">
          <span className="text-xs text-gray-400 font-mono">{formatOS(os.numero)}</span>
          <p className="font-semibold text-gray-800 truncate">{os.clientes?.nome}</p>
          <p className="text-sm text-gray-500 truncate">{os.tipo_servico}</p>
          {os.data_pagamento_pendente && (
            <p className="text-xs text-gray-400 mt-0.5">Vencimento {formatDateWeekday(os.data_pagamento_pendente)}</p>
          )}
        </div>
        <p className="font-bold text-amber-600 flex-shrink-0 ml-2 whitespace-nowrap">{formatBRL(pag.saldo)}</p>
      </div>
      <div className="flex gap-2">
        <a
          href={gerarLinkCobranca({ cliente: os.clientes, ordem: os, saldo: pag.saldo })}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-green-500 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.15h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 012.41 5.83c0 4.55-3.7 8.24-8.24 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29z" />
          </svg>
          Cobrar
        </a>
        <button
          onClick={() => setMostrarForm(v => !v)}
          className={`flex-1 text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-all ${
            mostrarForm ? 'ac-bg-lt ac-text' : 'bg-gray-100 text-gray-700'
          }`}
        >
          ✓ Recebido
        </button>
      </div>

      {mostrarForm && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Data do pagamento</label>
            <input
              type="date"
              value={data}
              max={hojeISO()}
              onChange={e => setData(e.target.value)}
              className="input-field !py-2.5 !text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Forma de pagamento</label>
            <select
              value={forma}
              onChange={e => setForma(e.target.value)}
              className="input-field !py-2.5 !text-sm"
            >
              <option value="">Selecione...</option>
              {FORMAS_PAGAMENTO.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={() => setMostrarForm(false)}
              disabled={marcando}
              className="flex-1 bg-gray-100 text-gray-700 text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={marcarRecebido}
              disabled={!forma || marcando}
              className="flex-1 bg-emerald-500 text-white text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60"
            >
              {marcando ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
