import React from 'react';

export function DashboardCard({ children, className = "", noPadding = false }: { children: React.ReactNode, className?: string, noPadding?: boolean }) {
  return (
    <div className={`bg-card-bg/60 backdrop-blur-xl border border-card-border rounded-2xl shadow-sm overflow-hidden relative ${noPadding ? '' : 'p-5 md:p-6'} ${className}`}>
      {children}
    </div>
  );
}
