import { memo, useMemo } from 'react'

// Formatação leve para as respostas do ClimaPro IA — o systemPrompt (ver
// src/lib/ai/systemPrompt.js) instrui o modelo a responder com listas de
// bullets ("•") e listas numeradas ("1. 2. 3.") para diagnósticos, códigos
// de erro e laudos. Sem isso, tudo saía como texto corrido (whitespace-pre-wrap
// só preserva quebras de linha, não estrutura visual). Cobre só os padrões que
// o próprio prompt pede — não é um parser de markdown genérico.
const BULLET_RE = /^[•\-*]\s+/
const NUMBERED_RE = /^\d+[.)]\s+/

function parseBlocks(text) {
  const lines = text.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^\s*$/.test(line)) { i++; continue }

    if (BULLET_RE.test(line)) {
      const items = []
      while (i < lines.length && BULLET_RE.test(lines[i])) {
        items.push(lines[i].replace(BULLET_RE, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    if (NUMBERED_RE.test(line)) {
      const items = []
      while (i < lines.length && NUMBERED_RE.test(lines[i])) {
        items.push(lines[i].replace(NUMBERED_RE, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    const para = []
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !BULLET_RE.test(lines[i]) && !NUMBERED_RE.test(lines[i])) {
      para.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', text: para.join('\n') })
  }

  return blocks
}

// Só **negrito** — é o único destaque inline que o modelo usa na prática.
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function MarkdownLite({ text }) {
  const blocks = useMemo(() => parseBlocks(text), [text])

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        if (block.type === 'ul') {
          return (
            <ul key={i} className="space-y-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="shrink-0" style={{ color: 'rgb(var(--ac))' }}>•</span>
                  <span className="whitespace-pre-wrap">{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          )
        }
        if (block.type === 'ol') {
          return (
            <ol key={i} className="space-y-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="shrink-0 font-semibold" style={{ color: 'rgb(var(--ac))' }}>{j + 1}.</span>
                  <span className="whitespace-pre-wrap">{renderInline(item)}</span>
                </li>
              ))}
            </ol>
          )
        }
        return <p key={i} className="whitespace-pre-wrap">{renderInline(block.text)}</p>
      })}
    </div>
  )
}

export default memo(MarkdownLite)
