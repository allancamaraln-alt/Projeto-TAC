import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import { formatDate } from '../../../lib/format'
import { REGISTRO_TIPOS, TIPOS_ESTABELECIMENTO } from '../../../lib/pmocTemplates'
import { maskCpfCnpj } from '../../../lib/cpfCnpj'
import { buscarCep } from '../../../lib/pmocCep'

function labelDe(lista, value) {
  return lista.find(o => o.value === value)?.label || '—'
}

function maskCep(v) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

function Linha({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-700 text-right">{value || '—'}</span>
    </div>
  )
}

export default function TabVisaoGeral({ plano, estabelecimento, cliente, onSaved }) {
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [form, setForm] = useState(null)

  function iniciarEdicao() {
    setForm({
      responsavel_tecnico: plano.responsavel_tecnico || '',
      registro_tipo: plano.registro_tipo || '',
      registro_numero: plano.registro_numero || '',
      art_trt: plano.art_trt || '',
      data_inicio: plano.data_inicio,
      observacoes: plano.observacoes || '',
      estab_nome: estabelecimento?.nome || '',
      estab_cnpj_cpf: estabelecimento?.cnpj_cpf || '',
      estab_tipo: estabelecimento?.tipo_estabelecimento || '',
      estab_cep: estabelecimento?.cep || '',
      estab_rua: estabelecimento?.rua || '',
      estab_numero: estabelecimento?.numero || '',
      estab_complemento: estabelecimento?.complemento || '',
      estab_bairro: estabelecimento?.bairro || '',
      estab_cidade: estabelecimento?.cidade || '',
      estab_estado: estabelecimento?.estado || '',
      estab_area: estabelecimento?.area_climatizada_m2 ?? '',
      estab_qtd_ambientes: estabelecimento?.qtd_ambientes ?? '',
    })
    setEditando(true)
  }

  const set = campo => e => setForm(f => ({ ...f, [campo]: e.target.value }))

  async function handleCepChange(e) {
    const cep = maskCep(e.target.value)
    setForm(f => ({ ...f, estab_cep: cep }))
    const digits = cep.replace(/\D/g, '')
    if (digits.length === 8) {
      setBuscandoCep(true)
      const resultado = await buscarCep(digits)
      setBuscandoCep(false)
      if (resultado) {
        setForm(f => ({
          ...f,
          estab_cep: cep,
          estab_rua: resultado.rua || f.estab_rua,
          estab_bairro: resultado.bairro || f.estab_bairro,
          estab_cidade: resultado.cidade || f.estab_cidade,
          estab_estado: resultado.estado || f.estab_estado,
        }))
      }
    }
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from('pmoc_planos').update({
        responsavel_tecnico: form.responsavel_tecnico.trim(),
        registro_tipo: form.registro_tipo || null,
        registro_numero: form.registro_numero.trim(),
        art_trt: form.art_trt.trim(),
        data_inicio: form.data_inicio,
        observacoes: form.observacoes.trim(),
      }).eq('id', plano.id),
      estabelecimento
        ? supabase.from('pmoc_estabelecimentos').update({
            nome: form.estab_nome.trim(),
            cnpj_cpf: form.estab_cnpj_cpf.trim(),
            tipo_estabelecimento: form.estab_tipo,
            cep: form.estab_cep.trim(),
            rua: form.estab_rua.trim(),
            numero: form.estab_numero.trim(),
            complemento: form.estab_complemento.trim(),
            bairro: form.estab_bairro.trim(),
            cidade: form.estab_cidade.trim(),
            estado: form.estab_estado.trim(),
            area_climatizada_m2: form.estab_area === '' ? null : Number(form.estab_area),
            qtd_ambientes: form.estab_qtd_ambientes === '' ? null : Number(form.estab_qtd_ambientes),
          }).eq('id', estabelecimento.id)
        : Promise.resolve({ error: null }),
    ])
    setSalvando(false)
    if (err1 || err2) { toast('Erro ao salvar.', 'error'); return }
    toast('Dados atualizados!')
    setEditando(false)
    onSaved()
  }

  if (editando) {
    return (
      <form onSubmit={salvar} className="px-4 pt-4 space-y-4 pb-8">
        <div className="card space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dados gerais</h2>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Responsável técnico</label>
            <input className="input-field" value={form.responsavel_tecnico} onChange={set('responsavel_tecnico')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Registro</label>
              <select className="input-field" value={form.registro_tipo} onChange={set('registro_tipo')}>
                {REGISTRO_TIPOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Número</label>
              <input className="input-field" value={form.registro_numero} onChange={set('registro_numero')} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ART/TRT</label>
            <input className="input-field" value={form.art_trt} onChange={set('art_trt')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Início do plano</label>
            <input type="date" className="input-field" value={form.data_inicio} onChange={set('data_inicio')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
            <textarea className="input-field" rows={2} value={form.observacoes} onChange={set('observacoes')} />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Estabelecimento</h2>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
            <input className="input-field" value={form.estab_nome} onChange={set('estab_nome')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CNPJ/CPF</label>
            <input
              className="input-field"
              inputMode="numeric"
              value={form.estab_cnpj_cpf}
              onChange={e => setForm(f => ({ ...f, estab_cnpj_cpf: maskCpfCnpj(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <select className="input-field" value={form.estab_tipo} onChange={set('estab_tipo')}>
              {TIPOS_ESTABELECIMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Área (m²)</label>
              <input type="number" step="0.01" className="input-field" value={form.estab_area} onChange={set('estab_area')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Qtd. ambientes</label>
              <input type="number" className="input-field" value={form.estab_qtd_ambientes} onChange={set('estab_qtd_ambientes')} />
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Endereço</h2>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CEP</label>
            <input className="input-field" inputMode="numeric" value={form.estab_cep} onChange={handleCepChange} placeholder="00000-000" />
            {buscandoCep && <p className="text-xs text-gray-400 mt-1">Buscando endereço...</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Rua</label>
              <input className="input-field" value={form.estab_rua} onChange={set('estab_rua')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Número</label>
              <input className="input-field" value={form.estab_numero} onChange={set('estab_numero')} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Complemento</label>
            <input className="input-field" value={form.estab_complemento} onChange={set('estab_complemento')} placeholder="Opcional" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
              <input className="input-field" value={form.estab_bairro} onChange={set('estab_bairro')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">UF</label>
              <input className="input-field" maxLength={2} value={form.estab_estado} onChange={e => setForm(f => ({ ...f, estab_estado: e.target.value.toUpperCase() }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cidade</label>
            <input className="input-field" value={form.estab_cidade} onChange={set('estab_cidade')} />
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={salvando} className="btn-primary flex-1 disabled:opacity-60">{salvando ? 'Salvando...' : 'Salvar'}</button>
          <button type="button" onClick={() => setEditando(false)} className="btn-secondary flex-1">Cancelar</button>
        </div>
      </form>
    )
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dados gerais</h2>
          <button onClick={iniciarEdicao} className="text-xs font-semibold ac-text">Editar</button>
        </div>
        <Linha label="Cliente" value={cliente?.nome} />
        <Linha label="Telefone" value={cliente?.telefone} />
        <Linha label="Responsável técnico" value={plano.responsavel_tecnico} />
        <Linha label="Registro" value={plano.registro_tipo ? `${labelDe(REGISTRO_TIPOS, plano.registro_tipo)} ${plano.registro_numero}` : ''} />
        <Linha label="ART/TRT" value={plano.art_trt} />
        <Linha label="Início do plano" value={formatDate(plano.data_inicio)} />
        {plano.observacoes && <Linha label="Observações" value={plano.observacoes} />}
      </div>

      <div className="card">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Estabelecimento</h2>
        <Linha label="Nome" value={estabelecimento?.nome} />
        <Linha label="CNPJ/CPF" value={estabelecimento?.cnpj_cpf} />
        <Linha label="Tipo" value={estabelecimento?.tipo_estabelecimento ? labelDe(TIPOS_ESTABELECIMENTO, estabelecimento.tipo_estabelecimento) : ''} />
        <Linha
          label="Endereço"
          value={estabelecimento ? [estabelecimento.rua, estabelecimento.numero, estabelecimento.bairro, estabelecimento.cidade, estabelecimento.estado].filter(Boolean).join(', ') : ''}
        />
        <Linha label="CEP" value={estabelecimento?.cep} />
        <Linha label="Área climatizada" value={estabelecimento?.area_climatizada_m2 ? `${estabelecimento.area_climatizada_m2} m²` : ''} />
        <Linha label="Qtd. ambientes" value={estabelecimento?.qtd_ambientes} />
      </div>
    </div>
  )
}
