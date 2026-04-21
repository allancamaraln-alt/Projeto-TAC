import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .order('nome')
      setClientes(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  )

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800">Clientes</h1>
          <button
            onClick={() => navigate('/clientes/novo')}
            className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <input
          type="search"
          className="input-field"
          placeholder="Buscar por nome ou telefone..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      <div className="px-4 pt-3">
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}
          </div>
        )}

        {!loading && filtrados.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-medium">{busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}</p>
            {!busca && (
              <button onClick={() => navigate('/clientes/novo')} className="mt-4 text-blue-600 font-medium">
                + Adicionar primeiro cliente
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filtrados.map(cliente => (
            <button
              key={cliente.id}
              onClick={() => navigate(`/clientes/${cliente.id}`)}
              className="card w-full text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-lg">
                    {cliente.nome.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{cliente.nome}</p>
                  <p className="text-sm text-gray-500">{cliente.telefone}</p>
                  {cliente.endereco && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{cliente.endereco}</p>
                  )}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
