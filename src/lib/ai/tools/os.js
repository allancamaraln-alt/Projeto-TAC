export const OS_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_os',
      description: 'Cria uma nova Ordem de Serviço (OS) para um cliente. Se o cliente informado ainda não existir, ele é cadastrado automaticamente pelo nome.',
      parameters: {
        type: 'object',
        properties: {
          cliente_nome: { type: 'string', description: 'Nome do cliente.' },
          tipo_servico: {
            type: 'string',
            enum: ['Instalação', 'Manutenção preventiva', 'Manutenção corretiva', 'Limpeza', 'Recarga de gás', 'Diagnóstico', 'Outro'],
          },
          descricao: { type: 'string', description: 'Descrição do serviço a ser realizado.' },
          valor: { type: 'number', description: 'Valor do serviço em reais. Use 0 se ainda não definido.' },
          data_agendamento: { type: 'string', description: 'Data no formato YYYY-MM-DD, se informada.' },
          hora_agendamento: { type: 'string', description: 'Hora no formato HH:MM, se informada.' },
          observacoes: { type: 'string', description: 'Observações internas, se houver.' },
          status: {
            type: 'string',
            enum: ['orcamento', 'aprovado', 'em_andamento', 'concluido', 'cancelado'],
            description: 'Status inicial da OS. Use "orcamento" se não especificado.',
          },
        },
        required: ['cliente_nome', 'tipo_servico', 'descricao', 'valor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_os',
      description: 'Atualiza campos de uma Ordem de Serviço já existente, identificada pelo número.',
      parameters: {
        type: 'object',
        properties: {
          os_numero: { type: 'integer', description: 'Número da OS a atualizar.' },
          tipo_servico: { type: 'string' },
          descricao: { type: 'string' },
          valor: { type: 'number' },
          data_agendamento: { type: 'string' },
          hora_agendamento: { type: 'string' },
          observacoes: { type: 'string' },
          status: { type: 'string', enum: ['orcamento', 'aprovado', 'em_andamento', 'concluido', 'cancelado'] },
        },
        required: ['os_numero'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_os',
      description: 'Busca os detalhes de uma Ordem de Serviço específica pelo número.',
      parameters: {
        type: 'object',
        properties: { os_numero: { type: 'integer' } },
        required: ['os_numero'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_os',
      description: 'Lista Ordens de Serviço do técnico, opcionalmente filtradas por status.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['orcamento', 'aprovado', 'em_andamento', 'concluido', 'cancelado'] },
          limit: { type: 'integer', description: 'Quantidade máxima de resultados. Padrão 15.' },
        },
        required: [],
      },
    },
  },
]
