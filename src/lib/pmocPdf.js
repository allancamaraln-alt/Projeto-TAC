import jsPDF from 'jspdf'
import { formatDate } from './format'
import { extractPalette } from './palette'
import { PERIODICIDADES, REGISTRO_TIPOS, TIPOS_ESTABELECIMENTO, CAPACIDADE_UNIDADES } from './pmocTemplates'

function labelDe(lista, value) {
  return lista.find(o => o.value === value)?.label || value || '—'
}

// Helpers de layout próprios deste módulo — deliberadamente não importados
// de src/lib/pdf.js, para manter o PMOC isolado do resto do sistema de PDF
// (Orçamento/Recibo/Laudo), que não deve ser tocado por este módulo.

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
const AMBER    = [217, 119, 6]
const AMBER_LT = [254, 243, 199]

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

// Posição do valor é calculada a partir da largura real do rótulo (não um
// deslocamento fixo) — rótulos como "Registro profissional:" são mais
// largos que os 40mm fixos de antes e ficavam sobrepostos ao valor. O
// valor também quebra em várias linhas quando não cabe no restante da
// largura útil (ex: endereço longo), em vez de vazar para fora da página.
function infoRow(doc, label, value, y, margin, contentW) {
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE5)
  doc.text(label, margin, y)
  const labelW = doc.getTextWidth(label)
  const valueX = margin + Math.max(40, labelW + 4)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE8)
  const maxW = Math.max(20, margin + contentW - valueX)
  const lines = doc.splitTextToSize(String(value ?? '—'), maxW)
  doc.text(lines, valueX, y)

  return y + Math.max(lines.length * 7, 9)
}

function textBlock(doc, text, y, margin, contentW) {
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE8)
  const lines = doc.splitTextToSize(text, contentW)
  doc.text(lines, margin, y)
  return y + lines.length * 6.5 + 2
}

function pageBreak(doc, y, needed = 20) {
  if (y + needed > 275) { doc.addPage(); return 22 }
  return y
}

