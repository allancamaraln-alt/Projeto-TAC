import jsPDF from 'jspdf'
import { formatOS, formatBRL, formatDate, formatTime } from './format'
import { extractPalette } from './palette'

async function loadImageAsBase64(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

const clamp = v => Math.max(0, Math.min(255, Math.round(v)))

const SKY    = [2, 132, 199]
const SKY_DK = [3, 105, 161]
const SKY_LT = [186, 230, 253]
const WHITE  = [255, 255, 255]
const SLATE8 = [30, 41, 59]
const SLATE5 = [100, 116, 139]
const SLATE2 = [226, 232, 240]

const STATUS_LABEL = {
  orcamento:    'ORÇAMENTO',
  aprovado:     'APROVADO',
  em_andamento: 'EM ANDAMENTO',
  concluido:    'CONCLUÍDO',
}

// Section heading: left accent bar + label + right rule
function sectionHeader(doc, label, y, margin, contentW, ACCENT) {
  doc.setFillColor(...ACCENT)
  doc.rect(margin, y + 0.5, 3, 5, 'F')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE5)
  doc.text(label, margin + 5.5, y + 4.5)

  const lw = doc.getTextWidth(label)
  doc.setDrawColor(...SLATE2)
  doc.setLineWidth(0.25)
  doc.line(margin + 6.5 + lw, y + 3, margin + contentW, y + 3)

  return y + 12
}

// Label + value row
function infoRow(doc, label, value, y, margin) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE5)
  doc.text(label, margin, y)

  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE8)
  doc.text(String(value ?? '—'), margin + 34, y)

  return y + 7
}

