import { AssistantForm } from '@/components/dashboard/AssistantForm'

export default function CreateAssistantPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Crear asistente de IA</h1>
        <p className="text-text-soft">Configura tu asistente y pruébalo en tiempo real antes de guardarlo.</p>
      </div>
      <AssistantForm />
    </div>
  )
}
