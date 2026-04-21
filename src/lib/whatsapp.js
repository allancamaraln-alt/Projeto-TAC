/**
 * Gera um link wa.me com mensagem de orçamento pré-formatada
 */
export function gerarLinkWhatsApp({ cliente, ordem, tecnico }) {
  const numero = cliente.telefone.replace(/\D/g, '')
  const numeroComDDI = numero.startsWith('55') ? numero : `55${numero}`

  const statusLabel = {
    orcamento: 'Orçamento',
    aprovado: 'Aprovado',
    em_andamento: 'Em andamento',
    concluido: 'Concluído',
  }

  const mensagem = `Olá ${cliente.nome}! 👋

*${statusLabel[ordem.status] || 'Orçamento'} - OS #${String(ordem.numero).padStart(3, '0')}*

🔧 Serviço: ${ordem.tipo_servico}
📍 Local: ${cliente.endereco}
💰 Valor: R$ ${Number(ordem.valor).toFixed(2).replace('.', ',')}

📝 ${ordem.descricao}${ordem.observacoes ? `\n\n📌 Obs: ${ordem.observacoes}` : ''}

Para aprovar, responda *SIM*.

— ${tecnico?.nome || 'Técnico'} | ${tecnico?.empresa || ''}`

  const mensagemEncoded = encodeURIComponent(mensagem)
  return `https://wa.me/${numeroComDDI}?text=${mensagemEncoded}`
}
