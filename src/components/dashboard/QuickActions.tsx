import React from 'react';
import Link from 'next/link';
import { Plus, Code2, MessageSquare, Users, CreditCard, HelpCircle } from 'lucide-react';

export function QuickActions({ hasAssistant }: { hasAssistant: boolean }) {
  const actions = [
    { label: "Crear asistente", desc: "Configura nueva IA", icon: Plus, href: "/dashboard/create-assistant", color: "text-brand-violet", bg: "bg-brand-violet/10" },
    { label: "Instalar Web Chat", desc: "Agrega a tu web", icon: Code2, href: hasAssistant ? "/dashboard/assistants" : "/dashboard/create-assistant", color: "text-brand-cyan", bg: "bg-brand-cyan/10" },
    { label: "Ver conversaciones", desc: "Historial de chats", icon: MessageSquare, href: "/dashboard/conversations", color: "text-brand-blue", bg: "bg-brand-blue/10" },
    { label: "Revisar leads", desc: "Contactos capturados", icon: Users, href: "/dashboard/leads", color: "text-brand-success", bg: "bg-brand-success/10" },
    { label: "Administrar plan", desc: "Suscripción y uso", icon: CreditCard, href: "/dashboard/billing", color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Soporte", desc: "Ayuda y diagnóstico", icon: HelpCircle, href: "/dashboard/support", color: "text-brand-pink", bg: "bg-brand-pink/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {actions.map((act, i) => (
        <Link key={i} href={act.href} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 transition-all group">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${act.bg}`}>
            <act.icon className={`w-5 h-5 ${act.color} group-hover:scale-110 transition-transform`} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{act.label}</h4>
            <p className="text-xs text-slate-500 truncate">{act.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
