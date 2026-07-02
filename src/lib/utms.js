export function getUtms() {
  try {
    const lead = JSON.parse(localStorage.getItem('lead') || 'null')
    if (lead?.parameters) {
      const params = new URLSearchParams(lead.parameters)
      return {
        utm_source: params.get('utm_source'),
        utm_campaign: params.get('utm_campaign'),
        utm_medium: params.get('utm_medium'),
        utm_content: params.get('utm_content'),
        utm_term: params.get('utm_term'),
        src: params.get('src'),
        sck: params.get('sck'),
      }
    }
  } catch {}
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source'),
    utm_campaign: params.get('utm_campaign'),
    utm_medium: params.get('utm_medium'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    src: params.get('src'),
    sck: params.get('sck'),
  }
}
