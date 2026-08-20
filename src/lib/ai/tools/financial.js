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
      name: 'register_os_payment',
      description: 'Registra que um cliente pagou uma Ordem de Serviço, identificando-a pelo nome do cliente (não pelo número). Cobre tanto uma OS ainda não concluída (marca como concluída e paga em um passo) quanto uma OS já concluída com saldo pendente ("cobrança em aberto"/"em atraso"). Se o cliente tiver mais de uma OS com pagamento em aberto, a ferramenta retorna a lista delas em vez de adivinhar — pergunte ao usuário qual foi paga e chame de novo informando os_numero.',
      parameters: {
        type: 'object',
        properties: {
          cliente_nome: { type: 'string', description: 'Nome do cliente que pagou.' },
          os_numero: { type: 'integer', description: 'Número da OS específica — só informe quando já souber, por exemplo depois de perguntar ao usuário qual das OS em aberto foi paga.' },
          forma_pagamento: {
            type: 'string',
            enum: ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'outros'],
            description: 'Forma de pagamento. SEMPRE extraia da frase do usuário quando der pra identificar — ex: "pagou em dinheiro"/"no dinheiro" → dinheiro; "pagou no pix"/"via pix" → pix; "no cartão de crédito" → cartao_credito; "no débito" → cartao_debito. Só omita quando o usuário realmente não mencionar a forma.',
          },
        },
        required: ['cliente_nome'],
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
