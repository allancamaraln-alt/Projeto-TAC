import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAI } from '../hooks/useAI'
import { formatOS, formatBRL, formatDate, formatTime, formatGarantia } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import ModalLembrete from '../components/ModalLembrete'
import ConfirmModal from '../components/ConfirmModal'
import SignaturePad from '../components/SignaturePad'
import { useToast } from '../hooks/useToast'
import { Capacitor } from '@capacitor/core'

const PROXIMOS_STATUS = {
  orcamento:    { label: '✅ Marcar como Aprovado', next: 'aprovado' },
  aprovado:     { label: '🔧 Iniciar Execução', next: 'em_andamento' },
  em_andamento: { label: '✔️ Marcar como Concluído', next: 'concluido' },
}

const FORMAS_PAGAMENTO = [
  { value: 'pix',           label: 'Pix' },
  { value: 'dinheiro',      label: 'Dinheiro / Espécie' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'outros',        label: 'Outros' },
]

const FORMA_LABEL = {
  pix: 'Pix',
  dinheiro: 'Dinheiro / Espécie',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  outros: 'Outros',
}

function calcularVencimento(valor, unidade) {
  const d = new Date()
  if (unidade === 'dias')  d.setDate(d.getDate() + valor)
  if (unidade === 'meses') d.setMonth(d.getMonth() + valor)
  if (unidade === 'anos')  d.setFullYear(d.getFullYear() + valor)
  return d.toISOString().split('T')[0]
}

const MAX_FOTOS = 8

function resizeFoto(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1280
      let { width: w, height: h } = img
      if (w > MAX || h > MAX) {
        const ratio = Math.min(MAX / w, MAX / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    }
    img.src = url
  })
}

function resizeCover(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const W = 1200, H = 400
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')
      const imgRatio = img.width / img.height
      const targetRatio = W / H
      let sx, sy, sw, sh
      if (imgRatio > targetRatio) {
        sh = img.height; sw = sh * targetRatio; sx = (img.width - sw) / 2; sy = 0
      } else {
        sw = img.width; sh = sw / targetRatio; sx = 0; sy = (img.height - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)
      URL.revokeObjectURL(url)
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    }
    img.src = url
  })
}

