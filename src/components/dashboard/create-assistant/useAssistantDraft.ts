import { useState, useEffect } from 'react'
import { BuilderFormData, initialBuilderForm } from './types'

export function useAssistantDraft(userId: string) {
  const draftKey = `conversaai_create_assistant_draft_${userId}`
  
  const [form, setForm] = useState<BuilderFormData>(initialBuilderForm)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [isLoaded, setIsLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  // Load on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(draftKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.form) setForm(parsed.form)
        if (parsed.currentStep) setCurrentStep(parsed.currentStep)
        if (parsed.timestamp) setSavedAt(new Date(parsed.timestamp))
      }
    } catch (e) {
      console.error('Failed to load draft', e)
    } finally {
      setIsLoaded(true)
    }
  }, [draftKey])

  // Save on change
  useEffect(() => {
    if (!isLoaded) return
    
    const delayDebounceFn = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          form,
          currentStep,
          timestamp: new Date().toISOString()
        }))
        setSavedAt(new Date())
      } catch (e) {
        console.error('Failed to save draft', e)
      }
    }, 1000)

    return () => clearTimeout(delayDebounceFn)
  }, [form, currentStep, isLoaded, draftKey])

  const clearDraft = () => {
    localStorage.removeItem(draftKey)
    setForm(initialBuilderForm)
    setCurrentStep(1)
    setSavedAt(null)
  }

  return {
    form,
    setForm,
    currentStep,
    setCurrentStep,
    isLoaded,
    savedAt,
    clearDraft
  }
}
