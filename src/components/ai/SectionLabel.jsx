// Label de seção ("Ações rápidas" / "Sugestões rápidas") — ver
// especificação técnica, seção 2.2 (tipografia): ~17px / peso 700 / lh 1.2.
export default function SectionLabel({ children }) {
  return (
    <p className="text-[17px] font-bold leading-[1.2] text-gray-900 mb-3">
      {children}
    </p>
  )
}
