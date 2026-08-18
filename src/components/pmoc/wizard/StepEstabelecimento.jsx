import { useState } from 'react'
import { maskCpfCnpj } from '../../../lib/cpfCnpj'
import { buscarCep } from '../../../lib/pmocCep'
import { TIPOS_ESTABELECIMENTO } from '../../../lib/pmocTemplates'

function maskCep(v) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export default function StepEstabelecimento({ value, onChange, clienteEnderecoFreeform }) {
  const [buscandoCep, setBuscandoCep] = useState(false)

  const set = campo => e => onChange({ ...value, [campo]: e.target.value })

  async function handleCepChange(e) {
    const cep = maskCep(e.target.value)
    onChange({ ...value, cep })
    const digits = cep.replace(/\D/g, '')
    if (digits.length === 8) {
      setBuscandoCep(true)
      const resultado = await buscarCep(digits)
      setBuscandoCep(false)
      if (resultado) {
        onChange({ ...value, cep, rua: resultado.rua || value.rua, bairro: resultado.bairro || value.bairro, cidade: resultado.cidade || value.cidade, estado: resultado.estado || value.estado })
      }
    }
  }

  function usarEnderecoCliente() {
    onChange({ ...value, rua: clienteEnderecoFreeform || value.rua })
  }

  return (
    <div className="px-4 pt-5 space-y-5 pb-8">
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Estabelecimento</h2>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nome do estabelecimento</label>
          <input className="input-field" value={value.nome} onChange={set('nome')} placeholder="Ex: Clínica São José" autoFocus />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">CNPJ/CPF</label>
          <input
            className="input-field"
            inputMode="numeric"
            value={value.cnpj_cpf}
            onChange={e => onChange({ ...value, cnpj_cpf: maskCpfCnpj(e.target.value) })}
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de estabelecimento</label>
          <select className="input-field" value={value.tipo_estabelecimento} onChange={set('tipo_estabelecimento')}>
            {TIPOS_ESTABELECIMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Endereço</h2>
          {clienteEnderecoFreeform && (
            <button type="button" onClick={usarEnderecoCliente} className="text-xs font-semibold ac-text">
              Usar endereço do cliente
            </button>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">CEP</label>
          <input className="input-field" inputMode="numeric" value={value.cep} onChange={handleCepChange} placeholder="00000-000" />
          {buscandoCep && <p className="text-xs text-gray-400 mt-1">Buscando endereço...</p>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Rua</label>
            <input className="input-field" value={value.rua} onChange={set('rua')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Número</label>
            <input className="input-field" value={value.numero} onChange={set('numero')} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Complemento</label>
          <input className="input-field" value={value.complemento} onChange={set('complemento')} placeholder="Opcional" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
            <input className="input-field" value={value.bairro} onChange={set('bairro')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">UF</label>
            <input className="input-field" maxLength={2} value={value.estado} onChange={e => onChange({ ...value, estado: e.target.value.toUpperCase() })} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Cidade</label>
          <input className="input-field" value={value.cidade} onChange={set('cidade')} />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Área climatizada</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Área climatizada (m²)</label>
            <input type="number" step="0.01" className="input-field" value={value.area_climatizada_m2} onChange={set('area_climatizada_m2')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Quantidade de ambientes</label>
            <input type="number" min="0" className="input-field" value={value.qtd_ambientes} onChange={set('qtd_ambientes')} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
          <textarea className="input-field" rows={2} value={value.observacoes} onChange={set('observacoes')} placeholder="Opcional" />
        </div>
      </div>
    </div>
  )
}
