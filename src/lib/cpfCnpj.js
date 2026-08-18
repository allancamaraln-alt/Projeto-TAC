/** Remove tudo que não for dígito. */
const onlyDigits = (v) => (v ?? '').replace(/\D/g, '')

/** 123.456.789-01 ou 12.345.678/0001-95, conforme o número de dígitos. */
export function maskCpfCnpj(value) {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function validarCPF(cpf) {
  if (/^(\d)\1{10}$/.test(cpf)) return false
  let soma = 0
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== Number(cpf[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  return resto === Number(cpf[10])
}

function validarCNPJ(cnpj) {
  if (/^(\d)\1{13}$/.test(cnpj)) return false
  const calcularDigito = (base) => {
    const pesos = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const soma = base.split('').reduce((acc, digito, i) => acc + Number(digito) * pesos[i], 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  const digito1 = calcularDigito(cnpj.slice(0, 12))
  if (digito1 !== Number(cnpj[12])) return false
  const digito2 = calcularDigito(cnpj.slice(0, 12) + digito1)
  return digito2 === Number(cnpj[13])
}

/** Valida dígitos verificadores de CPF (11 dígitos) ou CNPJ (14 dígitos). */
export function isValidCpfCnpj(value) {
  const d = onlyDigits(value)
  if (d.length === 11) return validarCPF(d)
  if (d.length === 14) return validarCNPJ(d)
  return false
}

/** Dígitos puros, prontos para enviar à API do Asaas. */
export const stripCpfCnpj = onlyDigits
