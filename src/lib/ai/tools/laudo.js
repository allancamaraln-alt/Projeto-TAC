export const LAUDO_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'generate_laudo',
      description: 'Gera e salva um laudo técnico profissional com base nas informações fornecidas pelo usuário. Use assim que tiver ao menos o defeito relatado, o diagnóstico e o serviço executado (demais campos podem ficar vazios).',
      parameters: {
        type: 'object',
        properties: {
          os_numero: { type: 'integer', description: 'Número da OS relacionada, se houver (vincula o laudo e promove os dados de equipamento para a OS).' },
          cliente_nome: { type: 'string' },
          equipamento_tipo: { type: 'string', description: 'Ex: Split, Janela, Portátil, Central, VRF, Chiller, Câmara fria.' },
          equipamento_marca: { type: 'string' },
          equipamento_modelo: { type: 'string' },
          equipamento_capacidade: { type: 'string', description: 'Ex: 9.000 BTU.' },
          equipamento_fluido: { type: 'string', description: 'Ex: R-410A, R-32, R-22, R-134a, R-290, R-404A.' },
          numero_serie: { type: 'string' },
          defeito_relatado: { type: 'string' },
          diagnostico: { type: 'string' },
          servicos_executados: { type: 'string' },
          pecas_utilizadas: { type: 'string' },
          recomendacoes: { type: 'string' },
          conclusao: { type: 'string' },
        },
        required: ['defeito_relatado', 'diagnostico', 'servicos_executados'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_laudo',
      description: 'Busca um laudo técnico já salvo pelo id.',
      parameters: {
        type: 'object',
        properties: { laudo_id: { type: 'string' } },
        required: ['laudo_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_laudos_by_os',
      description: 'Lista os laudos técnicos já gerados para uma Ordem de Serviço.',
      parameters: {
        type: 'object',
        properties: { os_numero: { type: 'integer' } },
        required: ['os_numero'],
      },
    },
  },
]