export async function gerarPmocPDF({ pmoc, cliente, estabelecimento, equipamentos, itens, execucoes, execucaoItens, tecnico }) {
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

  const HDR_H   = 50
  const HDR_IMG = 36

  function drawHeaderFooter(pillLabel) {
    if (coverImgData) {
      doc.addImage(coverImgData, 'JPEG', 0, 0, W, HDR_IMG)
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

    doc.setFillColor(...ACCENT_DK)
    doc.rect(0, HDR_IMG, W, HDR_H - HDR_IMG, 'F')
    doc.rect(0, HDR_H, W, 3.5, 'F')

    const lineY = HDR_IMG + 9

    doc.setTextColor(...HDR_TEXT)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    const empresaStr = tecnico?.empresa || 'ClimaPro'
    doc.text(empresaStr, margin, lineY)
    const empresaW = doc.getTextWidth(empresaStr)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    const pillW = doc.getTextWidth(pillLabel) + 6
    const pillX = margin + empresaW + 4
    const pillTop = lineY - 5
    doc.setFillColor(...ACCENT)
    doc.roundedRect(pillX, pillTop, pillW, 5.5, 1, 1, 'F')
    doc.setTextColor(...HDR_TEXT)
    doc.text(pillLabel, pillX + pillW / 2, pillTop + 4, { align: 'center' })

    const dataStr = new Date().toLocaleDateString('pt-BR')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...HDR_SOFT)
    doc.text(dataStr, W - margin, lineY, { align: 'right' })
  }

  function drawFooter() {
    const footerY = 282
    doc.setDrawColor(...SLATE2)
    doc.setLineWidth(0.4)
    doc.line(margin, footerY, W - margin, footerY)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE2)
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} via ClimaPro`,
      W / 2, footerY + 6,
      { align: 'center' }
    )
  }

  drawHeaderFooter('PMOC')

  let y = HDR_H + 3.5 + 13
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text('Plano de Manutenção, Operação e Controle', margin, y)

  doc.setDrawColor(...SLATE2)
  doc.setLineWidth(0.35)
  doc.line(margin, y + 4, W - margin, y + 4)
  y += 14

  // ── IDENTIFICAÇÃO ──────────────────────────────────────────
  y = sectionHeader(doc, 'IDENTIFICAÇÃO', y, margin, contentW, ACCENT)
  y = infoRow(doc, 'Cliente:', cliente?.nome, y, margin, contentW)
  y = infoRow(doc, 'Responsável técnico:', pmoc.responsavel_tecnico || tecnico?.nome, y, margin, contentW)
  if (pmoc.registro_tipo) {
    y = infoRow(doc, 'Registro profissional:', `${labelDe(REGISTRO_TIPOS, pmoc.registro_tipo)} ${pmoc.registro_numero || ''}`.trim(), y, margin, contentW)
  }
  if (pmoc.art_trt) y = infoRow(doc, 'ART/TRT:', pmoc.art_trt, y, margin, contentW)
  y = infoRow(doc, 'Início do plano:', formatDate(pmoc.data_inicio), y, margin, contentW)
  y += 4
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...SLATE5)
  doc.text('Base legal: Portaria GM/MS nº 3.523/1998 · RE ANVISA 09/2003 · NBR 13971', margin, y)
  y += 10

  // ── ESTABELECIMENTO ────────────────────────────────────────
  y = pageBreak(doc, y, 30)
  y = sectionHeader(doc, 'ESTABELECIMENTO', y, margin, contentW, ACCENT)
  if (!estabelecimento || !estabelecimento.nome) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...SLATE5)
    doc.text('Estabelecimento não informado.', margin, y)
    y += 8
  } else {
    y = infoRow(doc, 'Nome:', estabelecimento.nome, y, margin, contentW)
    if (estabelecimento.cnpj_cpf) y = infoRow(doc, 'CNPJ/CPF:', estabelecimento.cnpj_cpf, y, margin, contentW)
    const enderecoStr = [
      estabelecimento.rua && `${estabelecimento.rua}${estabelecimento.numero ? ', ' + estabelecimento.numero : ''}`,
      estabelecimento.complemento,
      estabelecimento.bairro,
      estabelecimento.cidade && estabelecimento.estado ? `${estabelecimento.cidade}/${estabelecimento.estado}` : estabelecimento.cidade,
      estabelecimento.cep,
    ].filter(Boolean).join(' — ')
    if (enderecoStr) {
      y = pageBreak(doc, y, 16)
      y = infoRow(doc, 'Endereço:', enderecoStr, y, margin, contentW)
    }
    if (estabelecimento.tipo_estabelecimento) y = infoRow(doc, 'Tipo:', labelDe(TIPOS_ESTABELECIMENTO, estabelecimento.tipo_estabelecimento), y, margin, contentW)
    if (estabelecimento.area_climatizada_m2) y = infoRow(doc, 'Área climatizada:', `${estabelecimento.area_climatizada_m2} m²`, y, margin, contentW)
    if (estabelecimento.qtd_ambientes) y = infoRow(doc, 'Qtd. de ambientes:', estabelecimento.qtd_ambientes, y, margin, contentW)
  }
  y += 6

  // ── EQUIPAMENTOS INSTALADOS ────────────────────────────────
  y = pageBreak(doc, y, 30)
  y = sectionHeader(doc, 'EQUIPAMENTOS INSTALADOS', y, margin, contentW, ACCENT)
  if (equipamentos.length === 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...SLATE5)
    doc.text('Nenhum equipamento cadastrado.', margin, y)
    y += 8
  } else {
    for (const eq of equipamentos) {
      y = pageBreak(doc, y, 14)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...SLATE8)
      doc.text(`${eq.tag || eq.codigo_interno || eq.tipo || 'Equipamento'}${eq.tipo ? ' — ' + eq.tipo : ''}`, margin, y)
      y += 5.5
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...SLATE5)
      const capacidadeStr = eq.capacidade_valor ? `${eq.capacidade_valor} ${labelDe(CAPACIDADE_UNIDADES, eq.capacidade_unidade)}` : null
      const linha2 = [
        eq.fabricante || eq.modelo ? `${eq.fabricante} ${eq.modelo}`.trim() : null,
        capacidadeStr ? `Cap.: ${capacidadeStr}` : null,
        eq.numero_serie ? `Série: ${eq.numero_serie}` : null,
        eq.codigo_interno ? `Código: ${eq.codigo_interno}` : null,
        eq.localizacao ? `Local: ${eq.localizacao}` : null,
        eq.status ? `Status: ${eq.status}` : null,
      ].filter(Boolean).join('   ·   ')
      const linhas = doc.splitTextToSize(linha2 || '—', contentW)
      doc.text(linhas, margin, y)
      y += linhas.length * 5 + 4
    }
  }
  y += 4

  // ── PLANO DE MANUTENÇÃO (cronograma) ───────────────────────
  y = pageBreak(doc, y, 30)
  y = sectionHeader(doc, 'PLANO DE MANUTENÇÃO', y, margin, contentW, ACCENT)
  const itensAtivos = itens.filter(i => i.ativo)
  if (itensAtivos.length === 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...SLATE5)
    doc.text('Nenhum item de plano cadastrado.', margin, y)
    y += 8
  } else {
    for (const per of PERIODICIDADES) {
      const doGrupo = itensAtivos.filter(i => i.periodicidade === per.value)
      if (doGrupo.length === 0) continue
      y = pageBreak(doc, y, 14)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...ACCENT_DK)
      doc.text(per.label.toUpperCase(), margin, y)
      y += 6
      for (const item of doGrupo) {
        y = pageBreak(doc, y, 7)
        const eqTag = equipamentos.find(e => e.id === item.equipamento_id)
        const eqLabel = eqTag ? (eqTag.tag || eqTag.tipo || 'Equip.') : ''
        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...SLATE8)
        const linha = doc.splitTextToSize(`•  ${item.descricao}${eqLabel ? '  —  ' + eqLabel : ''}`, contentW - 4)
        doc.text(linha, margin + 4, y)
        y += linha.length * 5
      }
      y += 3
    }
  }
  y += 4

  // ── HISTÓRICO DE EXECUÇÕES ─────────────────────────────────
  y = pageBreak(doc, y, 30)
  y = sectionHeader(doc, 'HISTÓRICO DE EXECUÇÕES', y, margin, contentW, ACCENT)
  const execsOrdenadas = [...execucoes].sort((a, b) => b.data.localeCompare(a.data))
  if (execsOrdenadas.length === 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...SLATE5)
    doc.text('Nenhuma execução registrada.', margin, y)
    y += 8
  } else {
    for (const exec of execsOrdenadas) {
      const itensVisita = execucaoItens.filter(ei => ei.execucao_id === exec.id)
      y = pageBreak(doc, y, 16)

      doc.setFontSize(10.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...SLATE8)
      doc.text(formatDate(exec.data), margin, y)

      const nOk = itensVisita.filter(i => i.situacao === 'ok').length
      const nNaoOk = itensVisita.filter(i => i.situacao === 'nao_ok').length
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...SLATE5)
      doc.text(`${nOk} OK${nNaoOk > 0 ? `  ·  ${nNaoOk} com problema` : ''}`, W - margin, y, { align: 'right' })
      y += 6

      if (exec.observacoes) {
        y = textBlock(doc, exec.observacoes, y, margin + 4, contentW - 4)
      }

      for (const ei of itensVisita) {
        y = pageBreak(doc, y, 7)
        const destacar = ei.situacao === 'nao_ok'
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...(destacar ? AMBER : SLATE5))
        const statusTxt = ei.situacao === 'ok' ? 'OK' : ei.situacao === 'nao_ok' ? 'NÃO OK' : 'N/A'
        const detalhesExtra = [
          ei.situacao_encontrada && `Situação encontrada: ${ei.situacao_encontrada}`,
          ei.servico_executado && `Serviço executado: ${ei.servico_executado}`,
          ei.materiais_utilizados && `Materiais: ${ei.materiais_utilizados}`,
        ].filter(Boolean).join('  ·  ')
        const textoCompleto = `[${statusTxt}] ${ei.descricao}${ei.observacao ? ' — ' + ei.observacao : ''}${detalhesExtra ? ' — ' + detalhesExtra : ''}`
        const linha = doc.splitTextToSize(textoCompleto, contentW - 4)
        if (destacar) {
          doc.setFillColor(...AMBER_LT)
          doc.rect(margin, y - 4, contentW, linha.length * 5 + 2, 'F')
        }
        doc.text(linha, margin + 4, y)
        y += linha.length * 5
      }
      y += 5
    }
  }

  // ── ASSINATURA ──────────────────────────────────────────────
  y = pageBreak(doc, y, 40)
  const sigW = 72
  doc.setDrawColor(...SLATE5)
  doc.setLineWidth(0.4)
  doc.line(W / 2 - sigW / 2, y, W / 2 + sigW / 2, y)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SLATE8)
  doc.text(pmoc.responsavel_tecnico || tecnico?.nome || 'Técnico', W / 2, y + 6, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE5)
  doc.text('Responsável Técnico', W / 2, y + 11, { align: 'center' })

  // Rodapé em todas as páginas
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter()
  }

  return doc
}

export async function compartilharPmocPDF(dados) {
  const doc = await gerarPmocPDF(dados)
  const clientePrimeiro = dados.cliente?.nome?.split(' ')[0] || 'PMOC'
  const data = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
  const nomeArquivo = `PMOC-${clientePrimeiro}-${data}.pdf`

  if (typeof navigator.canShare === 'function') {
    const blob = doc.output('blob')
    const file = new File([blob], nomeArquivo, { type: 'application/pdf' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: nomeArquivo })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }
  }

  doc.save(nomeArquivo)
}