export async function gerarOrcamentoPDF({ cliente, ordem, tecnico }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W = 210
  const margin = 18
  const contentW = W - margin * 2

  const coverImgData = tecnico?.cover_url ? await loadImageAsBase64(tecnico.cover_url) : null
  const palette   = coverImgData ? await extractPalette(coverImgData) : null
  const ACCENT    = palette?.main     ?? SKY
  const ACCENT_DK = palette?.dark     ?? SKY_DK
  const ACCENT_LT = palette?.light    ?? SKY_LT
  const HDR_TEXT  = palette?.text     ?? WHITE
  const HDR_SOFT  = palette?.textSoft ?? SKY_LT

  // ── HEADER ─────────────────────────────────────────────────
  const HDR_H = 50

  if (coverImgData) {
    doc.addImage(coverImgData, 'JPEG', 0, 0, W, HDR_H)
  } else {
    const steps = HDR_H * 2
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      doc.setFillColor(
        clamp(ACCENT[0] + (ACCENT_DK[0] - ACCENT[0]) * t),
        clamp(ACCENT[1] + (ACCENT_DK[1] - ACCENT[1]) * t),
        clamp(ACCENT[2] + (ACCENT_DK[2] - ACCENT[2]) * t)
      )
      doc.rect(0, i * 0.5, W, 0.6, 'F')
    }
  }

  // Accent bottom stripe
  doc.setFillColor(...ACCENT_DK)
  doc.rect(0, HDR_H, W, 3.5, 'F')

  // ── BRAND (left) ───────────────────────────────────────────
  doc.setTextColor(...HDR_TEXT)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(tecnico?.empresa || 'ClimaPro', margin, 19)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...HDR_SOFT)
  doc.text('Servicos de Ar-Condicionado e Refrigeracao', margin, 27)

  // ── OS + STATUS (right) ────────────────────────────────────
  doc.setTextColor(...HDR_TEXT)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(formatOS(ordem.numero), W - margin, 18, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...HDR_SOFT)
  doc.text(formatDate(ordem.created_at), W - margin, 26, { align: 'right' })

  // Status pill
  const statusLabel = STATUS_LABEL[ordem.status] || 'ORCAMENTO'
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  const pillW = doc.getTextWidth(statusLabel) + 8
  const pillX = W - margin - pillW
  const pillY = 30
  doc.setFillColor(...ACCENT_DK)
  doc.roundedRect(pillX, pillY, pillW, 5.5, 1.5, 1.5, 'F')
  doc.setTextColor(...HDR_TEXT)
  doc.text(statusLabel, pillX + pillW / 2, pillY + 3.8, { align: 'center' })

  // ── DOCUMENT TITLE ─────────────────────────────────────────
  let y = HDR_H + 3.5 + 13

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text('Proposta de Servico', margin, y)

  doc.setDrawColor(...SLATE2)
  doc.setLineWidth(0.35)
  doc.line(margin, y + 4, W - margin, y + 4)
  y += 14

  // ── CLIENTE ────────────────────────────────────────────────
  y = sectionHeader(doc, 'CLIENTE', y, margin, contentW, ACCENT)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text(cliente.nome, margin, y)
  y += 8

  if (cliente.telefone) {
    y = infoRow(doc, 'Telefone:', cliente.telefone, y, margin)
  }
  if (cliente.endereco) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE5)
    doc.text('Endereco:', margin, y)
    const endLines = doc.splitTextToSize(cliente.endereco, contentW - 34)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE8)
    doc.text(endLines, margin + 34, y)
    y += Math.max(endLines.length * 5.5, 6) + 1
  }

  y += 10

  // ── SERVICO ────────────────────────────────────────────────
  y = sectionHeader(doc, 'SERVICO', y, margin, contentW, ACCENT)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text(ordem.tipo_servico, margin, y)
  y += 8

  if (ordem.data_agendamento) {
    const agendTxt = ordem.hora_agendamento
      ? `${formatDate(ordem.data_agendamento)} as ${formatTime(ordem.hora_agendamento)}`
      : formatDate(ordem.data_agendamento)
    y = infoRow(doc, 'Agendamento:', agendTxt, y, margin)
  }

  if (ordem.descricao) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE5)
    doc.text('Descricao:', margin, y)
    y += 5.5
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE8)
    const descLines = doc.splitTextToSize(ordem.descricao, contentW)
    doc.text(descLines, margin, y)
    y += descLines.length * 5.5 + 2
  }

  y += 10

  // ── OBSERVACOES ────────────────────────────────────────────
  if (ordem.observacoes) {
    y = sectionHeader(doc, 'OBSERVACOES', y, margin, contentW, ACCENT)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE8)
    const obsLines = doc.splitTextToSize(ordem.observacoes, contentW)
    doc.text(obsLines, margin, y)
    y += obsLines.length * 5.5 + 10
  }

  // ── VALOR BOX ──────────────────────────────────────────────
  const boxY = Math.max(y + 4, 200)
  const boxH = 17

  // Light background
  doc.setFillColor(...ACCENT_LT)
  doc.roundedRect(margin, boxY, contentW, boxH, 3, 3, 'F')

  // Left accent strip (rounded only on left)
  doc.setFillColor(...ACCENT)
  doc.roundedRect(margin, boxY, 5, boxH, 3, 3, 'F')
  doc.rect(margin + 2, boxY, 3, boxH, 'F')

  // Label
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_DK)
  doc.text('TOTAL DO SERVIÇO', margin + 11, boxY + 10.5)

  // Value
  doc.setFontSize(17)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_DK)
  doc.text(formatBRL(ordem.valor), W - margin - 6, boxY + 11.5, { align: 'right' })

  // ── FOOTER ─────────────────────────────────────────────────
  const footerY = 276
  doc.setDrawColor(...SLATE2)
  doc.setLineWidth(0.4)
  doc.line(margin, footerY, W - margin, footerY)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text(tecnico?.nome || 'Tecnico', margin, footerY + 7)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE5)
  if (tecnico?.empresa) doc.text(tecnico.empresa, margin, footerY + 13)
  if (tecnico?.telefone) doc.text(tecnico.telefone, W - margin, footerY + 7, { align: 'right' })

  doc.setFontSize(7)
  doc.setTextColor(...SLATE2)
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} via ClimaPro`,
    W / 2, footerY + 19,
    { align: 'center' }
  )

  return doc
}

export async function compartilharOrcamento({ cliente, ordem, tecnico }) {
  const doc = await gerarOrcamentoPDF({ cliente, ordem, tecnico })
  const nomeArquivo = `Orcamento-${formatOS(ordem.numero)}-${cliente.nome.split(' ')[0]}.pdf`

  if (typeof navigator.canShare === 'function') {
    const blob = doc.output('blob')
    const file = new File([blob], nomeArquivo, { type: 'application/pdf' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Orcamento ${formatOS(ordem.numero)} - ${cliente.nome}`,
          text: `Ola ${cliente.nome}, segue o orcamento ${formatOS(ordem.numero)} para *${ordem.tipo_servico}*.`,
        })
        return { ok: true, modo: 'share' }
      } catch (err) {
        if (err.name === 'AbortError') return { ok: false, modo: 'cancelado' }
      }
    }
  }

  doc.save(nomeArquivo)

  const numero = cliente.telefone.replace(/\D/g, '')
  const ddi = numero.startsWith('55') ? numero : `55${numero}`
  const msg = encodeURIComponent(
    `Ola ${cliente.nome}! Segue em anexo o orcamento ${formatOS(ordem.numero)}` +
    ` para *${ordem.tipo_servico}*.\n\n` +
    `Valor: *${formatBRL(ordem.valor)}*\n\n` +
    `Para aprovar, responda *SIM*.\n\n` +
    `-- ${tecnico?.nome || 'Tecnico'}${tecnico?.empresa ? ` | ${tecnico.empresa}` : ''}`
  )
  window.open(`https://wa.me/${ddi}?text=${msg}`, '_blank')

  return { ok: true, modo: 'download' }
}
