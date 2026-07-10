import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

function formatBRL(valor) {
  if (valor === null || valor === undefined) return '—'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Truncado({ valor, largura = 140 }) {
  if (!valor) return <span className="text-gray-300">—</span>
  return (
    <span className="font-mono text-xs text-gray-600 block truncate" style={{ maxWidth: largura }} title={valor}>
      {valor}
    </span>
  )
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-xs text-gray-300">—</span>
  const ok = status === 'success'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
      {ok ? '✓ sucesso' : '✗ erro'}
    </span>
  )
}

export default function AdminTrackingDebug() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [reenviando, setReenviando] = useState(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-tracking', {
        body: { action: 'list' },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      setUsers(data?.users ?? [])
    } catch (e) {
      toast(e.message || 'Erro ao carregar dados de rastreamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function reenviarPurchase(paymentId) {
    setReenviando(paymentId)
    try {
      const { data, error } = await supabase.functions.invoke('admin-tracking', {
        body: { action: 'resend', payment_id: paymentId },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      const utmifyOk = data?.utmify?.success
      const metaOk = data?.metaCapi?.success
      if (utmifyOk && metaOk) toast('Reenviado com sucesso para Utmify e Meta CAPI!')
      else toast(`Utmify: ${utmifyOk ? 'ok' : 'falhou'} · Meta CAPI: ${metaOk ? 'ok' : 'falhou'}`, utmifyOk && metaOk ? 'success' : 'error')

      await carregar()
    } catch (e) {
      toast(e.message || 'Erro ao reenviar', 'error')
    } finally {
      setReenviando(null)
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return users
    return users.filter(u =>
      u.nome?.toLowerCase().includes(termo) || u.email?.toLowerCase().includes(termo)
    )
  }, [busca, users])

  if (!isAdmin) return <Navigate to="/" />

  return (
    <div className="page-container">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Tracking Debug</h1>
          <p className="text-xs text-gray-400">Auditoria de fbclid/UTMs, Utmify e Meta CAPI por usuário</p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="input"
        />

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="card h-16 animate-pulse bg-gray-100" />)}
          </div>
        )}

        {!loading && usuariosFiltrados.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-sm font-medium text-gray-600">Nenhum usuário encontrado</p>
          </div>
        )}

        {!loading && usuariosFiltrados.length > 0 && (
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wide">
                  <th className="p-2.5 whitespace-nowrap">Nome</th>
                  <th className="p-2.5 whitespace-nowrap">E-mail</th>
                  <th className="p-2.5 whitespace-nowrap">Cadastro</th>
                  <th className="p-2.5 whitespace-nowrap">fbclid</th>
                  <th className="p-2.5 whitespace-nowrap">fbc</th>
                  <th className="p-2.5 whitespace-nowrap">fbp</th>
                  <th className="p-2.5 whitespace-nowrap">utm_source</th>
                  <th className="p-2.5 whitespace-nowrap">utm_medium</th>
                  <th className="p-2.5 whitespace-nowrap">utm_campaign</th>
                  <th className="p-2.5 whitespace-nowrap">utm_content</th>
                  <th className="p-2.5 whitespace-nowrap">utm_term</th>
                  <th className="p-2.5 whitespace-nowrap">URL de entrada</th>
                  <th className="p-2.5 whitespace-nowrap">Referrer</th>
                  <th className="p-2.5 whitespace-nowrap">Data da compra</th>
                  <th className="p-2.5 whitespace-nowrap">Payment ID (MP)</th>
                  <th className="p-2.5 whitespace-nowrap">ID enviado à Utmify</th>
                  <th className="p-2.5 whitespace-nowrap">Status Utmify</th>
                  <th className="p-2.5 whitespace-nowrap">Status Meta CAPI</th>
                  <th className="p-2.5 whitespace-nowrap">Event ID</th>
                  <th className="p-2.5 whitespace-nowrap">Valor</th>
                  <th className="p-2.5 whitespace-nowrap">Ação</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(u => {
                  const compra = u.purchase
                  const temFalha = compra && (compra.utmify_status !== 'success' || compra.meta_capi_status !== 'success')
                  return (
                    <tr key={u.id} className="border-t border-gray-50 align-top">
                      <td className="p-2.5 whitespace-nowrap font-medium text-gray-700">{u.nome || '—'}</td>
                      <td className="p-2.5 whitespace-nowrap text-gray-600">{u.email}</td>
                      <td className="p-2.5 whitespace-nowrap text-gray-500">{formatData(u.created_at)}</td>
                      <td className="p-2.5"><Truncado valor={u.fbclid} /></td>
                      <td className="p-2.5"><Truncado valor={u.fbc} /></td>
                      <td className="p-2.5"><Truncado valor={u.fbp} /></td>
                      <td className="p-2.5 whitespace-nowrap text-gray-600">{u.utm_source || '—'}</td>
                      <td className="p-2.5 whitespace-nowrap text-gray-600">{u.utm_medium || '—'}</td>
                      <td className="p-2.5 whitespace-nowrap text-gray-600">{u.utm_campaign || '—'}</td>
                      <td className="p-2.5 whitespace-nowrap text-gray-600">{u.utm_content || '—'}</td>
                      <td className="p-2.5 whitespace-nowrap text-gray-600">{u.utm_term || '—'}</td>
                      <td className="p-2.5"><Truncado valor={u.entry_url} largura={180} /></td>
                      <td className="p-2.5"><Truncado valor={u.referrer} largura={180} /></td>
                      <td className="p-2.5 whitespace-nowrap text-gray-500">{formatData(compra?.purchased_at)}</td>
                      <td className="p-2.5"><Truncado valor={compra?.payment_id} /></td>
                      <td className="p-2.5"><Truncado valor={compra?.utmify_order_id} /></td>
                      <td className="p-2.5"><StatusBadge status={compra?.utmify_status} /></td>
                      <td className="p-2.5"><StatusBadge status={compra?.meta_capi_status} /></td>
                      <td className="p-2.5"><Truncado valor={compra?.event_id} /></td>
                      <td className="p-2.5 whitespace-nowrap text-gray-700 font-semibold">{formatBRL(compra?.value)}</td>
                      <td className="p-2.5 whitespace-nowrap">
                        {compra && (
                          <button
                            onClick={() => reenviarPurchase(compra.payment_id)}
                            disabled={reenviando === compra.payment_id}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 ${
                              temFalha ? 'bg-red-500 text-white' : 'border border-gray-200 text-gray-600'
                            }`}
                          >
                            {reenviando === compra.payment_id ? 'Reenviando...' : 'Reenviar Purchase'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
