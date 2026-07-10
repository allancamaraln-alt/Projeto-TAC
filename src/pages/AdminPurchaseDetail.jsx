import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { fetchPurchaseDetail, resendPurchase } from '../lib/analytics'
import { formatBRL, formatDateTime } from '../lib/format'
import PurchaseTimeline from '../components/admin/PurchaseTimeline'

function Secao({ titulo, children }) {
  return (
    <div className="card space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{titulo}</h2>
      {children}
    </div>
  )
}

function Campo({ label, valor, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-sm text-gray-700 text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{valor || '—'}</span>
    </div>
  )
}

function JsonBox({ titulo, json }) {
  let formatado = json
  try { formatado = JSON.stringify(JSON.parse(json), null, 2) } catch { /* já é texto simples ou vazio */ }
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{titulo}</p>
      <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
        {formatado || '— não registrado —'}
      </pre>
    </div>
  )
}

export default function AdminPurchaseDetail() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const paymentId = window.location.pathname.split('/admin/purchase/')[1]

  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reenviando, setReenviando] = useState(false)

  useEffect(() => {
    carregar()
  }, [paymentId])

  async function carregar() {
    setLoading(true)
    try {
      const data = await fetchPurchaseDetail(paymentId)
      setDados(data)
    } catch (e) {
      toast(e.message || 'Erro ao carregar detalhes da compra', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function reenviar() {
    setReenviando(true)
    try {
      const res = await resendPurchase(paymentId)
      const ok = res?.utmify?.success && res?.metaCapi?.success
      toast(ok ? 'Reenviado com sucesso!' : 'Reenviado, mas algum envio ainda falhou — confira os status abaixo.', ok ? 'success' : 'error')
      await carregar()
    } catch (e) {
      toast(e.message || 'Erro ao reenviar', 'error')
    } finally {
      setReenviando(false)
    }
  }

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
          <h1 className="text-lg font-bold text-gray-800">Detalhe da compra</h1>
          <p className="text-xs text-gray-400 font-mono">{paymentId}</p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
          </div>
        )}

        {!loading && !dados && (
          <div className="card text-center py-8">
            <p className="text-sm font-medium text-gray-600">Compra não encontrada</p>
          </div>
        )}

        {!loading && dados && (
          <>
            <button
              onClick={reenviar}
              disabled={reenviando}
              className="w-full btn-primary disabled:opacity-50"
            >
              {reenviando ? 'Reenviando...' : 'Reenviar Purchase (Utmify + Meta CAPI)'}
            </button>

            <Secao titulo="Pagamento (Mercado Pago)">
              <Campo label="Payment ID" valor={dados.log.payment_id} mono />
              <Campo label="Plano" valor={dados.log.plan} />
              <Campo label="Valor" valor={formatBRL(dados.log.value)} />
              <Campo label="Data da compra" valor={formatDateTime(dados.log.purchased_at)} />
              <Campo label="Pagamento criado" valor={formatDateTime(dados.log.payment_created_at)} />
              <Campo label="Tempo de processamento" valor={dados.log.processing_time_ms != null ? `${dados.log.processing_time_ms}ms` : '—'} />
              <Campo label="Status geral" valor={dados.log.processing_status} />
              {dados.log.error_message && <Campo label="Erro" valor={dados.log.error_message} />}
            </Secao>

            <Secao titulo="Tracking (origem da venda)">
              <Campo label="fbclid" valor={dados.profile?.fbclid} mono />
              <Campo label="fbc" valor={dados.profile?.fbc} mono />
              <Campo label="fbp" valor={dados.profile?.fbp} mono />
              <Campo label="utm_source" valor={dados.profile?.utm_source} />
              <Campo label="utm_medium" valor={dados.profile?.utm_medium} />
              <Campo label="utm_campaign" valor={dados.profile?.utm_campaign} />
              <Campo label="utm_content" valor={dados.profile?.utm_content} />
              <Campo label="utm_term" valor={dados.profile?.utm_term} />
              <Campo label="URL de entrada" valor={dados.profile?.entry_url} mono />
              <Campo label="Referrer" valor={dados.profile?.referrer} mono />
            </Secao>

            <Secao titulo="Meta Conversions API">
              <Campo label="Event ID" valor={dados.log.event_id} mono />
              <Campo label="Status" valor={dados.log.meta_capi_status} />
              <Campo label="HTTP status" valor={dados.log.meta_capi_http_status} />
              <Campo label="Enviado em" valor={formatDateTime(dados.log.meta_sent_at)} />
              <JsonBox titulo="Payload enviado" json={dados.log.meta_request_json} />
              <JsonBox titulo="Resposta da Meta" json={dados.log.meta_capi_response} />
            </Secao>

            <Secao titulo="Utmify">
              <Campo label="ID enviado" valor={dados.log.utmify_order_id} mono />
              <Campo label="Status" valor={dados.log.utmify_status} />
              <Campo label="HTTP status" valor={dados.log.utmify_http_status} />
              <Campo label="Enviado em" valor={formatDateTime(dados.log.utmify_sent_at)} />
              <JsonBox titulo="Payload enviado" json={dados.log.utmify_request_json} />
              <JsonBox titulo="Resposta da Utmify" json={dados.log.utmify_response} />
            </Secao>

            <Secao titulo="Reenvios">
              <Campo label="Nº de reenvios manuais" valor={dados.log.retry_count ?? 0} />
              <Campo label="Último reenvio" valor={formatDateTime(dados.log.last_retry_at)} />
            </Secao>

            <PurchaseTimeline etapas={dados.timeline} />
          </>
        )}
      </div>
    </div>
  )
}
