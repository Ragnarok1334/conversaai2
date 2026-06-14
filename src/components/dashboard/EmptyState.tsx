import React from 'react';
import Link from 'next/link';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-400">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-xs mx-auto mb-5 leading-relaxed">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="text-xs font-medium bg-white/10 hover:bg-white/15 text-white border border-white/10 px-4 py-2 rounded-lg transition-colors">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
