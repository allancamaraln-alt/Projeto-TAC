import { getGreeting } from '../../lib/ai/dashboardStats'
import { SnowflakeIcon } from './icons'

// GreetingHeroCard — ver especificação técnica, seção 4.2. Gradiente
// #0D2F5E → #1E63C9 (135°), radius 28-32px, padding ~20-24px.
//
// Sem mascote — foi removido a pedido (nenhuma das tentativas de robô
// ilustrado ficou com acabamento à altura do resto do card).
export default function GreetingHero({ firstName }) {
  const greeting = getGreeting()

  return (
    <div
      className="relative overflow-hidden rounded-[30px] mb-4 animate-fade-up"
      style={{ background: 'linear-gradient(135deg, #0D2F5E 0%, #1E63C9 100%)' }}
    >
      <SnowflakeIcon className="absolute -top-6 right-2 w-40 h-40 text-white opacity-[0.06] pointer-events-none rotate-12" />

      <div className="relative px-6 pt-6 pb-6">
        <h2 className="text-2xl font-extrabold leading-[1.15] tracking-tight text-white">
          {greeting}, <span className="text-[#7DD3FC]">{firstName || 'técnico'}</span>! <span className="inline-block">👋</span>
        </h2>
        {/* Duas linhas separadas (em vez de um parágrafo que quebra sozinho) para
            garantir que a quebra fique sempre entre "Assistente IA" e "especialista",
            sem risco de cortar no meio de "ar-condicionado". */}
        <p className="text-[17px] font-bold leading-[1.3] text-white mt-2">
          Sou seu <span className="text-[#7DD3FC]">Assistente IA</span>
        </p>
        <p className="text-[17px] font-bold leading-[1.3] text-white">
          especialista em ar-condicionado.
        </p>
        <p className="text-[13px] leading-[1.4] text-white/70 mt-3">
          Descreva o problema ou envie uma foto que eu te ajudo.
        </p>
      </div>
    </div>
  )
}
