import { BellIcon } from './icons'

// Sino de notificação do header — ver especificação técnica, seção 4.1.
// Ícone ~24px, dot de notificação 8px (state/notif #EF4444) sobreposto no
// canto superior-direito. O destino real do sino não é visível na imagem de
// referência (seção 08, lacunas em aberto) — aqui só emite onPress; quem usa
// o componente decide para onde ele leva.
export default function NotificationBell({ hasUnread = true, onPress }) {
  return (
    <button
      onClick={onPress}
      aria-label="Notificações"
      className="relative text-gray-800 active:scale-90 transition-transform"
    >
      <BellIcon className="w-6 h-6" />
      {hasUnread && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
      )}
    </button>
  )
}
