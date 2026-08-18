export default function WizardProgress({ steps, currentIndex, onStepClick }) {
  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      <div className="flex items-center">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={i > currentIndex}
              onClick={() => onStepClick(i)}
              className="flex flex-col items-center gap-1 disabled:cursor-default"
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                  i === currentIndex
                    ? 'ac-bg text-white'
                    : i < currentIndex
                      ? 'ac-bg-lt ac-text'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i < currentIndex ? '✓' : i + 1}
              </span>
              <span className={`text-[10px] font-medium whitespace-nowrap ${i === currentIndex ? 'ac-text' : 'text-gray-400'}`}>
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentIndex ? 'ac-bg' : 'bg-gray-100'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
