import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { carregarHistoricoPmoc, PERIODICIDADE_LABEL } from '../lib/pmoc'
import { formatDate } from '../lib/format'

const SITUACAO_LABEL = { ok: 'OK', nao_ok: 'Não OK', nao_aplicavel: 'N/A' }
const SITUACAO_COR = { ok: 'text-green-600', nao_ok: 'text-red-500', nao_aplicavel: 'text-gray-400' }

export default function PmocHistorico() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [execucoes, setExecucoes] = useState([])
  const [itensPorExecucao, setItensPorExecucao] = useState({})
  const [fotosPorItem, setFotosPorItem] = useState({})
  const [expandido, setExpandido] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarHistoricoPmoc(id).then(({ execucoes, itensPorExecucao, fotosPorItem }) => {
      setExecucoes(execucoes)
      setItensPorExecucao(itensPorExecucao)
      setFotosPorItem(fotosPorItem)
      setLoading(false)
    })
  }, [id])

  return (
    <div className="page-container">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(`/pmoc/${id}`)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800">Histórico de execuções</h1>
      </div>

      <div className="px-4 pt-4 space-y-3 pb-8">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}
          </div>
        )}

        {!loading && execucoes.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">Nenhuma execução registrada ainda.</p>
          </div>
        )}

        {execucoes.map(exec => {
          const itens = itensPorExecucao[exec.id] ?? []
          const nOk = itens.filter(i => i.situacao === 'ok').length
          const nNaoOk = itens.filter(i => i.situacao === 'nao_ok').length
          const aberto = expandido === exec.id

          return (
            <div key={exec.id} className="card">
              <button onClick={() => setExpandido(aberto ? null : exec.id)} className="w-full text-left flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800">{formatDate(exec.data)}</p>
                  <p className="text-xs text-gray-500">
                    {nOk} OK{nNaoOk > 0 ? ` · ${nNaoOk} com problema` : ''}
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 text-gray-300 transition-transform ${aberto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {aberto && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {exec.observacoes && <p className="text-sm text-gray-600 italic">{exec.observacoes}</p>}
                  {itens.map(item => (
                    <div key={item.id} className="text-sm">
                      <span className={`font-semibold ${SITUACAO_COR[item.situacao]}`}>[{SITUACAO_LABEL[item.situacao]}]</span>{' '}
                      <span className="text-gray-700">{item.descricao}</span>
                      <span className="text-xs text-gray-400"> · {PERIODICIDADE_LABEL[item.periodicidade]}</span>
                      {item.situacao_encontrada && <p className="text-xs text-gray-500 mt-0.5">Situação encontrada: {item.situacao_encontrada}</p>}
                      {item.servico_executado && <p className="text-xs text-gray-500">Serviço: {item.servico_executado}</p>}
                      {item.materiais_utilizados && <p className="text-xs text-gray-500">Materiais: {item.materiais_utilizados}</p>}
                      {item.observacao && <p className="text-xs text-gray-500">Obs: {item.observacao}</p>}
                      {(fotosPorItem[item.id]?.length > 0) && (
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {fotosPorItem[item.id].map(foto => (
                            <img key={foto.id} src={foto.url} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
