import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { fetchTrackingList, resendPurchase } from '../lib/analytics'
import { formatBRL, formatDateTime } from '../lib/format'
import FilterBar, { periodoParaDatas } from '../components/admin/FilterBar'
import DataTable from '../components/admin/DataTable'

const PAGE_SIZE = 30

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
  const cor = status === 'success' ? 'bg-green-50 text-green-600' : status === 'partial' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
  const label = status === 'success' ? '✓ sucesso' : status === 'partial' ? '~ parcial' : '✗ erro'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cor}`}>{label}</span>
}

export default function AdminTrackingDebug() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [reenviando, setReenviando] = useState(null)

  const [periodo, setPeriodo] = useState('tudo')
  const [plano, setPlano] = useState(null)
  const [status, setStatus] = useState(null)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    carregar(1)
  }, [periodo, plano, status, busca])

  async function carregar(paginaAlvo = page) {
    setLoading(true)
    try {
      const { desde, ate } = periodoParaDatas(periodo)
      const data = await fetchTrackingList({
        page: paginaAlvo,
        pageSize: PAGE_SIZE,
        filters: { desde, ate, plano, status, busca: busca.trim() || undefined },
      })
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
      setPage(paginaAlvo)
    } catch (e) {
      toast(e.message || 'Erro ao carregar dados de rastreamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function reenviarPurchase(paymentId) {
    setReenviando(paymentId)
    try {
      const data = await resendPurchase(paymentId)
      const utmifyOk = data?.utmify?.success
      const metaOk = data?.metaCapi?.success
      if (utmifyOk && metaOk) toast('Reenviado com sucesso para Utmify e Meta CAPI!')
      else toast(`Utmify: ${utmifyOk ? 'ok' : 'falhou'} · Meta CAPI: ${metaOk ? 'ok' : 'falhou'}`, utmifyOk && metaOk ? 'success' : 'error')
      await carregar(page)
    } catch (e) {
      toast(e.message || 'Erro ao reenviar', 'error')
    } finally {
      setReenviando(null)
    }
  }

  if (!isAdmin) return <Navigate to="/" />

  const columns = [
    { key: 'nome', label: 'Nome', render: (u) => <span className="font-medium text-gray-700">{u.nome || '—'}</span> },
    { key: 'email', label: 'E-mail' },
    { key: 'created_at', label: 'Cadastro', render: (u) => formatDateTime(u.created_at) },
    { key: 'fbclid', label: 'fbclid', render: (u) => <Truncado valor={u.fbclid} /> },
    { key: 'fbc', label: 'fbc', render: (u) => <Truncado valor={u.fbc} /> },
    { key: 'fbp', label: 'fbp', render: (u) => <Truncado valor={u.fbp} /> },
    { key: 'utm_source', label: 'utm_source' },
    { key: 'utm_medium', label: 'utm_medium' },
    { key: 'utm_campaign', label: 'utm_campaign' },
    { key: 'utm_content', label: 'utm_content' },
    { key: 'utm_term', label: 'utm_term' },
    { key: 'entry_url', label: 'URL de entrada', render: (u) => <Truncado valor={u.entry_url} largura={180} /> },
    { key: 'referrer', label: 'Referrer', render: (u) => <Truncado valor={u.referrer} largura={180} /> },
    { key: 'purchased_at', label: 'Data da compra', render: (u) => formatDateTime(u.purchase?.purchased_at) },
    { key: 'payment_id', label: 'Payment ID (MP)', render: (u) => <Truncado valor={u.purchase?.payment_id} /> },
    { key: 'utmify_order_id', label: 'ID enviado à Utmify', render: (u) => <Truncado valor={u.purchase?.utmify_order_id} /> },
    { key: 'utmify_status', label: 'Status Utmify', render: (u) => <StatusBadge status={u.purchase?.utmify_status} /> },
    { key: 'meta_capi_status', label: 'Status Meta CAPI', render: (u) => <StatusBadge status={u.purchase?.meta_capi_status} /> },
    { key: 'event_id', label: 'Event ID', render: (u) => <Truncado valor={u.purchase?.event_id} /> },
    { key: 'value', label: 'Valor', render: (u) => <span className="font-semibold text-gray-700">{formatBRL(u.purchase?.value)}</span> },
    {
      key: 'acoes',
      label: 'Ação',
      render: (u) => {
        const compra = u.purchase
        if (!compra) return null
        const temFalha = compra.utmify_status !== 'success' || compra.meta_capi_status !== 'success'
        return (
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); reenviarPurchase(compra.payment_id) }}
              disabled={reenviando === compra.payment_id}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 ${temFalha ? 'bg-red-500 text-white' : 'border border-gray-200 text-gray-600'}`}
            >
              {reenviando === compra.payment_id ? 'Reenviando...' : 'Reenviar Purchase'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/admin/purchase/${compra.payment_id}`) }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600"
            >
              Ver detalhes
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="page-container">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">Tracking Debug</h1>
          <p className="text-xs text-gray-400">Auditoria de fbclid/UTMs, Utmify e Meta CAPI por usuário</p>
        </div>
        <button onClick={() => navigate('/admin/analytics')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-semibold">
          Ver Analytics →
        </button>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        <FilterBar
          periodo={periodo} onPeriodoChange={setPeriodo}
          plano={plano} onPlanoChange={setPlano}
          status={status} onStatusChange={setStatus}
          busca={busca} onBuscaChange={setBusca}
        />

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="card h-16 animate-pulse bg-gray-100" />)}
          </div>
        )}

        {!loading && (
          <DataTable
            columns={columns}
            rows={users}
            onRowClick={(u) => u.purchase && navigate(`/admin/purchase/${u.purchase.payment_id}`)}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={carregar}
          />
        )}
      </div>
    </div>
  )
}
