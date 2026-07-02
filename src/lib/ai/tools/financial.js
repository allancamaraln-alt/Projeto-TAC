export const FINANCIAL_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_expense',
      description: 'Registra uma despesa ou gasto do técnico.',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data no formato YYYY-MM-DD. Use a data atual se não informada.' },
          categoria: {
            type: 'string',
            enum: ['Combustível', 'Funcionário', 'Material/Peças', 'Alimentação', 'Ferramenta', 'Transporte', 'Outros'],
          },
          descricao: { type: 'string', description: 'Descrição breve do gasto.' },
          valor: { type: 'number', description: 'Valor em reais.' },
        },
        required: ['data', 'categoria', 'descricao', 'valor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_income',
      description: 'Registra uma receita ou pagamento recebido pelo técnico.',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data no formato YYYY-MM-DD.' },
          descricao: { type: 'string', description: 'Descrição da receita.' },
          valor: { type: 'number', description: 'Valor recebido em reais.' },
        },
        required: ['data', 'descricao', 'valor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_order_as_paid',
      description: 'Marca uma Ordem de Serviço como paga/concluída e registra a receita automaticamente.',
      parameters: {
        type: 'object',
        properties: {
          os_numero: { type: 'integer', description: 'Número da OS.' },
          valor: { type: 'number', description: 'Valor recebido. Se omitido, usa o valor registrado na OS.' },
        },
        required: ['os_numero'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_financial_summary',
      description: 'Retorna resumo financeiro (despesas, receitas, lucro) para um período. Use para qualquer consulta sobre o que o técnico gastou, recebeu ou lucrou.',
      parameters: {
        type: 'object',
        properties: {
          periodo: {
            type: 'string',
            enum: ['hoje', 'semana', 'mes', 'mes_anterior', 'personalizado'],
          },
          data_inicio: { type: 'string', description: 'YYYY-MM-DD. Obrigatório quando periodo=personalizado.' },
          data_fim: { type: 'string', description: 'YYYY-MM-DD. Obrigatório quando periodo=personalizado.' },
          categoria: { type: 'string', description: 'Filtrar por categoria específica (opcional).' },
        },
        required: ['periodo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pending_orders',
      description: 'Lista Ordens de Serviço com pagamento pendente (não concluídas e com valor > 0).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]
