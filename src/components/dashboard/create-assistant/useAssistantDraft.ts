import { useState, useEffect } from 'react'
import { BuilderFormData, initialBuilderForm } from './types'

function mergeWithInitialBuilderForm(storedForm: any): BuilderFormData {
  return {
    ...initialBuilderForm,
    ...storedForm,
    behavior: {
      ...initialBuilderForm.behavior,
      ...storedForm?.behavior,
      rules: {
        ...initialBuilderForm.behavior.rules,
        ...storedForm?.behavior?.rules
      }
    },
    channels: {
      ...initialBuilderForm.channels,
      ...storedForm?.channels,
      webchat: {
        ...initialBuilderForm.channels.webchat,
        ...storedForm?.channels?.webchat
      },
      telegram: {
        ...initialBuilderForm.channels.telegram,
        ...storedForm?.channels?.telegram
      },
      whatsapp: {
        ...initialBuilderForm.channels.whatsapp,
        ...storedForm?.channels?.whatsapp
      }
    },
    knowledgeBlocks: Array.isArray(storedForm?.knowledgeBlocks) ? storedForm.knowledgeBlocks : initialBuilderForm.knowledgeBlocks
  }
}

export function useAssistantDraft(
  userId: string,
  mode: 'create' | 'edit' = 'create',
  assistantId?: string,
  initialData?: BuilderFormData
) {
  const draftKey = mode === 'edit' && assistantId 
    ? `conversaai_edit_assistant_draft_${assistantId}` 
    : `conversaai_create_assistant_draft_${userId}`
    
  const baseForm = mode === 'edit' && initialData ? initialData : initialBuilderForm
  
  const [form, setForm] = useState<BuilderFormData>(baseForm)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [isLoaded, setIsLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(draftKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (mode === 'edit') {
           setHasUnsavedChanges(true)
        }
        if (parsed.form) {
          setForm(mergeWithInitialBuilderForm(parsed.form))
        }
        if (parsed.currentStep) setCurrentStep(parsed.currentStep)
        if (parsed.timestamp) setSavedAt(new Date(parsed.timestamp))
      }
    } catch (e) {
      console.error('Failed to load draft', e)
    } finally {
      setIsLoaded(true)
    }
  }, [draftKey, mode])

  // Save on change
  useEffect(() => {
    if (!isLoaded) return
    
    const delayDebounceFn = setTimeout(() => {
      try {
        // Strip sensitive data before saving to localStorage
        const sanitizedForm = {
          ...form,
          channels: {
            ...form.channels,
            telegram: { ...form.channels.telegram, token: '' }
          }
        }
        localStorage.setItem(draftKey, JSON.stringify({
          form: sanitizedForm,
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
    setForm(baseForm)
    setCurrentStep(1)
    setSavedAt(null)
  }

  const discardDraftAndLoadDB = () => {
    clearDraft()
    setHasUnsavedChanges(false)
  }

  return {
    form,
    setForm,
    currentStep,
    setCurrentStep,
    isLoaded,
    savedAt,
    clearDraft,
    hasUnsavedChanges,
    discardDraftAndLoadDB,
    setHasUnsavedChanges
  }
}
