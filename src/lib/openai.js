// Utilitários de UI para o ClimaPro IA
// A lógica de chamada à API está em src/lib/ai/

export function trimHistory(history, max = 20) {
  if (history.length <= max) return history
  return history.slice(history.length - max)
}

// ── Quick Actions ────────────────────────────────────────
// Cartões grandes da tela vazia do chat (variant="grid" em QuickActionChips).
// Cada um apenas inicia uma conversa (ou abre a captura de foto/voz do
// ChatComposer) — nunca navega para uma tela separada. type:'prompt' envia
// ou preenche um texto; type:'photo'/'voice' aciona o composer diretamente.
// `icon`/`color` são chaves lidas por QuickActionChips (ICON_MAP/COLOR_MAP).
export const QUICK_ACTIONS = [
  {
    type: 'prompt',
    icon: 'search',
    color: 'blue',
    title: 'Diagnosticar',
    description: 'descreva o defeito e receba o diagnóstico passo a passo',
    prompt: 'Preciso diagnosticar um defeito em um equipamento.',
    autoSend: true,
  },
  {
    type: 'prompt',
    icon: 'warning',
    color: 'amber',
    title: 'Código de erro',
    description: 'informe o código e entenda o que ele significa',
    prompt: 'Preciso interpretar um código de erro de um equipamento.',
    autoSend: true,
  },
  {
    type: 'photo',
    icon: 'camera',
    color: 'emerald',
    title: 'Analisar foto',
    description: 'envie uma foto do equipamento para análise da IA',
  },
  {
    type: 'voice',
    icon: 'mic',
    color: 'violet',
    title: 'Conversar por voz',
    description: 'fale o que aconteceu que a IA te entende',
  },
  {
    type: 'prompt',
    icon: 'document',
    color: 'blue',
    title: 'Gerar laudo',
    description: 'crie laudos técnicos profissionais em segundos',
    prompt: 'Gere um laudo técnico para: ',
    placeholder: 'Ex: Split 9.000 BTU com vazamento de gás R-410A...',
  },
  {
    type: 'prompt',
    icon: 'document',
    color: 'teal',
    title: 'Criar orçamento',
    description: 'monte orçamentos detalhados de forma rápida',
    prompt: 'Preciso criar uma Ordem de Serviço.',
    autoSend: true,
  },
  {
    type: 'prompt',
    icon: 'book',
    color: 'orange',
    title: 'Consultar manual',
    description: 'acesse manuais, tabelas e informações técnicas',
    prompt: 'Preciso consultar uma informação técnica: ',
  },
  {
    type: 'prompt',
    icon: 'dollar',
    color: 'rose',
    title: 'Registrar gasto',
    description: 'controle seus gastos com peças e deslocamentos',
    prompt: 'Quero registrar um gasto de hoje.',
    autoSend: true,
  },
]

// Tira de sugestões rápidas mostrada acima do composer quando já há
// conversa (variant="strip") — perguntas prontas de troubleshooting comum,
// diferente das categorias mais amplas do QUICK_ACTIONS acima. `icon`/`color`
// são chaves lidas por SuggestionsRow (ICON_MAP/COLOR_MAP).
export const AI_SUGGESTIONS = [
  { type: 'prompt', icon: 'snowflake', color: 'blue', label: 'Meu ar não gela', prompt: 'Meu ar-condicionado não está gelando.', autoSend: true },
  { type: 'prompt', icon: 'droplet', color: 'sky', label: 'Vazamento de água', prompt: 'Estou com vazamento de água no ar-condicionado.', autoSend: true },
  { type: 'prompt', icon: 'bolt', color: 'blue', label: 'Condensadora não liga', prompt: 'A condensadora não está ligando.', autoSend: true },
  { type: 'prompt', icon: 'wrench', color: 'slate', label: 'Como medir capacitor', prompt: 'Como eu meço um capacitor de ar-condicionado?', autoSend: true },
  { type: 'prompt', icon: 'ellipsis', color: 'slate', label: 'Mais sugestões', prompt: 'Me dê mais sugestões de perguntas que posso fazer sobre ar-condicionado.', autoSend: true },
]
