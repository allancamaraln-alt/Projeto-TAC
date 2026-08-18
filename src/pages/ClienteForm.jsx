import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../hooks/useToast'
import { buscarCep } from '../lib/pmocCep'

function maskCep(v) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

function montarEndereco({ rua, numero, complemento, bairro, cidade, estado }) {
  const linha1 = [rua, numero].filter(Boolean).join(', ')
  const linha2 = [complemento, bairro].filter(Boolean).join(' - ')
  const linha3 = [cidade, estado].filter(Boolean).join('/')
  return [linha1, linha2, linha3].filter(Boolean).join(', ')
}

const FORM_INICIAL = {
  nome: '', telefone: '',
  cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
}

export default function ClienteForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const isEdit = Boolean(id && id !== 'novo')

  const toast = useToast()
  const [form, setForm] = useState(FORM_INICIAL)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    supabase.from('clientes').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) setErro('Erro ao carregar cliente.')
        else if (data) setForm({
          nome: data.nome,
          telefone: data.telefone,
          cep: data.cep || '',
          rua: data.rua || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.cidade || '',
          estado: data.estado || '',
        })
        setLoading(false)
      })
  }, [id, isEdit])

  async function handleCepChange(e) {
    const cep = maskCep(e.target.value)
    setForm(f => ({ ...f, cep }))
    const digits = cep.replace(/\D/g, '')
    if (digits.length === 8) {
      setBuscandoCep(true)
      const resultado = await buscarCep(digits)
      setBuscandoCep(false)
      if (resultado) {
        setForm(f => ({
          ...f,
          cep,
          rua: resultado.rua || f.rua,
          bairro: resultado.bairro || f.bairro,
          cidade: resultado.cidade || f.cidade,
          estado: resultado.estado || f.estado,
        }))
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    if (!form.telefone.trim()) { setErro('Telefone é obrigatório.'); return }

    setSaving(true)
    const payload = { ...form, endereco: montarEndereco(form) }
    let error
    if (isEdit) {
      ({ error } = await supabase.from('clientes').update(payload).eq('id', id))
    } else {
      ({ error } = await supabase.from('clientes').insert({ ...payload, tecnico_id: user.id }))
    }

    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSaving(false); return }
    toast(isEdit ? 'Cliente atualizado!' : 'Cliente cadastrado!')
    navigate('/clientes')
  }

  async function handleDelete() {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { setErro('Não foi possível excluir. Verifique se há OS vinculadas.'); return }
    navigate('/clientes')
  }

  if (loading) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input type="text" className="input-field" placeholder="Nome completo" value={form.nome} onChange={set('nome')} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp *</label>
          <input
            type="tel"
            className="input-field"
            placeholder="(11) 99999-9999"
            value={form.telefone}
            onChange={set('telefone')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
          <input
            type="text"
            className="input-field"
            inputMode="numeric"
            placeholder="00000-000"
            value={form.cep}
            onChange={handleCepChange}
          />
          {buscandoCep && <p className="text-xs text-gray-400 mt-1">Buscando endereço...</p>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
            <input type="text" className="input-field" value={form.rua} onChange={set('rua')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
            <input type="text" className="input-field" value={form.numero} onChange={set('numero')} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
          <input type="text" className="input-field" placeholder="Opcional" value={form.complemento} onChange={set('complemento')} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input type="text" className="input-field" value={form.bairro} onChange={set('bairro')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
            <input
              type="text"
              className="input-field"
              maxLength={2}
              value={form.estado}
              onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
          <input type="text" className="input-field" value={form.cidade} onChange={set('cidade')} />
        </div>

        {erro && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar cliente'}
        </button>

        {isEdit && (
          <button type="button" onClick={() => setConfirmOpen(true)} className="btn-danger">
            Excluir cliente
          </button>
        )}
      </form>

      <ConfirmModal
        open={confirmOpen}
        title="Excluir cliente?"
        message="As OS vinculadas também serão excluídas. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
