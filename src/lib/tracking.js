const STORAGE_KEY = 'climapro_tracking'

function readCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

// A Utmify carrega seu próprio pixel (index.html) que guarda os parâmetros
// de origem em localStorage('lead').parameters. Usamos isso como fallback
// quando o usuário navega para uma página sem querystring.
function readUtmifyLead() {
  try {
    const lead = JSON.parse(localStorage.getItem('lead') || 'null')
    if (lead?.parameters) return new URLSearchParams(lead.parameters)
  } catch {}
  return null
}

/**
 * Captura fbclid/fbc/fbp/UTMs da URL atual + cookies do Meta Pixel e faz merge
 * com o que já estiver salvo em localStorage, sem nunca sobrescrever um valor
 * existente por um valor vazio (ex: ao navegar da Landing para /entrar sem querystring).
 */
export function captureTracking() {
  const urlParams = new URLSearchParams(window.location.search)
  const leadParams = readUtmifyLead()
  const pick = (key) => urlParams.get(key) || leadParams?.get(key) || null

  const fbclid = pick('fbclid')
  const fbcCookie = readCookie('_fbc')
  const fbpCookie = readCookie('_fbp')
  // Se o cookie _fbc ainda não existir (pixel assíncrono não terminou de carregar),
  // derivamos o valor no formato exigido pela Meta CAPI: fb.1.<timestamp>.<fbclid>
  const fbc = fbcCookie || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null)

  const incoming = {
    fbclid,
    fbc,
    fbp: fbpCookie || null,
    utm_source: pick('utm_source'),
    utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
    utm_content: pick('utm_content'),
    utm_term: pick('utm_term'),
    src: pick('src'),
    sck: pick('sck'),
  }

  let stored = {}
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {}

  const merged = { ...stored }
  for (const [key, value] of Object.entries(incoming)) {
    if (value) merged[key] = value
  }

  // entry_url/referrer são de "primeiro toque": diferente dos campos acima,
  // window.location.href muda a cada página da SPA, então só gravamos uma vez
  // (na primeira captura) para preservar a URL/origem real de entrada do usuário.
  if (!merged.entry_url) merged.entry_url = window.location.href
  if (!merged.referrer && document.referrer) merged.referrer = document.referrer

  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  console.log('[tracking] captureTracking:', merged)
  return merged
}

/**
 * Ponto único usado no momento do cadastro/checkout. Sempre recaptura (o merge
 * é seguro/idempotente) para pegar cookies do Meta Pixel que possam ter sido
 * setados depois da primeira visita.
 */
export function getTracking() {
  return captureTracking()
}
