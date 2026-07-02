import { useState, useEffect } from 'react'
import { usePWAInstall } from '../hooks/usePWAInstall'

const DISMISSED_KEY = 'climapro_install_dismissed'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

export default function InstallPrompt() {
  const { promptEvent, isInstalled, install } = usePWAInstall()
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)

  const ios = isIOS()
  const showForIOS = ios && isSafari() && !window.navigator.standalone

  useEffect(() => {
    if (isInstalled) return
    if (localStorage.getItem(DISMISSED_KEY)) return

    // Mostra após 4 segundos no app
    const timer = setTimeout(() => {
      if (promptEvent || showForIOS) setVisible(true)
    }, 4000)

    return () => clearTimeout(timer)
  }, [promptEvent, isInstalled, showForIOS])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  async function handleInstall() {
    setInstalling(true)
    await install()
    setInstalling(false)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[500] animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-2xl">❄️</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight">Adicionar ClimaPro à tela inicial</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {ios
                  ? 'Acesse mais rápido como um app instalado, sem precisar abrir o navegador.'
                  : 'Acesse mais rápido, funciona offline e ocupa menos espaço que um app normal.'}
              </p>
            </div>
            <button
              onClick={dismiss}
              className="text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0 -mt-0.5"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {ios ? (
            <div className="mt-3 bg-sky-50 rounded-xl p-3">
              <p className="text-xs text-sky-800 font-semibold mb-1.5">Como instalar no iPhone/iPad:</p>
              <ol className="text-xs text-sky-700 space-y-1">
                <li className="flex items-center gap-1.5">
                  <span className="font-bold text-sky-500">1.</span>
                  Toque em
                  <svg className="w-4 h-4 inline text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <strong>Compartilhar</strong> no Safari
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="font-bold text-sky-500">2.</span>
                  Selecione <strong>"Adicionar à Tela de Início"</strong>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="font-bold text-sky-500">3.</span>
                  Toque em <strong>Adicionar</strong>
                </li>
              </ol>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                onClick={dismiss}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Agora não
              </button>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 transition-colors disabled:opacity-70"
              >
                {installing ? 'Instalando...' : 'Instalar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
