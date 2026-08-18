import { useState } from 'react'
import { maskCpfCnpj, isValidCpfCnpj, stripCpfCnpj } from '../lib/cpfCnpj'

/** Pede CPF/CNPJ antes de iniciar um pagamento no Asaas (exigência do gateway). */
export default function CpfModal({ onConfirmar, onClose }) {
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!isValidCpfCnpj(valor)) {
      setErro('CPF ou CNPJ inválido')
      return
    }
    onConfirmar(stripCpfCnpj(valor))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800">Confirme seu CPF ou CNPJ</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Exigido para processar o pagamento com segurança.</p>
        <input
          type="text"
          inputMode="numeric"
          autoFocus
          value={valor}
          onChange={e => { setValor(maskCpfCnpj(e.target.value)); setErro('') }}
          placeholder="000.000.000-00"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        {erro && <p className="text-xs text-red-500 mb-3">{erro}</p>}
        <button
          type="submit"
          className="w-full py-3 rounded-xl text-sm font-bold text-white mt-3"
          style={{ background: 'rgb(var(--ac))' }}
        >
          Continuar
        </button>
      </form>
    </div>
  )
}
