export function googleMapsEmbedUrl(endereco) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(endereco)}&z=15&output=embed`
}

export function googleMapsUrl(endereco) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}&travelmode=driving`
}

export function wazeUrl(endereco) {
  return `https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`
}
