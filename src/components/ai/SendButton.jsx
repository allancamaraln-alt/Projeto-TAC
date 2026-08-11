import { SendIcon } from './icons'

// Botão de enviar do composer — ver especificação técnica, seção 4.5.
// Diâmetro ~56-60px, sempre visível (não alterna com o mic), opacidade
// reduzida quando não há o que enviar em vez de sumir da tela.
export default function SendButton({ onPress, disabled }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      aria-label="Enviar"
      className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center bg-[#1E63C9] text-white active:scale-90 transition-all ${
        disabled ? 'opacity-40' : 'shadow-lg shadow-[#1E63C9]/30'
      }`}
    >
      <SendIcon className="w-5 h-5" />
    </button>
  )
}
