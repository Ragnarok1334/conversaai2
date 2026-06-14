'use client'

import { Check } from 'lucide-react'

interface Props {
  currentStep: number
  setCurrentStep: (step: number) => void
}

const steps = [
  { id: 1, label: 'Negocio', desc: 'datos básicos' },
  { id: 2, label: 'Conocimiento', desc: 'información del negocio' },
  { id: 3, label: 'Comportamiento', desc: 'tono y reglas' },
  { id: 4, label: 'Canales', desc: 'dónde funcionará' },
  { id: 5, label: 'Revisión', desc: 'verificar y crear' },
]

export function BuilderProgress({ currentStep, setCurrentStep }: Props) {
  const currentStepData = steps.find(s => s.id === currentStep)

  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden sm:flex items-center justify-between max-w-3xl mx-auto w-full mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-white/[0.05] -z-10" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-brand-cyan -z-10 transition-all duration-500 ease-out" 
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step) => {
          const isCompleted = step.id < currentStep
          const isCurrent = step.id === currentStep
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 relative">
              <button
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-brand-cyan text-[#050816] shadow-[0_0_15px_rgba(34,211,238,0.4)] cursor-pointer' 
                    : isCurrent
                    ? 'bg-[#050816] border-2 border-brand-cyan text-brand-cyan shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                    : 'bg-[#050816] border-2 border-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.id}
              </button>
              <div className="absolute -bottom-8 flex flex-col items-center whitespace-nowrap">
                <span className={`text-xs font-medium transition-colors duration-300 ${
                  isCurrent ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {step.label}
                </span>
                <span className="text-[10px] text-slate-500 hidden md:block">{step.desc}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile Compact View */}
      <div className="sm:hidden w-full mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white">
            Paso {currentStep} de 5 <span className="text-slate-400 font-normal">— {currentStepData?.label}</span>
          </span>
        </div>
        <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-cyan transition-all duration-500 ease-out" 
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
