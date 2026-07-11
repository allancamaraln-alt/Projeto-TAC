// Utilitários de UI para o ClimaPro IA
// A lógica de chamada à API está em src/lib/ai/

export function trimHistory(history, max = 20) {
  if (history.length <= max) return history
  return history.slice(history.length - max)
}

// ── Quick Actions ────────────────────────────────────────
// Cada chip apenas inicia uma conversa (ou abre a captura de foto/voz do
// ChatComposer) — nunca navega para uma tela separada. type:'prompt' envia
// ou preenche um texto; type:'photo'/'voice' aciona o composer diretamente.
export const QUICK_ACTIONS = [
  {
    type: 'prompt',
    label: '🔍 Diagnosticar defeito',
    prompt: 'Preciso diagnosticar um defeito em um equipamento.',
    autoSend: true,
  },
  {
    type: 'prompt',
    label: '⚠️ Código de erro',
    prompt: 'Preciso interpretar um código de erro de um equipamento.',
    autoSend: true,
  },
  {
    type: 'prompt',
    label: '📄 Gerar laudo',
    prompt: 'Gere um laudo técnico para: ',
    placeholder: 'Ex: Split 9.000 BTU com vazamento de gás R-410A...',
  },
  {
    type: 'prompt',
    label: '💰 Registrar gasto',
    prompt: 'Quero registrar um gasto de hoje.',
    autoSend: true,
  },
  {
    type: 'prompt',
    label: '📊 Relatório financeiro',
    prompt: 'Me dê um resumo dos meus gastos e receitas deste mês.',
    autoSend: true,
  },
  {
    type: 'prompt',
    label: '📋 Criar OS',
    prompt: 'Preciso criar uma Ordem de Serviço.',
    autoSend: true,
  },
  {
    type: 'photo',
    label: '📷 Analisar foto',
  },
  {
    type: 'voice',
    label: '🎤 Conversar por voz',
  },
]
