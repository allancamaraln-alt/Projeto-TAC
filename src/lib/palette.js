// Extrai a cor dominante da região superior da imagem e monta uma paleta
export async function extractPalette(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 60
      canvas.height = 20
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, img.width, img.height * 0.45, 0, 0, 60, 20)
      const { data } = ctx.getImageData(0, 0, 60, 20)

      let r = 0, g = 0, b = 0, n = 0
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2]
        if (pr > 235 && pg > 235 && pb > 235) continue // ignora quase-branco
        if (pr < 20  && pg < 20  && pb < 20)  continue // ignora quase-preto
        r += pr; g += pg; b += pb; n++
      }

      if (n < 5) { resolve(null); return }

      r = Math.round(r / n)
      g = Math.round(g / n)
      b = Math.round(b / n)

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      const isDark = lum < 0.52

      resolve({
        main:     [r, g, b],
        dark:     [Math.round(r * 0.72), Math.round(g * 0.72), Math.round(b * 0.72)],
        light:    [
          Math.min(255, Math.round(r + (255 - r) * 0.65)),
          Math.min(255, Math.round(g + (255 - g) * 0.65)),
          Math.min(255, Math.round(b + (255 - b) * 0.65)),
        ],
        text:     isDark ? [255, 255, 255] : [30, 41, 59],
        textSoft: isDark
          ? [
              Math.min(255, Math.round(r + (255 - r) * 0.65)),
              Math.min(255, Math.round(g + (255 - g) * 0.65)),
              Math.min(255, Math.round(b + (255 - b) * 0.65)),
            ]
          : [80, 96, 115],
      })
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// Injeta a paleta como CSS custom properties no :root.
// Passa null para restaurar os valores padrão (azul sky).
export function applyPalette(palette) {
  const root = document.documentElement
  if (!palette) {
    root.style.removeProperty('--ac')
    root.style.removeProperty('--ac-dk')
    root.style.removeProperty('--ac-lt')
    root.style.removeProperty('--ac-tx')
    root.style.removeProperty('--ac-sf')
    return
  }
  const fmt = ([r, g, b]) => `${r} ${g} ${b}`
  root.style.setProperty('--ac',    fmt(palette.main))
  root.style.setProperty('--ac-dk', fmt(palette.dark))
  root.style.setProperty('--ac-lt', fmt(palette.light))
  root.style.setProperty('--ac-tx', fmt(palette.text))
  root.style.setProperty('--ac-sf', fmt(palette.textSoft))
}
