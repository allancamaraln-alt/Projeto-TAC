import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { openWhatsApp } from '../lib/whatsapp'
import { Card, IconTile, ListRow } from '../components/ui/kit'

const VERSAO = 'v1.0.0'

// Aba "Mais" da bottom nav — cartão do usuário, tema, indique e ganhe,
// suporte/privacidade e sair. "Ver perfil" leva para os dados profissionais
// e a assinatura em Perfil.jsx (/perfil), que continua existindo à parte.
export default function Mais() {
  const { profile, signOut } = useAuth()
  const { isDark, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="page-container">
      <div className="space-y-4 px-4 pt-6 pb-2">
        {/* cartão do usuário */}
        <Card className="relative overflow-hidden p-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgb(var(--ac) / 0.18), transparent 60%)' }}
          />
          <div className="relative flex items-center gap-4">
            <div className="shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-[68px] w-[68px] rounded-full object-cover" />
              ) : (
                <div className="grid h-[68px] w-[68px] place-items-center rounded-full text-[28px] font-bold text-white" style={{ background: 'linear-gradient(135deg, rgb(var(--ac)), rgb(var(--ac-dk)))' }}>
                  {(profile?.nome || 'T').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[19px] font-bold text-gray-800">{profile?.nome || 'Técnico'}</p>
              {profile?.empresa && <p className="truncate text-[14px] text-gray-400">{profile.empresa}</p>}
              <button
                onClick={() => navigate('/perfil')}
                className="ac-bg-lt ac-text mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold transition active:scale-[0.97]"
              >
                <IconUserCircle className="h-4 w-4" />
                Ver perfil
                <IconChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Card>

        {/* tema */}
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconTile size={44} radius={16} className="bg-gray-100 text-gray-500" icon={<span className="text-lg leading-none">{isDark ? '🌙' : '☀️'}</span>} />
            <div>
              <p className="text-sm font-semibold text-gray-700">Tema escuro</p>
              <p className="text-xs text-gray-400">{isDark ? 'Ativado' : 'Desativado'}</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${isDark ? 'ac-bg' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </Card>

        {/* indique e ganhe */}
        <button
          onClick={() => navigate('/afiliados')}
          className="flex w-full items-center gap-3.5 rounded-[20px] p-4 text-left transition active:scale-[0.99] bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100"
        >
          <IconTile size={44} radius={16} className="bg-amber-100" icon={<span className="text-lg leading-none">💸</span>} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-amber-800">Indique e Ganhe</span>
            <span className="block truncate text-xs text-amber-600">20% de comissão por indicado ativo</span>
          </span>
          <IconChevronRight className="h-5 w-5 shrink-0 text-amber-400" />
        </button>

        {/* menu */}
        <Card className="overflow-hidden">
          <ListRow
            icon={<IconWhatsAppFilled className="w-[18px] h-[18px]" />}
            tileClassName="bg-emerald-50"
            title="Suporte"
            subtitle="Fale com a gente pelo WhatsApp"
            onClick={() => openWhatsApp('Olá! Sou usuário do ClimaPro e preciso de suporte.')}
            action={<IconChevronRight className="w-4 h-4 text-gray-300" />}
          />
          <ListRow
            icon={<IconShield className="w-[18px] h-[18px]" />}
            tileClassName="bg-gray-100 text-gray-500"
            title="Política de Privacidade"
            onClick={() => navigate('/privacidade')}
            action={<IconChevronRight className="w-4 h-4 text-gray-300" />}
            divider
          />
        </Card>

        <p className="text-center text-xs text-gray-300 pb-1">ClimaPro {VERSAO}</p>

        <button type="button" onClick={signOut} className="w-full text-center text-red-400 font-semibold py-3">
          Sair da conta
        </button>
      </div>
    </div>
  )
}

function IconUserCircle({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

function IconChevronRight({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function IconWhatsAppFilled({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="#25D366">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.15h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 012.41 5.83c0 4.55-3.7 8.24-8.24 8.24z"/>
    </svg>
  )
}

function IconShield({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
    </svg>
  )
}
