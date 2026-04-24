import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

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

const INTERVALOS = [
  { meses: 3,  label: '3 meses' },
  { meses: 6,  label: '6 meses' },
  { meses: 9,  label: '9 meses' },
  { meses: 12, label: '1 ano'   },
]

export default function Lembretes() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
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

  async function salvarEdicao(id, campos) {
    const { error } = await supabase.from('lembretes_manutencao').update(campos).eq('id', id)
    if (error) { toast('Erro ao salvar.', 'error'); return false }
    setLembretes(prev => prev.map(l => l.id === id ? { ...l, ...campos } : l))
    toast('Lembrete atualizado!')
    return true
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

  const vencidos   = lembretes.filter(l => diasParaData(l.data_prevista) < 0)
  const proximos   = lembretes.filter(l => { const d = diasParaData(l.data_prevista); return d >= 0 && d <= 30 })
  const agendados  = lembretes.filter(l => diasParaData(l.data_prevista) > 30)

  return (
    <div className="page-container">
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
              {vencidos.map(l => <CartaoLembrete key={l.id} lembrete={l} onWhatsApp={abrirWhatsApp} onDispensar={dispensar} onEditar={salvarEdicao} onCliente={() => navigate(`/clientes/${l.cliente_id}`)} />)}
            </div>
          </section>
        )}

        {proximos.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3">Vencendo em breve</h2>
            <div className="space-y-3">
              {proximos.map(l => <CartaoLembrete key={l.id} lembrete={l} onWhatsApp={abrirWhatsApp} onDispensar={dispensar} onEditar={salvarEdicao} onCliente={() => navigate(`/clientes/${l.cliente_id}`)} />)}
            </div>
          </section>
        )}

        {agendados.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Agendados</h2>
            <div className="space-y-3">
              {agendados.map(l => <CartaoLembrete key={l.id} lembrete={l} onWhatsApp={abrirWhatsApp} onDispensar={dispensar} onEditar={salvarEdicao} onCliente={() => navigate(`/clientes/${l.cliente_id}`)} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function CartaoLembrete({ lembrete, onWhatsApp, onDispensar, onEditar, onCliente }) {
  const dias = diasParaData(lembrete.data_prevista)
  const { texto, cor, bg, border } = labelDias(dias)
  const dataFormatada = new Date(lembrete.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')

  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [tipoServico, setTipoServico] = useState(lembrete.tipo_servico)
  const [dataPrevista, setDataPrevista] = useState(lembrete.data_prevista)
  const [intervaloMeses, setIntervaloMeses] = useState(lembrete.intervalo_meses)

  async function salvar() {
    setSalvando(true)
    const ok = await onEditar(lembrete.id, {
      tipo_servico: tipoServico,
      data_prevista: dataPrevista,
      intervalo_meses: intervaloMeses,
    })
    setSalvando(false)
    if (ok) setEditando(false)
  }

  function cancelar() {
    setTipoServico(lembrete.tipo_servico)
    setDataPrevista(lembrete.data_prevista)
    setIntervaloMeses(lembrete.intervalo_meses)
    setEditando(false)
  }

  return (
    <div className={`${bg} border ${border} rounded-2xl p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <button onClick={onCliente} className="font-bold text-gray-800 text-left hover:underline">
            {lembrete.clientes?.nome}
          </button>
          <p className="text-sm text-gray-500 mt-0.5">{lembrete.tipo_servico} · a cada {lembrete.intervalo_meses}m</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="text-right mr-1">
            <p className={`text-sm font-bold ${cor}`}>{texto}</p>
            <p className="text-xs text-gray-400 mt-0.5">{dataFormatada}</p>
          </div>
          <button
            onClick={() => setEditando(e => !e)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 active:scale-95 transition-all"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
            </svg>
          </button>
        </div>
      </div>

      {editando && (
        <div className="bg-white rounded-xl p-3 space-y-3 border border-gray-100">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Tipo de serviço</label>
            <input
              type="text"
              value={tipoServico}
              onChange={e => setTipoServico(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-sky-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Data prevista</label>
            <input
              type="date"
              value={dataPrevista}
              onChange={e => setDataPrevista(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-sky-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Intervalo</label>
            <div className="grid grid-cols-4 gap-2">
              {INTERVALOS.map(({ meses, label }) => (
                <button
                  key={meses}
                  onClick={() => setIntervaloMeses(meses)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    intervaloMeses === meses
                      ? 'bg-sky-500 text-white shadow-sm scale-105'
                      : 'bg-gray-100 text-gray-600 active:scale-95'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex-1 bg-sky-500 text-white text-sm font-bold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={cancelar}
              className="px-4 bg-gray-100 text-gray-600 text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
