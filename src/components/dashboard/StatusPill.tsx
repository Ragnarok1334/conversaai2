import React from 'react';

export type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function StatusPill({ status, label }: { status: StatusType; label: string }) {
  const getColors = () => {
    switch (status) {
      case 'success': return 'bg-brand-success/10 border-brand-success/20 text-brand-success';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
      case 'danger': return 'bg-brand-pink/10 border-brand-pink/20 text-brand-pink';
      case 'info': return 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan';
      case 'neutral':
      default:
        return 'bg-white/[0.04] border-white/10 text-white';
    }
  };

  return (
    <span className={`text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-lg border inline-flex items-center justify-center w-max ${getColors()}`}>
      {label}
    </span>
  );
}
