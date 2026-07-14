// Número oficial do WhatsApp de Suporte do ClimaPro (DDI+DDD+número, sem símbolos)
export const SUPPORT_PHONE = '64993010651'

/**
 * Abre o WhatsApp (app no celular ou WhatsApp Web no desktop) com o número de
 * suporte do ClimaPro e uma mensagem pré-preenchida.
 */
export function openWhatsApp(message) {
  const url = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

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

📝 ${ordem.descricao}

Para aprovar, responda *SIM*.

— ${tecnico?.nome || 'Técnico'} | ${tecnico?.empresa || ''}`

  const mensagemEncoded = encodeURIComponent(mensagem)
  return `https://wa.me/${numeroComDDI}?text=${mensagemEncoded}`
}
