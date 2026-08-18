export async function buscarCep(cepDigits) {
  const cep = (cepDigits || '').replace(/\D/g, '')
  if (cep.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return {
      rua: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
    }
  } catch {
    return null
  }
}
