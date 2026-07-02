import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setPromptEvent(e)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setPromptEvent(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!promptEvent) return false
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setPromptEvent(null)
    }
    return outcome === 'accepted'
  }

  return { promptEvent, isInstalled, install }
}
