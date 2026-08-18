export default function ExecucaoItemDetalhe({
  expanded, onToggleExpand,
  situacaoEncontrada, onSituacaoEncontradaChange,
  servicoExecutado, onServicoExecutadoChange,
  materiaisUtilizados, onMateriaisUtilizadosChange,
  proximaOverride, onProximaOverrideChange,
  fotos = [], onAddFotos, onRemoveFoto,
}) {
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={onToggleExpand}
        className="text-xs font-semibold ac-text flex items-center gap-1"
      >
        {expanded ? '– Ocultar detalhes' : '+ Adicionar detalhes'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 bg-gray-50 rounded-xl p-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Situação encontrada</label>
            <textarea className="input-field" rows={2} value={situacaoEncontrada} onChange={e => onSituacaoEncontradaChange(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Serviço executado</label>
            <textarea className="input-field" rows={2} value={servicoExecutado} onChange={e => onServicoExecutadoChange(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Materiais utilizados</label>
            <input className="input-field" value={materiaisUtilizados} onChange={e => onMateriaisUtilizadosChange(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Próxima manutenção (opcional)</label>
            <input type="date" className="input-field" value={proximaOverride} onChange={e => onProximaOverrideChange(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fotos</label>
            <div className="flex flex-wrap gap-2">
              {fotos.map((file, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemoveFoto(idx)}
                    className="absolute top-0 right-0 w-5 h-5 bg-black/60 text-white text-xs flex items-center justify-center"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xl cursor-pointer">
                +
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files.length) onAddFotos(Array.from(e.target.files)); e.target.value = '' }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
