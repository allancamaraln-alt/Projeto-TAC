import jsPDF from 'jspdf'
import { formatOS, formatBRL, formatDate, formatTime, formatGarantia } from './format'
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
  doc.rect(margin, y + 0.5, 3, 7, 'F')

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE5)
  doc.text(label, margin + 5.5, y + 6.5)

  const lw = doc.getTextWidth(label)
  doc.setDrawColor(...SLATE2)
  doc.setLineWidth(0.25)
  doc.line(margin + 6.5 + lw, y + 4, margin + contentW, y + 4)

  return y + 16
}

// Label + value row
function infoRow(doc, label, value, y, margin) {
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE5)
  doc.text(label, margin, y)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE8)
  doc.text(String(value ?? '—'), margin + 34, y)

  return y + 11
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
  const HDR_H   = 50
  const HDR_IMG = 36  // zona decorativa ampliada — sem texto sobre a imagem

  if (coverImgData) {
    doc.addImage(coverImgData, 'JPEG', 0, 0, W, HDR_IMG)
    // Overlay branco sutil para tonalidade leve
    doc.setGState(doc.GState({ opacity: 0.35 }))
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, W, HDR_IMG, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))
  } else {
    const steps = HDR_IMG * 2
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

  // Barra de informações — linha única, fundo sólido
  doc.setFillColor(...ACCENT_DK)
  doc.rect(0, HDR_IMG, W, HDR_H - HDR_IMG, 'F')

  // Accent bottom stripe
  doc.setFillColor(...ACCENT_DK)
  doc.rect(0, HDR_H, W, 3.5, 'F')

  // ── LINHA ÚNICA: empresa | pill | · · · | data · OS
  const lineY = HDR_IMG + 9

  // Nome da empresa (esquerda)
  doc.setTextColor(...HDR_TEXT)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  const empresaStr = tecnico?.empresa || 'ClimaPro'
  doc.text(empresaStr, margin, lineY)
  const empresaW = doc.getTextWidth(empresaStr)

  // Pílula de status (logo após o nome)
  const statusLabel = STATUS_LABEL[ordem.status] || 'ORCAMENTO'
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const pillW = doc.getTextWidth(statusLabel) + 6
  const pillX = margin + empresaW + 4
  const pillTop = lineY - 5
  doc.setFillColor(...ACCENT)
  doc.roundedRect(pillX, pillTop, pillW, 5.5, 1, 1, 'F')
  doc.setTextColor(...HDR_TEXT)
  doc.text(statusLabel, pillX + pillW / 2, pillTop + 4, { align: 'center' })

  // Número da OS (direita)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...HDR_TEXT)
  doc.text(formatOS(ordem.numero), W - margin, lineY, { align: 'right' })
  const osW = doc.getTextWidth(formatOS(ordem.numero))

  // Data (separada por · antes do número da OS)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...HDR_SOFT)
  doc.text(formatDate(ordem.created_at) + '  ·  ', W - margin - osW, lineY, { align: 'right' })

  // ── DOCUMENT TITLE ─────────────────────────────────────────
  let y = HDR_H + 3.5 + 13

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text('Proposta de Serviço', margin, y)

  doc.setDrawColor(...SLATE2)
  doc.setLineWidth(0.35)
  doc.line(margin, y + 4, W - margin, y + 4)
  y += 14

  // ── CLIENTE ────────────────────────────────────────────────
  y = sectionHeader(doc, 'CLIENTE', y, margin, contentW, ACCENT)

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text(cliente.nome, margin, y)
  y += 10

  if (cliente.telefone) {
    y = infoRow(doc, 'Telefone:', cliente.telefone, y, margin)
  }
  if (cliente.endereco) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE5)
    doc.text('Endereço:', margin, y)
    const endLines = doc.splitTextToSize(cliente.endereco, contentW - 34)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE8)
    doc.text(endLines, margin + 34, y)
    y += Math.max(endLines.length * 8.5, 10) + 1
  }

  y += 10

  // ── SERVICO ────────────────────────────────────────────────
  y = sectionHeader(doc, 'SERVIÇO', y, margin, contentW, ACCENT)

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text(ordem.tipo_servico, margin, y)
  y += 10

  if (ordem.data_agendamento) {
    const agendTxt = ordem.hora_agendamento
      ? `${formatDate(ordem.data_agendamento)} as ${formatTime(ordem.hora_agendamento)}`
      : formatDate(ordem.data_agendamento)
    y = infoRow(doc, 'Agendamento:', agendTxt, y, margin)
  }

  if (ordem.descricao) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE5)
    doc.text('Descrição:', margin, y)
    y += 8.5
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE8)
    const descLines = doc.splitTextToSize(ordem.descricao, contentW)
    doc.text(descLines, margin, y)
    y += descLines.length * 8.5 + 2
  }

  y += 10

  // ── VALOR BOX ──────────────────────────────────────────────
  const boxY = Math.max(y + 4, 200)
  const boxH = 20

  // Light background
  doc.setFillColor(...ACCENT_LT)
  doc.roundedRect(margin, boxY, contentW, boxH, 3, 3, 'F')

  // Left accent strip (rounded only on left)
  doc.setFillColor(...ACCENT)
  doc.roundedRect(margin, boxY, 5, boxH, 3, 3, 'F')
  doc.rect(margin + 2, boxY, 3, boxH, 'F')

  // Label
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_DK)
  doc.text('TOTAL DO SERVIÇO', margin + 11, boxY + 12)

  // Value
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_DK)
  doc.text(formatBRL(ordem.valor), W - margin - 6, boxY + 13, { align: 'right' })

  // ── FOOTER ─────────────────────────────────────────────────
  const footerY = 276
  doc.setDrawColor(...SLATE2)
  doc.setLineWidth(0.4)
  doc.line(margin, footerY, W - margin, footerY)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text(tecnico?.nome || 'Técnico', margin, footerY + 7)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE5)
  if (tecnico?.empresa) doc.text(tecnico.empresa, margin, footerY + 13)
  if (tecnico?.telefone) doc.text(tecnico.telefone, W - margin, footerY + 7, { align: 'right' })

  doc.setFontSize(10)
  doc.setTextColor(...SLATE2)
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} via ClimaPro`,
    W / 2, footerY + 20,
    { align: 'center' }
  )

  return doc
}

const FORMA_PAGAMENTO_LABEL = {
  pix: 'Pix',
  dinheiro: 'Dinheiro / Espécie',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  outros: 'Outros',
}

// Helpers compactos usados apenas no recibo (espaçamento menor que no orçamento)
function rcHeader(doc, label, y, margin, contentW, ACCENT) {
  doc.setFillColor(...ACCENT)
  doc.rect(margin, y + 0.5, 3, 5.5, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE5)
  doc.text(label, margin + 5.5, y + 5)
  const lw = doc.getTextWidth(label)
  doc.setDrawColor(...SLATE2)
  doc.setLineWidth(0.25)
  doc.line(margin + 6.5 + lw, y + 3, margin + contentW, y + 3)
  return y + 11
}

function rcRow(doc, label, value, y, margin) {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE5)
  doc.text(label, margin, y)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE8)
  doc.text(String(value ?? '—'), margin + 30, y)
  return y + 9
}

export async function gerarReciboPDF({ cliente, ordem, tecnico }) {
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
  const HDR_H   = 50
  const HDR_IMG = 36  // zona decorativa ampliada — sem texto sobre a imagem

  const dataConclusao = ordem.data_conclusao
    ? formatDate(ordem.data_conclusao)
    : new Date().toLocaleDateString('pt-BR')

  if (coverImgData) {
    doc.addImage(coverImgData, 'JPEG', 0, 0, W, HDR_IMG)
    // Overlay branco sutil para tonalidade leve
    doc.setGState(doc.GState({ opacity: 0.35 }))
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, W, HDR_IMG, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))
  } else {
    const steps = HDR_IMG * 2
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

  // Barra de informações — linha única, fundo sólido
  doc.setFillColor(...ACCENT_DK)
  doc.rect(0, HDR_IMG, W, HDR_H - HDR_IMG, 'F')

  // Accent bottom stripe
  doc.setFillColor(...ACCENT_DK)
  doc.rect(0, HDR_H, W, 3.5, 'F')

  // ── LINHA ÚNICA: empresa | pill | · · · | data · OS
  const lineY = HDR_IMG + 9

  // Nome da empresa (esquerda)
  doc.setTextColor(...HDR_TEXT)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  const empresaStr = tecnico?.empresa || 'ClimaPro'
  doc.text(empresaStr, margin, lineY)
  const empresaW = doc.getTextWidth(empresaStr)

  // Pílula de status (logo após o nome)
  const pillLabel = 'CONCLUÍDO'
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const pillW = doc.getTextWidth(pillLabel) + 6
  const pillX = margin + empresaW + 4
  const pillTop = lineY - 5
  doc.setFillColor(...ACCENT)
  doc.roundedRect(pillX, pillTop, pillW, 5.5, 1, 1, 'F')
  doc.setTextColor(...HDR_TEXT)
  doc.text(pillLabel, pillX + pillW / 2, pillTop + 4, { align: 'center' })

  // Número da OS (direita)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...HDR_TEXT)
  doc.text(formatOS(ordem.numero), W - margin, lineY, { align: 'right' })
  const osW = doc.getTextWidth(formatOS(ordem.numero))

  // Data (separada por · antes do número da OS)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...HDR_SOFT)
  doc.text(dataConclusao + '  ·  ', W - margin - osW, lineY, { align: 'right' })

  // ── TITLE ──────────────────────────────────────────────────
  let y = HDR_H + 3.5 + 11

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text('Recibo de Serviço', margin, y)

  doc.setDrawColor(...SLATE2)
  doc.setLineWidth(0.35)
  doc.line(margin, y + 3.5, W - margin, y + 3.5)
  y += 11

  // ── CLIENTE ────────────────────────────────────────────────
  y = rcHeader(doc, 'CLIENTE', y, margin, contentW, ACCENT)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text(cliente.nome, margin, y)
  y += 8

  if (cliente.telefone) {
    y = rcRow(doc, 'Telefone:', cliente.telefone, y, margin)
  }
  if (cliente.endereco) {
    y = rcRow(doc, 'Endereço:', cliente.endereco, y, margin)
  }

  y += 5

  // ── SERVIÇO ────────────────────────────────────────────────
  y = rcHeader(doc, 'SERVIÇO', y, margin, contentW, ACCENT)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text(ordem.tipo_servico, margin, y)
  y += 8

  if (ordem.descricao) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE5)
    const descLines = doc.splitTextToSize(ordem.descricao, contentW)
    doc.text(descLines, margin, y)
    y += descLines.length * 7 + 2
  }

  y += 5

  // ── PAGAMENTO ──────────────────────────────────────────────
  y = rcHeader(doc, 'PAGAMENTO', y, margin, contentW, ACCENT)

  if (ordem.forma_pagamento) {
    y = rcRow(doc, 'Forma:', FORMA_PAGAMENTO_LABEL[ordem.forma_pagamento] || 'Outros', y, margin)
  }
  y = rcRow(doc, 'Data:', dataConclusao, y, margin)

  y += 5

  // ── GARANTIA ───────────────────────────────────────────────
  if (ordem.garantia_valor) {
    y = rcHeader(doc, 'GARANTIA', y, margin, contentW, ACCENT)
    y = rcRow(doc, 'Período:', formatGarantia(ordem.garantia_valor, ordem.garantia_unidade), y, margin)
    if (ordem.garantia_vencimento) {
      y = rcRow(doc, 'Válida até:', formatDate(ordem.garantia_vencimento), y, margin)
    }
    if (ordem.garantia_obs) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...SLATE5)
      const obsLines = doc.splitTextToSize(ordem.garantia_obs, contentW)
      doc.text(obsLines, margin, y)
      y += obsLines.length * 7 + 2
    }
    y += 5
  }

  // ── VALOR BOX ──────────────────────────────────────────────
  const boxY = y + 6
  const boxH = 20

  doc.setFillColor(...ACCENT_LT)
  doc.roundedRect(margin, boxY, contentW, boxH, 3, 3, 'F')

  doc.setFillColor(...ACCENT)
  doc.roundedRect(margin, boxY, 5, boxH, 3, 3, 'F')
  doc.rect(margin + 2, boxY, 3, boxH, 'F')

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_DK)
  doc.text('VALOR PAGO', margin + 11, boxY + 12)

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_DK)
  doc.text(formatBRL(ordem.valor), W - margin - 6, boxY + 13, { align: 'right' })

  // ── ASSINATURAS ────────────────────────────────────────────
  const sigW = 72
  const sigH = 22
  const PAGE_H = 297
  const BOTTOM_MARGIN = 30
  // espaço necessário do fim do box até o rodapé: imagem + gap + labels + footer
  const sigSpaceNeeded = sigH + 10 + 29

  let sigY
  if (boxY + boxH + sigSpaceNeeded > PAGE_H - BOTTOM_MARGIN) {
    doc.addPage()
    sigY = 50 + sigH
  } else {
    sigY = boxY + boxH + sigH + 10
  }

  async function addSigImage(url, x) {
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      const b64 = await new Promise(res => {
        const reader = new FileReader()
        reader.onloadend = () => res(reader.result)
        reader.readAsDataURL(blob)
      })
      doc.addImage(b64, 'PNG', x, sigY - sigH, sigW, sigH)
    } catch { /* sem imagem, usa linha em branco */ }
  }

  if (ordem.assinatura_cliente_url) await addSigImage(ordem.assinatura_cliente_url, margin)
  if (ordem.assinatura_tecnico_url) await addSigImage(ordem.assinatura_tecnico_url, W - margin - sigW)

  doc.setDrawColor(...SLATE5)
  doc.setLineWidth(0.4)
  doc.line(margin, sigY, margin + sigW, sigY)
  doc.line(W - margin - sigW, sigY, W - margin, sigY)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  const clienteNome = doc.splitTextToSize(cliente.nome, sigW)[0]
  const tecnicoNome = doc.splitTextToSize(tecnico?.nome || 'Prestador', sigW)[0]
  doc.text(clienteNome, margin + sigW / 2, sigY + 6, { align: 'center' })
  doc.text(tecnicoNome, W - margin - sigW / 2, sigY + 6, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE5)
  doc.text('Assinatura do Cliente', margin + sigW / 2, sigY + 11, { align: 'center' })
  doc.text('Assinatura do Prestador', W - margin - sigW / 2, sigY + 11, { align: 'center' })

  // ── FOOTER ─────────────────────────────────────────────────
  const footerY = sigY + 22
  doc.setDrawColor(...SLATE2)
  doc.setLineWidth(0.4)
  doc.line(margin, footerY, W - margin, footerY)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE2)
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} via ClimaPro`,
    W / 2, footerY + 7,
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
          title: `Orçamento ${formatOS(ordem.numero)} - ${cliente.nome}`,
          text: `Olá ${cliente.nome}, segue o orçamento ${formatOS(ordem.numero)} para *${ordem.tipo_servico}*.`,
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
    `Olá ${cliente.nome}! Segue em anexo o orçamento ${formatOS(ordem.numero)}` +
    ` para *${ordem.tipo_servico}*.\n\n` +
    `Valor: *${formatBRL(ordem.valor)}*\n\n` +
    `Para aprovar, responda *SIM*.\n\n` +
    `-- ${tecnico?.nome || 'Técnico'}${tecnico?.empresa ? ` | ${tecnico.empresa}` : ''}`
  )
  window.open(`https://wa.me/${ddi}?text=${msg}`, '_blank')

  return { ok: true, modo: 'download' }
}
