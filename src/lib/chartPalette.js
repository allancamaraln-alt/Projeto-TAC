// Paleta categórica validada (skill dataviz — validate_palette.js, PASS em
// lightness/chroma/CVD, 8 slots, ordem fixa). Mapeamento nome → cor é FIXO por
// entidade (nunca por posição/rank), para a mesma categoria manter sempre a
// mesma cor mesmo depois de aplicar um filtro que muda a ordem/contagem.
const CATEGORICAL = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834']
const CINZA = '#898781'

export const ORIGEM_COLORS = {
  Facebook: CATEGORICAL[0],
  Instagram: CATEGORICAL[4],
  Google: CATEGORICAL[2],
  Direto: CATEGORICAL[3],
  'Orgânico': CATEGORICAL[1],
  Outros: CINZA,
}

export const DISPOSITIVO_COLORS = {
  Desktop: CATEGORICAL[0],
  Android: CATEGORICAL[1],
  iPhone: CATEGORICAL[4],
  Tablet: CATEGORICAL[2],
  Desconhecido: CINZA,
  Outros: CINZA,
}

export const NAVEGADOR_COLORS = {
  Chrome: CATEGORICAL[0],
  Safari: CATEGORICAL[1],
  Edge: CATEGORICAL[2],
  Firefox: CATEGORICAL[7],
  'Facebook In-App Browser': CATEGORICAL[4],
  'Instagram In-App Browser': CATEGORICAL[6],
  Desconhecido: CINZA,
  Outros: CINZA,
}

// Status (fixo, nunca reaproveitado para série categórica)
export const STATUS_COLORS = { success: '#0ca30c', partial: '#fab219', error: '#d03b3b', failed: '#d03b3b' }
