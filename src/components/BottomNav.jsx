import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

const tabs = [
  { to: '/', label: 'Início', icon: HomeIcon },
  { to: '/chat', label: 'Chat', icon: ChatIcon },
  { to: '/ordens', label: 'OS', icon: ClipboardIcon },
  { to: '/clientes', label: 'Clientes', icon: UsersIcon },
  { to: '/lembretes', label: 'Revisões', icon: BellIcon },
  { to: '/pmoc', label: 'PMOC', icon: PmocIcon },
  // "Mais" também fica aceso em /perfil, já que "Ver perfil" dentro de
  // Mais.jsx é o único jeito de chegar lá agora.
  { to: '/mais', label: 'Mais', icon: MoreIcon, extraActive: ['/perfil'] },
]

export default function BottomNav() {
  const [minimized, setMinimized] = useState(false)
  const lastStableY = useRef(0)
  const location = useLocation()

  useEffect(() => {
    function handleScroll(e) {
      const current = e.target.scrollTop ?? 0
      const diff = current - lastStableY.current

      if (diff > 60) {
        setMinimized(true)
        lastStableY.current = current
      } else if (diff < -30) {
        setMinimized(false)
        lastStableY.current = current
      }
    }

    document.addEventListener('scroll', handleScroll, { passive: true, capture: true })
    return () => document.removeEventListener('scroll', handleScroll, { capture: true })
  }, [])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white z-50"
      style={{
        boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-md mx-auto flex">
        {tabs.map((tab) => {
          const { to, label, extraActive } = tab
          const forcedActive = extraActive?.some(p => location.pathname.startsWith(p)) ?? false
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center transition-colors relative ${
                  minimized ? 'py-2' : 'py-2'
                } ${isActive || forcedActive ? 'ac-text' : 'text-gray-400'}`
              }
            >
              {({ isActive: navActive }) => {
                const isActive = navActive || forcedActive
                return (
                  <>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 ac-bg rounded-b-full" />
                    )}
                    <div
                      className={`rounded-xl transition-all duration-200 ${
                        isActive ? 'ac-bg-lt scale-105' : ''
                      } ${minimized ? 'p-1.5' : 'p-1.5'}`}
                    >
                      <tab.icon minimized={minimized} />
                    </div>
                    <span
                      className={`text-xs font-medium overflow-hidden transition-all duration-300 ease-in-out ${
                        isActive ? 'font-bold' : ''
                      } ${minimized ? 'max-h-0 opacity-0 mt-0' : 'max-h-4 opacity-100 mt-0.5'}`}
                    >
                      {label}
                    </span>
                  </>
                )
              }}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon({ minimized }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${minimized ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function ChatIcon({ minimized }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${minimized ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}

function ClipboardIcon({ minimized }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${minimized ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function UsersIcon({ minimized }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${minimized ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function BellIcon({ minimized }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${minimized ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function PmocIcon({ minimized }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${minimized ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function MoreIcon({ minimized }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${minimized ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
