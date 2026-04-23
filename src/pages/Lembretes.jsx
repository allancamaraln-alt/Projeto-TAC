import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatBRL } from '../lib/format'

function diasParaData(dataIso) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [y, m, d] = dataIso.split('-').map(Number)
  return Math.round((new Date(y, m - 1, d) - hoje) / 86400000)
}

function labelDias(dias) {
  if (dias < 0)  return { texto: `${Math.abs(dias)}d em atraso`, cor: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100' }
  if (dias === 0) return { texto: 'Vence hoje',                  cor: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' }
  if (dias <= 7)  return { texto: `em ${dias} dias`,             cor: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' }
  return              { texto: `em ${dias} dias`,             cor: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-100' }
}

export default function Lembretes() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [lembretes, setLembretes] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setErro('')
    const { data, error } = await supabase
      .from('lembretes_manutencao')
      .select('*, clientes(nome, telefone)')
      .eq('status', 'pendente')
      .order('data_prevista', { ascending: true })
    if (error) setErro('Não foi possível carregar os lembretes. Verifique sua conexão.')
    else setLembretes(data ?? [])
    setLoading(false)
  }

  async function dispensar(id) {
    const { error } = await supabase.from('lembretes_manutencao').update({ status: 'dispensado' }).eq('id', id)
    if (!error) setLembretes(prev => prev.filter(l => l.id !== id))
  }

  function abrirWhatsApp(lembrete) {
    const telefone = (lembrete.clientes?.telefone || '').replace(/\D/g, '')
    const ddi = telefone.startsWith('55') ? telefone : `55${telefone}`
    const msg = encodeURIComponent(
      `Olá ${lembrete.clientes?.nome}! 👋\n\n` +
      `Já faz ${lembrete.intervalo_meses} ${lembrete.intervalo_meses === 1 ? 'mês' : 'meses'} desde o último serviço de *${lembrete.tipo_servico}* realizado em seu equipamento.\n\n` +
      `Que tal agendarmos uma revisão preventiva para garantir o bom funcionamento? 😊\n\n` +
      `-- ${profile?.nome || 'Técnico'}${profile?.empresa ? ` | ${profile.empresa}` : ''}`
    )
    window.open(`https://wa.me/${ddi}?text=${msg}`, '_blank')
  }

  const vencidos  = lembretes.filter(l => diasParaData(l.data_prevista) < 0)
  const proximos  = lembretes.filter(l => diasParaData(l.data_prevista) >= 0)

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">Revisões Preventivas</h1>
          <p className="text-xs text-gray-400">{lembretes.length} pendente{lembretes.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6 pb-24">
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        )}

        {!loading && erro && (
          <div className="card text-center py-10">
            <p className="text-3xl mb-3">⚠️</p>
            <p className="font-semibold text-gray-600">{erro}</p>
            <button onClick={carregar} className="mt-4 ac-text font-medium text-sm">Tentar novamente</button>
          </div>
        )}

        {!loading && !erro && lembretes.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-semibold text-gray-600">Nenhum lembrete pendente!</p>
            <p className="text-sm text-gray-400 mt-1">Os lembretes aparecem aqui quando chegarem.</p>
          </div>
        )}

        {vencidos.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Em atraso</h2>
            <div className="space-y-3">
              {vencidos.map(l => <CartaoLembrete key={l.id} lembrete={l} onWhatsApp={abrirWhatsApp} onDispensar={dispensar} onCliente={() => navigate(`/clientes/${l.cliente_id}`)} />)}
            </div>
          </section>
        )}

        {proximos.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Próximos</h2>
            <div className="space-y-3">
              {proximos.map(l => <CartaoLembrete key={l.id} lembrete={l} onWhatsApp={abrirWhatsApp} onDispensar={dispensar} onCliente={() => navigate(`/clientes/${l.cliente_id}`)} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function CartaoLembrete({ lembrete, onWhatsApp, onDispensar, onCliente }) {
  const dias = diasParaData(lembrete.data_prevista)
  const { texto, cor, bg, border } = labelDias(dias)
  const dataFormatada = new Date(lembrete.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')

  return (
    <div className={`${bg} border ${border} rounded-2xl p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <button onClick={onCliente} className="font-bold text-gray-800 text-left hover:underline">
            {lembrete.clientes?.nome}
          </button>
          <p className="text-sm text-gray-500 mt-0.5">{lembrete.tipo_servico} · a cada {lembrete.intervalo_meses}m</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-bold ${cor}`}>{texto}</p>
          <p className="text-xs text-gray-400 mt-0.5">{dataFormatada}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onWhatsApp(lembrete)}
          className="flex-1 bg-green-500 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </button>
        <button
          onClick={() => onCliente()}
          className="px-4 bg-white border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-all"
        >
          Ver cliente
        </button>
        <button
          onClick={() => onDispensar(lembrete.id)}
          className="px-3 bg-white border border-gray-200 text-gray-400 py-2.5 rounded-xl active:scale-95 transition-all"
          title="Dispensar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