export default function OrdemDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const { setActiveOrdem, clearActiveOrdem } = useAI()
  const toast = useToast()
  const coverInputRef = useRef()
  const fotoInputRef = useRef()
  const [os, setOs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviandoRecibo, setEnviandoRecibo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [fotos, setFotos] = useState([])
  const [laudos, setLaudos] = useState([])
  const [atendimentoAtivo, setAtendimentoAtivo] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoSelecionada, setFotoSelecionada] = useState(null)
  const [assinaturaPad, setAssinaturaPad] = useState(null) // 'tecnico' | 'cliente' | null
  const [savingAssinatura, setSavingAssinatura] = useState(false)
  const [mostrarLembrete, setMostrarLembrete] = useState(false)
  const [mostrarModalConclusao, setMostrarModalConclusao] = useState(false)
  const [conclusaoForm, setConclusaoForm] = useState({ forma_pagamento: '', garantia_valor: '', garantia_unidade: 'meses', garantia_obs: '' })
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null, danger: false })

  async function handleCoverChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const blob = await resizeCover(file)
      const path = `${user.id}_cover.jpg`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile({ cover_url: `${publicUrl}?v=${Date.now()}` })
      toast('Foto de capa atualizada!')
    } catch {
      toast('Erro ao atualizar foto', 'error')
    }
    setUploadingCover(false)
    e.target.value = ''
  }

  useEffect(() => {
    supabase
      .from('ordens_servico')
      .select('*, clientes(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => { setOs(data); setLoading(false) })

    supabase
      .from('ordens_fotos')
      .select('*')
      .eq('ordem_id', id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setFotos(data || []))

    supabase
      .from('laudos')
      .select('*')
      .eq('ordem_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setLaudos(data || []))

    supabase
      .from('ai_conversations')
      .select('id')
      .eq('ordem_id', id)
      .eq('tipo', 'atendimento')
      .eq('status', 'ativa')
      .maybeSingle()
      .then(({ data }) => setAtendimentoAtivo(!!data))
  }, [id])

  // Enquanto o técnico está vendo esta OS, o ClimaPro IA já sabe cliente/
  // equipamento/histórico dela automaticamente (ver src/lib/ai/context/osContext.js).
  useEffect(() => {
    setActiveOrdem(id)
    return () => clearActiveOrdem()
  }, [id, setActiveOrdem, clearActiveOrdem])

  async function handleFotoChange(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const vagas = MAX_FOTOS - fotos.length
    if (vagas <= 0) {
      toast(`Limite de ${MAX_FOTOS} fotos por OS`, 'error')
      e.target.value = ''
      return
    }
    if (files.length > vagas) {
      toast(`Só dá pra adicionar mais ${vagas} foto(s)`, 'error')
    }
    setUploadingFoto(true)
    for (const file of files.slice(0, vagas)) {
      try {
        const blob = await resizeFoto(file)
        const path = `${user.id}/${id}/${Date.now()}.jpg`
        const { error } = await supabase.storage
          .from('ordens-fotos')
          .upload(path, blob, { contentType: 'image/jpeg' })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('ordens-fotos').getPublicUrl(path)
        const { data: novaFoto, error: insertError } = await supabase
          .from('ordens_fotos')
          .insert({ ordem_id: id, tecnico_id: user.id, url: publicUrl })
          .select()
          .single()
        if (insertError) throw insertError
        setFotos(prev => [...prev, novaFoto])
      } catch {
        toast('Erro ao enviar foto', 'error')
      }
    }
    setUploadingFoto(false)
    e.target.value = ''
  }

  async function excluirFoto(foto) {
    const path = foto.url.split('/ordens-fotos/')[1]
    await supabase.storage.from('ordens-fotos').remove([path])
    await supabase.from('ordens_fotos').delete().eq('id', foto.id)
    setFotos(prev => prev.filter(f => f.id !== foto.id))
    setFotoSelecionada(null)
  }

  async function aplicarAssinaturaSalva() {
    setSavingAssinatura(true)
    try {
      const url = profile.assinatura_url
      await supabase.from('ordens_servico').update({ assinatura_tecnico_url: url }).eq('id', id)
      setOs(prev => ({ ...prev, assinatura_tecnico_url: url }))
      toast('Assinatura aplicada!')
    } catch {
      toast('Erro ao aplicar assinatura', 'error')
    } finally {
      setSavingAssinatura(false)
    }
  }

  async function salvarAssinatura(blob) {
    setSavingAssinatura(true)
    try {
      const campo = assinaturaPad === 'tecnico' ? 'assinatura_tecnico_url' : 'assinatura_cliente_url'
      const path = `${user.id}/${id}/${assinaturaPad}_${Date.now()}.png`
      const { error: upErr } = await supabase.storage
        .from('assinaturas')
        .upload(path, blob, { contentType: 'image/png' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('assinaturas').getPublicUrl(path)
      const url = `${publicUrl}?v=${Date.now()}`
      await supabase.from('ordens_servico').update({ [campo]: url }).eq('id', id)
      setOs(prev => ({ ...prev, [campo]: url }))
      if (assinaturaPad === 'tecnico') {
        await updateProfile({ assinatura_url: url })
      }
      toast('Assinatura salva!')
    } catch {
      toast('Erro ao salvar assinatura', 'error')
    } finally {
      setSavingAssinatura(false)
      setAssinaturaPad(null)
    }
  }

  async function excluirAssinatura(tipo) {
    const campo = tipo === 'tecnico' ? 'assinatura_tecnico_url' : 'assinatura_cliente_url'
    const url = os[campo]
    if (url) {
      const path = url.split('/assinaturas/')[1]?.split('?')[0]
      if (path) await supabase.storage.from('assinaturas').remove([path])
    }
    await supabase.from('ordens_servico').update({ [campo]: null }).eq('id', id)
    setOs(prev => ({ ...prev, [campo]: null }))
    toast('Assinatura removida')
  }

  async function avancarStatus() {
    const proximo = PROXIMOS_STATUS[os.status]
    if (!proximo) return

    if (proximo.next === 'concluido') {
      setMostrarModalConclusao(true)
      return
    }

    setAtualizando(true)
    const { error } = await supabase
      .from('ordens_servico')
      .update({ status: proximo.next })
      .eq('id', id)
    if (!error) {
      setOs(prev => ({ ...prev, status: proximo.next }))
      toast('Status atualizado!')
    }
    setAtualizando(false)
  }

  async function confirmarConclusao() {
    setAtualizando(true)
    const gValor = parseInt(conclusaoForm.garantia_valor) || null
    const hoje = new Date().toISOString().split('T')[0]
    const vencimento = gValor ? calcularVencimento(gValor, conclusaoForm.garantia_unidade) : null

    const payload = {
      status: 'concluido',
      data_conclusao: hoje,
      forma_pagamento: conclusaoForm.forma_pagamento || null,
      garantia_valor: gValor,
      garantia_unidade: gValor ? conclusaoForm.garantia_unidade : null,
      garantia_vencimento: vencimento,
      garantia_obs: conclusaoForm.garantia_obs || null,
    }

    const { error } = await supabase.from('ordens_servico').update(payload).eq('id', id)
    if (error) {
      if (error.message?.includes('column') || error.code === '42703') {
        toast('Execute a migration no Supabase antes de continuar.', 'error')
      } else {
        toast('Erro ao salvar. Tente novamente.', 'error')
      }
    } else {
      setOs(prev => ({ ...prev, ...payload }))
      toast('OS concluída!')
      setMostrarModalConclusao(false)
      setMostrarLembrete(true)
    }
    setAtualizando(false)
  }

  function pedirCancelamento() {
    setConfirm({
      open: true,
      title: 'Cancelar esta OS?',
      message: 'A OS será marcada como cancelada.',
      danger: true,
      action: async () => {
        await supabase.from('ordens_servico').update({ status: 'cancelado' }).eq('id', id)
        setOs(prev => ({ ...prev, status: 'cancelado' }))
        toast('OS cancelada', 'info')
      },
    })
  }

  function pedirExclusao() {
    setConfirm({
      open: true,
      title: 'Excluir permanentemente?',
      message: 'Esta ação não pode ser desfeita.',
      danger: true,
      action: async () => {
        await supabase.from('ordens_servico').delete().eq('id', id)
        navigate('/ordens')
      },
    })
  }

  async function compartilharPDF(gerarFn, nomeArquivo, mensagem) {
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      const doc = await gerarFn()
      const base64 = doc.output('datauristring').split(',')[1]
      const { uri } = await Filesystem.writeFile({ path: nomeArquivo, data: base64, directory: Directory.Cache })
      await Share.share({ title: nomeArquivo.replace('.pdf', ''), url: uri, dialogTitle: 'Enviar' })
      return
    }

    if (typeof navigator.share === 'function') {
      const doc = await gerarFn()
      const blob = doc.output('blob')
      const file = new File([blob], nomeArquivo, { type: 'application/pdf' })
      try {
        await navigator.share({ files: [file], title: nomeArquivo.replace('.pdf', '') })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }

    const doc = await gerarFn()
    const telefone = (os.clientes?.telefone || '').replace(/\D/g, '')
    const ddi = telefone.startsWith('55') ? telefone : `55${telefone}`
    doc.save(nomeArquivo)
    window.open(`https://wa.me/${ddi}?text=${mensagem}`, '_blank')
  }

  async function enviarWhatsApp() {
    setEnviando(true)
    try {
      const { gerarOrcamentoPDF } = await import('../lib/pdf')
      const nome = `Orcamento-${formatOS(os.numero)}-${os.clientes?.nome?.split(' ')[0]}.pdf`
      const msg = encodeURIComponent(
        `Olá ${os.clientes?.nome}! Segue em anexo o orçamento ${formatOS(os.numero)}` +
        ` para *${os.tipo_servico}*.\n\nValor: *${formatBRL(os.valor)}*\n\nPara aprovar, responda *SIM*.\n\n` +
        `-- ${profile?.nome || 'Técnico'}${profile?.empresa ? ` | ${profile.empresa}` : ''}`
      )
      await compartilharPDF(() => gerarOrcamentoPDF({ cliente: os.clientes, ordem: os, tecnico: profile }), nome, msg)
    } finally {
      setEnviando(false)
    }
  }

  async function enviarRecibo() {
    setEnviandoRecibo(true)
    try {
      const { gerarReciboPDF } = await import('../lib/pdf')
      const nome = `Recibo-${formatOS(os.numero)}-${os.clientes?.nome?.split(' ')[0]}.pdf`
      const msg = encodeURIComponent(
        `Olá ${os.clientes?.nome}! Segue o recibo referente ao serviço *${os.tipo_servico}* (${formatOS(os.numero)}).\n\n` +
        `Valor pago: *${formatBRL(os.valor)}*\n\nObrigado pela preferência!\n\n` +
        `-- ${profile?.nome || 'Técnico'}${profile?.empresa ? ` | ${profile.empresa}` : ''}`
      )
      await compartilharPDF(() => gerarReciboPDF({ cliente: os.clientes, ordem: os, tecnico: profile, fotos }), nome, msg)
    } finally {
      setEnviandoRecibo(false)
    }
  }

  if (loading) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )
  if (!os) return (
    <div className="page-container flex items-center justify-center">
      <p className="text-gray-400">OS não encontrada.</p>
    </div>
  )

  const proximo = PROXIMOS_STATUS[os.status]

  return (
    <>
    <div className="page-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">{formatOS(os.numero)}</span>
            <StatusBadge status={os.status} />
          </div>
          <h1 className="text-lg font-bold text-gray-800">{os.clientes?.nome}</h1>
        </div>
        <button
          onClick={() => navigate(`/ordens/${id}/editar`)}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100"
          title="Editar OS"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Preview do cabeçalho do PDF */}
        <div className="rounded-2xl overflow-hidden h-28 flex flex-col">
          {/* Zona decorativa — imagem com tonalidade leve */}
          <div className="relative flex-1" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}>
            {profile?.cover_url && (
              <>
                <img src={profile.cover_url} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-white/30" />
              </>
            )}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute top-2 right-3 flex items-center gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-2.5 py-1 active:bg-black/40 transition-colors"
            >
              {uploadingCover
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
              }
              <span className="text-white text-xs font-medium">
                {profile?.cover_url ? 'Alterar capa' : 'Adicionar capa'}
              </span>
            </button>
          </div>
          {/* Barra de informações — linha única */}
          <div className="flex items-center justify-between px-4 h-9 flex-shrink-0" style={{ background: 'rgb(3,105,161)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">
                {profile?.empresa || profile?.nome || 'ClimaPro'}
              </p>
            </div>
            <p className="text-white/80 text-xs font-mono flex-shrink-0 ml-3">
              {formatOS(os.numero)} · {formatDate(os.created_at)}
            </p>
          </div>
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

        {/* Botão Enviar Orçamento */}
        <button
          onClick={enviarWhatsApp}
          disabled={enviando}
          className="w-full bg-green-500 text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70"
          style={{ boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}
        >
          {enviando ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>Enviar Orçamento</span>
            </>
          )}
        </button>

        {/* Botão Enviar Recibo (apenas quando concluído) */}
        {os.status === 'concluido' && (
          <button
            onClick={enviarRecibo}
            disabled={enviandoRecibo}
            className="w-full text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', boxShadow: '0 4px 20px rgba(2,132,199,0.35)' }}
          >
            {enviandoRecibo ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Gerando Recibo...
              </>
            ) : (
              <>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Enviar Recibo ao Cliente</span>
              </>
            )}
          </button>
        )}

        {/* Modo Atendimento IA — narração ao vivo durante o serviço */}
        {(os.status === 'aprovado' || os.status === 'em_andamento') && (
          <button
            onClick={() => navigate(`/ordens/${id}/atendimento`)}
            className="w-full text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)', boxShadow: '0 4px 20px rgb(var(--ac) / 0.35)' }}
          >
            <span className="text-xl">▶️</span>
            <span>{atendimentoAtivo ? 'Continuar Atendimento com IA' : 'Iniciar Atendimento com IA'}</span>
          </button>
        )}

        {/* Dados do cliente */}
        <div className="card">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cliente</h2>
          <p className="font-semibold text-gray-800">{os.clientes?.nome}</p>
          <p className="text-sm text-gray-600 mt-0.5">📱 {os.clientes?.telefone}</p>
          {os.clientes?.endereco && (
            <p className="text-sm text-gray-500 mt-0.5">📍 {os.clientes?.endereco}</p>
          )}
        </div>

        {/* Dados da OS */}
        <div className="card space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Serviço</h2>
          <Row label="Tipo" value={os.tipo_servico} />
          <Row label="Valor" value={formatBRL(os.valor)} highlight />
          {os.forma_pagamento && (
            <Row label="Pagamento" value={FORMA_LABEL[os.forma_pagamento] || os.forma_pagamento} />
          )}
          {os.data_agendamento && (
            <Row
              label="Agendamento"
              value={`${formatDate(os.data_agendamento)}${os.hora_agendamento ? ` às ${formatTime(os.hora_agendamento)}` : ''}`}
            />
          )}
          {os.data_conclusao && (
            <Row label="Concluído em" value={formatDate(os.data_conclusao)} />
          )}
          {os.descricao && <Row label="Descrição" value={os.descricao} />}
          {os.observacoes && <Row label="Observações" value={os.observacoes} />}
          <div>
            <p className="text-xs text-gray-400">Criado em</p>
            <p className="text-sm text-gray-600">{formatDate(os.created_at)}</p>
          </div>
        </div>

        {/* Laudos técnicos gerados pelo ClimaPro IA */}
        {laudos.length > 0 && (
          <div className="card">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Laudos técnicos</h2>
            <div className="space-y-2">
              {laudos.map(laudo => (
                <LaudoItem key={laudo.id} laudo={laudo} tecnico={profile} />
              ))}
            </div>
          </div>
        )}

        {/* Registro fotográfico */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fotos do serviço</h2>
            <span className="text-xs text-gray-400">{fotos.length}/{MAX_FOTOS}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {fotos.map(foto => (
              <button
                key={foto.id}
                type="button"
                onClick={() => setFotoSelecionada(foto)}
                className="aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                <img src={foto.url} alt="Foto do serviço" className="w-full h-full object-cover" />
              </button>
            ))}
            {fotos.length < MAX_FOTOS && (
              <button
                type="button"
                onClick={() => fotoInputRef.current?.click()}
                disabled={uploadingFoto}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center active:bg-gray-50"
              >
                {uploadingFoto
                  ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                }
              </button>
            )}
          </div>
          <input ref={fotoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoChange} />
        </div>

        {/* Garantia */}
        {os.garantia_valor && (
          <div className="card border border-sky-100 bg-sky-50/50">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-800">Garantia</p>
                <p className="text-sm text-sky-700 mt-0.5">
                  {formatGarantia(os.garantia_valor, os.garantia_unidade)}
                  {os.garantia_vencimento && ` — válida até ${formatDate(os.garantia_vencimento)}`}
                </p>
                {os.garantia_obs && (
                  <p className="text-xs text-sky-600 mt-1">{os.garantia_obs}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Assinaturas */}
        <div className="card space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Assinaturas</h2>
          {['tecnico', 'cliente'].map(tipo => {
            const campo = tipo === 'tecnico' ? 'assinatura_tecnico_url' : 'assinatura_cliente_url'
            const label = tipo === 'tecnico' ? 'Técnico' : 'Cliente'
            const url = os[campo]
            return (
              <div key={tipo}>
                <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
                {url ? (
                  <div className="relative border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
                    <img src={url} alt={`Assinatura ${label}`} className="w-full h-20 object-contain" />
                    <button
                      onClick={() => excluirAssinatura(tipo)}
                      className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center active:bg-red-50"
                    >
                      <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : tipo === 'tecnico' && profile?.assinatura_url ? (
                  <button
                    onClick={aplicarAssinaturaSalva}
                    className="w-full h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 text-sm active:bg-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Usar minha assinatura salva
                  </button>
                ) : (
                  <button
                    onClick={() => setAssinaturaPad(tipo)}
                    className="w-full h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 text-sm active:bg-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Adicionar assinatura
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Avançar status */}
        {proximo && (
          <button onClick={avancarStatus} disabled={atualizando} className="btn-primary">
            {atualizando ? 'Atualizando...' : proximo.label}
          </button>
        )}

        {/* Cancelar / Excluir */}
        <div className="space-y-2 pb-4">
          {os.status !== 'cancelado' && os.status !== 'concluido' && (
            <button onClick={pedirCancelamento} className="btn-danger">
              Cancelar OS
            </button>
          )}
          <button onClick={pedirExclusao} className="w-full text-center text-sm text-gray-400 py-2">
            Excluir permanentemente
          </button>
        </div>
      </div>
    </div>

    {mostrarLembrete && (
      <ModalLembrete os={os} onClose={() => setMostrarLembrete(false)} />
    )}

    {assinaturaPad && (
      <SignaturePad
        titulo={assinaturaPad === 'tecnico' ? 'Assinatura do Técnico' : 'Assinatura do Cliente'}
        onConfirmar={salvarAssinatura}
        onFechar={() => setAssinaturaPad(null)}
      />
    )}

    {savingAssinatura && (
      <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
        <span className="w-8 h-8 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )}

    {fotoSelecionada && (
      <div
        className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
        onClick={() => setFotoSelecionada(null)}
      >
        <img src={fotoSelecionada.url} alt="Foto do serviço" className="max-w-full max-h-[80vh] object-contain" />
        <button
          onClick={(e) => { e.stopPropagation(); excluirFoto(fotoSelecionada) }}
          className="absolute bottom-8 bg-red-500 text-white text-sm font-medium px-5 py-2.5 rounded-full active:bg-red-600"
        >
          Excluir foto
        </button>
        <button
          onClick={() => setFotoSelecionada(null)}
          className="absolute top-6 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )}

    <ConfirmModal
      open={confirm.open}
      title={confirm.title}
      message={confirm.message}
      confirmLabel="Confirmar"
      danger={confirm.danger}
      onConfirm={confirm.action ?? (() => {})}
      onClose={() => setConfirm(c => ({ ...c, open: false }))}
    />

    {/* Modal de Conclusão */}
    {mostrarModalConclusao && (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-end"
        onClick={e => { if (e.target === e.currentTarget) setMostrarModalConclusao(false) }}
      >
        <div className="bg-white w-full rounded-t-3xl px-5 pt-6 pb-24 space-y-5 max-h-[90vh] overflow-y-auto">
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto -mt-1 mb-1" />

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Finalizar Serviço</h2>
            <button
              onClick={() => setMostrarModalConclusao(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Forma de pagamento */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Forma de pagamento</p>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS_PAGAMENTO.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setConclusaoForm(prev => ({ ...prev, forma_pagamento: f.value }))}
                  className={`py-3 px-3 rounded-xl text-sm font-medium border text-left transition-colors ${
                    conclusaoForm.forma_pagamento === f.value
                      ? 'ac-bg ac-text-tx ac-border'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Garantia */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Garantia <span className="font-normal text-gray-400">(opcional)</span></p>
            <div className="flex gap-2">
              <input
                type="number"
                className="input-field flex-1"
                placeholder="Ex: 3"
                min="1"
                value={conclusaoForm.garantia_valor}
                onChange={e => setConclusaoForm(prev => ({ ...prev, garantia_valor: e.target.value }))}
              />
              <select
                className="input-field w-32"
                value={conclusaoForm.garantia_unidade}
                onChange={e => setConclusaoForm(prev => ({ ...prev, garantia_unidade: e.target.value }))}
              >
                <option value="dias">Dias</option>
                <option value="meses">Meses</option>
                <option value="anos">Anos</option>
              </select>
            </div>
            {conclusaoForm.garantia_valor && parseInt(conclusaoForm.garantia_valor) > 0 && (
              <p className="text-xs text-gray-500 mt-1.5 pl-1">
                Vence em: {formatDate(calcularVencimento(parseInt(conclusaoForm.garantia_valor), conclusaoForm.garantia_unidade))}
              </p>
            )}
            <textarea
              className="input-field resize-none mt-2"
              rows={2}
              value={conclusaoForm.garantia_obs}
              onChange={e => setConclusaoForm(prev => ({ ...prev, garantia_obs: e.target.value }))}
              placeholder="Observações da garantia (ex: cobre peças e mão de obra)..."
            />
          </div>

          <button
            onClick={confirmarConclusao}
            disabled={atualizando}
            className="btn-primary"
          >
            {atualizando ? 'Salvando...' : '✔️ Confirmar Conclusão'}
          </button>
        </div>
      </div>
    )}
    </>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm ${highlight ? 'text-lg font-bold text-green-600' : 'text-gray-700'}`}>{value}</p>
    </div>
  )
}

function LaudoItem({ laudo, tecnico }) {
  const [baixando, setBaixando] = useState(false)

  async function handleBaixar() {
    setBaixando(true)
    try {
      const { compartilharLaudo } = await import('../lib/pdf')
      await compartilharLaudo({ laudo, tecnico })
    } finally {
      setBaixando(false)
    }
  }

  return (
    <button
      onClick={handleBaixar}
      disabled={baixando}
      className="w-full text-left rounded-xl border border-gray-100 px-3.5 py-3 flex items-center justify-between gap-3 active:bg-slate-50 transition-colors disabled:opacity-60"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {laudo.equipamento_tipo || 'Equipamento'}{laudo.equipamento_marca ? ` · ${laudo.equipamento_marca}` : ''}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(laudo.created_at)}</p>
      </div>
      {baixando
        ? <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin shrink-0" />
        : <span className="text-xs font-semibold shrink-0" style={{ color: 'rgb(var(--ac))' }}>📄 PDF</span>
      }
    </button>
  )
}
