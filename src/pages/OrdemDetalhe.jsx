import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatOS, formatBRL, formatDate, formatTime } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import ModalLembrete from '../components/ModalLembrete'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../hooks/useToast'

const PROXIMOS_STATUS = {
  orcamento:    { label: '✅ Marcar como Aprovado', next: 'aprovado' },
  aprovado:     { label: '🔧 Iniciar Execução', next: 'em_andamento' },
  em_andamento: { label: '✔️ Marcar como Concluído', next: 'concluido' },
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
  const toast = useToast()
  const coverInputRef = useRef()
  const [os, setOs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

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
  const [mostrarLembrete, setMostrarLembrete] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null, danger: false })

  useEffect(() => {
    supabase
      .from('ordens_servico')
      .select('*, clientes(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => { setOs(data); setLoading(false) })
  }, [id])

  async function avancarStatus() {
    const proximo = PROXIMOS_STATUS[os.status]
    if (!proximo) return
    setAtualizando(true)
    const { error } = await supabase
      .from('ordens_servico')
      .update({ status: proximo.next })
      .eq('id', id)
    if (!error) {
      setOs(prev => ({ ...prev, status: proximo.next }))
      toast('Status atualizado!')
      if (proximo.next === 'concluido') setMostrarLembrete(true)
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

  async function enviarWhatsApp() {
    setEnviando(true)
    try {
      const { gerarOrcamentoPDF } = await import('../lib/pdf')
      const doc = await gerarOrcamentoPDF({ cliente: os.clientes, ordem: os, tecnico: profile })

      const nome = `Orcamento-${formatOS(os.numero)}-${os.clientes?.nome?.split(' ')[0]}.pdf`
      const blob = doc.output('blob')
      const file = new File([blob], nome, { type: 'application/pdf' })

      // Envia o PDF como arquivo via compartilhamento nativo (Android/iOS)
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Orçamento ${formatOS(os.numero)} — ${os.clientes?.nome}`,
          })
          return
        } catch (err) {
          if (err.name === 'AbortError') return
          // Se falhou por outro motivo, cai no fallback abaixo
        }
      }

      // Fallback (desktop ou browser sem suporte): baixa PDF + abre WhatsApp com texto
      const telefone = (os.clientes?.telefone || '').replace(/\D/g, '')
      const ddi = telefone.startsWith('55') ? telefone : `55${telefone}`
      const msg = encodeURIComponent(
        `Olá ${os.clientes?.nome}! Segue em anexo o orçamento ${formatOS(os.numero)}` +
        ` para *${os.tipo_servico}*.\n\n` +
        `Valor: *${formatBRL(os.valor)}*\n\n` +
        `Para aprovar, responda *SIM*.\n\n` +
        `-- ${profile?.nome || 'Técnico'}${profile?.empresa ? ` | ${profile.empresa}` : ''}`
      )
      doc.save(nome)
      window.open(`https://wa.me/${ddi}?text=${msg}`, '_blank')
    } finally {
      setEnviando(false)
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
        <div
          className="relative rounded-2xl overflow-hidden h-28 flex items-center px-4 justify-between"
          style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
        >
          {profile?.cover_url && (
            <>
              <img
                src={profile.cover_url}
                alt="Capa"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
            </>
          )}

          {/* Botão alterar capa */}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="absolute top-2.5 right-3 z-20 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1 active:bg-black/50 transition-colors"
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

          <div className="relative z-10">
            <p className="text-white font-extrabold text-base leading-tight drop-shadow">
              {profile?.empresa || profile?.nome || 'ClimaPro'}
            </p>
            <p className="text-white/70 text-xs mt-0.5 drop-shadow">Prévia do cabeçalho do PDF</p>
          </div>
          <div className="relative z-10 text-right">
            <p className="text-white font-bold text-lg font-mono drop-shadow">{formatOS(os.numero)}</p>
            <p className="text-white/70 text-xs drop-shadow">{formatDate(os.created_at)}</p>
          </div>
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

        {/* Botão Enviar pelo WhatsApp */}
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
              <span>Enviar pelo WhatsApp</span>
            </>
          )}
        </button>

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
          {os.data_agendamento && (
            <Row
              label="Agendamento"
              value={`${formatDate(os.data_agendamento)}${os.hora_agendamento ? ` às ${formatTime(os.hora_agendamento)}` : ''}`}
            />
          )}
          {os.descricao && <Row label="Descrição" value={os.descricao} />}
          {os.observacoes && <Row label="Observações" value={os.observacoes} />}
          <div>
            <p className="text-xs text-gray-400">Criado em</p>
            <p className="text-sm text-gray-600">{formatDate(os.created_at)}</p>
          </div>
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

    <ConfirmModal
      open={confirm.open}
      title={confirm.title}
      message={confirm.message}
      confirmLabel="Confirmar"
      danger={confirm.danger}
      onConfirm={confirm.action ?? (() => {})}
      onClose={() => setConfirm(c => ({ ...c, open: false }))}
    />
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
