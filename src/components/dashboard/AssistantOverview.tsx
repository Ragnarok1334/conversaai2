import { Activity, CheckCircle2, Circle, MessageCircle, Target, TestTube2, Users } from 'lucide-react'
import Link from 'next/link'

interface Props {
  assistantId: string
  health: any
  conversationsCount: number
  leadsCount: number
  blocksCount: number
  isCustomized: boolean
  hasDomain: boolean
  isDetected: boolean
  tests: Array<{ id: string; user_message: string; assistant_reply: string; created_at: string }>
}

export function AssistantOverview({ assistantId, health, conversationsCount, leadsCount, blocksCount, isCustomized, hasDomain, isDetected, tests }: Props) {
  const steps = [
    { label: 'Conocimiento', detail: `${blocksCount} secciones`, done: blocksCount > 0 },
    { label: 'Apariencia', detail: isCustomized ? 'Lista' : 'Pendiente', done: isCustomized },
    { label: 'Dominio', detail: hasDomain ? 'Autorizado' : 'Pendiente', done: hasDomain },
    { label: 'Instalación', detail: isDetected ? 'Detectada' : 'Pendiente', done: isDetected },
  ]
  const next = !steps[0].done
    ? { label: 'Completar conocimiento', href: `?tab=knowledge` }
    : !isCustomized ? { label: 'Personalizar Web Chat', href: `?tab=webchat` }
      : !hasDomain ? { label: 'Autorizar dominio', href: `?tab=install` }
        : !isDetected ? { label: 'Instalar Web Chat', href: `?tab=install` }
          : { label: 'Ver conversaciones', href: `/dashboard/conversations?assistantId=${assistantId}` }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-card-border bg-card-bg/75 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Estado de publicación</h2><p className="mt-1 text-sm text-text-soft">Completa estos pasos para empezar a atender clientes.</p></div><span className="rounded-full border border-card-border px-3 py-1 text-xs font-semibold text-text-soft">{steps.filter(step => step.done).length}/4 listos</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{steps.map(step => <div key={step.label} className={`flex items-center gap-2 rounded-xl border p-3 ${step.done ? 'border-brand-success/20 bg-brand-success/[0.06]' : 'border-card-border bg-white/[0.02]'}`}>{step.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-success" /> : <Circle className="h-4 w-4 shrink-0 text-text-soft" />}<div className="min-w-0"><p className="truncate text-xs font-bold">{step.label}</p><p className="truncate text-[11px] text-text-soft">{step.detail}</p></div></div>)}</div></section>

    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-card-border bg-card-bg/70 p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase text-text-soft"><Activity className="h-4 w-4" /> Salud</p><p className="mt-2 text-2xl font-black">{health.score}<span className="text-sm text-text-soft">/100</span></p></div><Link href={`/dashboard/conversations?assistantId=${assistantId}`} className="rounded-2xl border border-card-border bg-card-bg/70 p-4 hover:border-brand-violet/30"><p className="flex items-center gap-2 text-xs font-semibold uppercase text-text-soft"><MessageCircle className="h-4 w-4" /> Conversaciones</p><p className="mt-2 text-2xl font-black">{conversationsCount}</p></Link><Link href={`/dashboard/leads?assistantId=${assistantId}`} className="rounded-2xl border border-card-border bg-card-bg/70 p-4 hover:border-brand-cyan/30"><p className="flex items-center gap-2 text-xs font-semibold uppercase text-text-soft"><Users className="h-4 w-4" /> Leads</p><p className="mt-2 text-2xl font-black">{leadsCount}</p></Link></div>

    <section className="flex flex-col gap-4 rounded-2xl border border-brand-violet/20 bg-gradient-to-r from-brand-violet/[0.08] to-brand-cyan/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><Target className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase text-brand-violet">Siguiente paso recomendado</p><p className="mt-1 font-bold">{next.label}</p></div></div><Link href={next.href} className="rounded-xl bg-brand-violet px-5 py-2.5 text-center text-sm font-bold text-white">Continuar</Link></section>

    <section className="rounded-2xl border border-card-border bg-card-bg/70 p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Pruebas recientes</h2><p className="mt-1 text-sm text-text-soft">Últimas respuestas verificadas por ti.</p></div><Link href={`?tab=test`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-violet"><TestTube2 className="h-4 w-4" /> Probar</Link></div>{tests.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-card-border p-5 text-center text-sm text-text-soft">Todavía no has probado este asistente.</p> : <div className="mt-4 divide-y divide-card-border">{tests.slice(0,3).map(test => <div key={test.id} className="py-3 first:pt-0 last:pb-0"><p className="truncate text-sm font-semibold">“{test.user_message}”</p><p className="mt-1 line-clamp-1 text-xs text-text-soft">{test.assistant_reply}</p></div>)}</div>}</section>
  </div>
}
