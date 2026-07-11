// Ferramenta exclusiva do Modo Atendimento IA (ver src/lib/ai/atendimento.js).
// Só é registrada nessa sessão especial — o chat normal não a expõe.
export const ATENDIMENTO_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'log_atendimento_evento',
      description: 'Registra um evento narrado na linha do tempo do atendimento ao vivo. Use apenas para eventos que NÃO têm ferramenta de domínio própria (chegada ao local, observação geral, início de diagnóstico, peça trocada). Para pagamento, garantia/status ou laudo, chame só a ferramenta de domínio correspondente — o evento na linha do tempo é registrado automaticamente a partir dela.',
      parameters: {
        type: 'object',
        properties: {
          tipo: {
            type: 'string',
            enum: ['chegada', 'diagnostico', 'peca_trocada', 'observacao', 'outro'],
          },
          descricao: { type: 'string', description: 'Resumo curto (uma frase) do que foi narrado.' },
        },
        required: ['tipo', 'descricao'],
      },
    },
  },
]
