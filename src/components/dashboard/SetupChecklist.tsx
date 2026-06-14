import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import { DashboardCard } from './DashboardCard';

export interface Step {
  id: string;
  label: string;
  completed: boolean;
  href: string;
}

export function SetupChecklist({ steps }: { steps: Step[] }) {
  const completedCount = steps.filter(s => s.completed).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <DashboardCard className="flex flex-col h-full bg-card-bg/50">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-violet/5 rounded-full blur-3xl pointer-events-none" />
      <h3 className="text-sm font-bold text-white mb-4 relative z-10">Progreso de configuración</h3>
      
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/5 rounded-full mb-5 relative z-10 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-violet to-brand-cyan rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-3 relative z-10 flex-1">
        {steps.map((step) => (
          <Link key={step.id} href={step.href} className="flex items-start gap-3 group">
            <div className="mt-0.5 shrink-0">
              {step.completed ? (
                <CheckCircle2 className="w-4 h-4 text-brand-success" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 group-hover:text-brand-violet transition-colors" />
              )}
            </div>
            <span className={`text-sm transition-colors ${step.completed ? 'text-slate-500 line-through' : 'text-slate-300 group-hover:text-white'}`}>
              {step.label}
            </span>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
