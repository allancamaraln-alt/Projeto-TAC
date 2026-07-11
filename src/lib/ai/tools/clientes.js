export const CLIENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'find_or_create_client',
      description: 'Busca um cliente pelo nome; se não existir, cria um novo. Use quando o usuário quiser cadastrar/confirmar dados de contato de um cliente sem necessariamente criar uma OS agora (create_os já cadastra o cliente sozinho quando necessário).',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome do cliente.' },
          telefone: { type: 'string', description: 'Telefone do cliente, se informado.' },
          endereco: { type: 'string', description: 'Endereço do cliente, se informado.' },
        },
        required: ['nome'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_client',
      description: 'Atualiza telefone e/ou endereço de um cliente já cadastrado.',
      parameters: {
        type: 'object',
        properties: {
          cliente_nome: { type: 'string', description: 'Nome (ou parte do nome) do cliente a atualizar.' },
          telefone: { type: 'string' },
          endereco: { type: 'string' },
        },
        required: ['cliente_nome'],
      },
    },
  },
]
