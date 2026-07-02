import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

function gerarCodigo(nome) {
  const base = nome.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)
  const sufixo = Math.floor(1000 + Math.random() * 9000)
  return `${base}${sufixo}`
}

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Afiliados() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { toast } = useToast()

  const [afiliado, setAfiliado] = useState(null)
  const [comissoes, setComissoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [chavePix, setChavePix] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const link = afiliado ? `${window.location.origin}/?ref=${afiliado.codigo}` : ''

  const saldoPendente = comissoes.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0)
  const totalPago = comissoes.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0)
  const indicadosUnicos = [...new Set(comissoes.map(c => c.indicado_user_id).filter(Boolean))].length

  useEffect(() => {
    carregarAfiliado()
  }, [])

  async function carregarAfiliado() {
    setLoading(true)
    try {
      let { data } = await supabase.from('afiliados').select('*').eq('user_id', profile.id).single()

      if (!data) {
        const codigo = gerarCodigo(profile.nome || 'USER')
        const { data: novo, error } = await supabase
          .from('afiliados')
          .insert({ user_id: profile.id, codigo })
          .select()
          .single()
        if (error) throw error
        data = novo
      }

      setAfiliado(data)
      setChavePix(data.chave_pix || '')

      const { data: comissoesData } = await supabase
        .from('comissoes')
        .select('*')
        .eq('afiliado_id', data.id)
        .order('created_at', { ascending: false })

      setComissoes(comissoesData || [])
    } catch (e) {
      toast('Erro ao carregar dados', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function salvarPix() {
    if (!chavePix.trim()) { toast('Informe sua chave Pix', 'error'); return }
    setSalvando(true)
    const { error } = await supabase
      .from('afiliados')
      .update({ chave_pix: chavePix.trim() })
      .eq('id', afiliado.id)
    setSalvando(false)
    if (error) { toast('Erro ao salvar', 'error'); return }
    setAfiliado(a => ({ ...a, chave_pix: chavePix.trim() }))
    toast('Chave Pix salva!')
  }

  async function solicitarSaque() {
    if (!afiliado.chave_pix) { toast('Cadastre sua chave Pix primeiro', 'error'); return }
    if (saldoPendente <= 0) { toast('Sem saldo para sacar', 'error'); return }
    const { error } = await supabase
      .from('afiliados')
      .update({ saque_pendente: true })
      .eq('id', afiliado.id)
    if (error) { toast('Erro ao solicitar saque', 'error'); return }
    setAfiliado(a => ({ ...a, saque_pendente: true }))
    toast('Saque solicitado! Processamos em até 48h.')
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <span className="w-7 h-7 border-[3px] border-gray-200 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Indique e Ganhe</h1>
          <p className="text-xs text-gray-400">20% de comissão por indicado ativo</p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center py-3">
            <p className="text-xl font-bold text-gray-800">{indicadosUnicos}</p>
            <p className="text-xs text-gray-400 mt-0.5">Indicados</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-xl font-bold text-green-600">{formatBRL(saldoPendente)}</p>
            <p className="text-xs text-gray-400 mt-0.5">A receber</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-xl font-bold text-gray-400">{formatBRL(totalPago)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Pago</p>
          </div>
        </div>

        {/* Link de indicação */}
        <div className="card space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Seu link de indicação</h2>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <p className="text-sm text-gray-600 flex-1 truncate">{link}</p>
          </div>
          <button
            onClick={copiarLink}
            className="w-full btn-primary"
          >
            {copiado ? '✓ Link copiado!' : 'Copiar link'}
          </button>
          {typeof navigator.share === 'function' && (
            <button
              onClick={() => navigator.share({ title: 'ClimaPro', url: link })}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 active:bg-gray-50"
            >
              Compartilhar
            </button>
          )}
          <p className="text-xs text-gray-400 text-center">
            Código: <span className="font-mono font-bold text-gray-600">{afiliado.codigo}</span>
          </p>
        </div>

        {/* Saque */}
        <div className="card space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recebimento via Pix</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix</label>
            <input
              type="text"
              value={chavePix}
              onChange={e => setChavePix(e.target.value)}
              placeholder="CPF, email, telefone ou chave aleatória"
              className="input"
            />
          </div>
          <button onClick={salvarPix} disabled={salvando} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 active:bg-gray-50">
            {salvando ? 'Salvando...' : 'Salvar chave Pix'}
          </button>
          {saldoPendente > 0 && (
            <button
              onClick={solicitarSaque}
              disabled={afiliado.saque_pendente}
              className="w-full btn-primary"
            >
              {afiliado.saque_pendente
                ? 'Saque solicitado — processando em até 48h'
                : `Solicitar saque de ${formatBRL(saldoPendente)}`}
            </button>
          )}
        </div>

        {/* Histórico de comissões */}
        {comissoes.length > 0 && (
          <div className="card">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Histórico</h2>
            <div className="space-y-2">
              {comissoes.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{c.periodo_ref}</p>
                    <p className="text-xs text-gray-400">Ref: {c.payment_ref.slice(0, 16)}…</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${c.status === 'pago' ? 'text-gray-400' : 'text-green-600'}`}>
                      {formatBRL(c.valor)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'pago' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'}`}>
                      {c.status === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {comissoes.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-3xl mb-2">🔗</p>
            <p className="text-sm font-medium text-gray-600">Nenhuma comissão ainda</p>
            <p className="text-xs text-gray-400 mt-1">Compartilhe seu link e comece a ganhar</p>
          </div>
        )}

        {/* Como funciona */}
        <div className="card space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Como funciona</h2>
          {[
            ['1', 'Compartilhe seu link com outros técnicos de ar condicionado'],
            ['2', 'Eles se cadastram e assinam o ClimaPro pelo seu link'],
            ['3', 'Você recebe 20% todo mês que eles continuarem assinantes'],
            ['4', 'Solicite o saque quando quiser — pagamos em até 48h via Pix'],
          ].map(([n, texto]) => (
            <div key={n} className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full ac-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{n}</span>
              <p className="text-sm text-gray-600">{texto}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
