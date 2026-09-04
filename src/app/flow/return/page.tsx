'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function FlowReturnContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      if (!token) {
        window.location.href = '/dashboard/billing?payment=unknown';
        return;
      }

      // Flow's return URL necessarily carries the bearer token once. Remove it
      // from browser history/address bar immediately before making the status call.
      window.history.replaceState({}, document.title, '/flow/return');

      try {
        const query = new URLSearchParams({ token });
        const res = await fetch(`/api/billing/flow/status?${query.toString()}`, {
          cache: 'no-store'
        });

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Respuesta no JSON:", text.slice(0, 500));
          throw new Error("El servidor devolvió una respuesta inválida.");
        }

        const data = await res.json();

        if (res.ok) {
          setStatus(data.status);
          if (data.status === 'paid') {
            window.location.href = '/dashboard/billing?payment=success';
          } else if (data.status === 'pending') {
            window.location.href = '/dashboard/billing?payment=pending';
          } else if (data.status === 'rejected') {
            window.location.href = '/dashboard/billing?payment=rejected';
          } else {
            window.location.href = '/dashboard/billing?payment=unknown';
          }
        } else {
          setError(data.error || 'No se pudo verificar el pago');
          setTimeout(() => {
            window.location.href = '/dashboard/billing?payment=unknown';
          }, 3000);
        }
      } catch {
        setError('Error de conexión al verificar el pago');
        setTimeout(() => {
          window.location.href = '/dashboard/billing?payment=unknown';
        }, 3000);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        {loading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
            <h2 className="text-xl font-medium text-slate-200">Verificando pago...</h2>
            <p className="text-slate-400 text-sm">Estamos confirmando tu pago con Flow.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {!token ? (
              <div className="space-y-2">
                <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">⏳</span></div>
                <h2 className="text-2xl font-bold text-slate-200">Volviste desde Flow</h2>
                <p className="text-slate-400">Si tu pago fue aprobado, se reflejará en unos momentos en tu cuenta.</p>
              </div>
            ) : error ? (
              <div className="space-y-2">
                <div className="h-16 w-16 bg-red-900/30 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></div>
                <h2 className="text-xl font-bold text-slate-200">No se pudo verificar</h2>
                <p className="text-slate-400 text-sm">{error}</p>
              </div>
            ) : status === 'paid' ? (
              <div className="space-y-2">
                <div className="h-16 w-16 bg-emerald-900/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                <h2 className="text-2xl font-bold text-emerald-400">¡Pago Aprobado!</h2>
                <p className="text-slate-400">Tu suscripción ha sido activada exitosamente.</p>
              </div>
            ) : status === 'pending' ? (
              <div className="space-y-2">
                <div className="h-16 w-16 bg-yellow-900/30 text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">⏳</span></div>
                <h2 className="text-xl font-bold text-yellow-400">Pago Pendiente</h2>
                <p className="text-slate-400">El pago está en proceso de validación.</p>
              </div>
            ) : status === 'rejected' ? (
              <div className="space-y-2">
                <div className="h-16 w-16 bg-red-900/30 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></div>
                <h2 className="text-xl font-bold text-red-400">Pago Rechazado</h2>
                <p className="text-slate-400">Tu pago fue rechazado. Puedes intentarlo de nuevo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">❓</span></div>
                <h2 className="text-xl font-bold text-slate-200">Estado Desconocido</h2>
                <p className="text-slate-400">No pudimos determinar el estado final del pago.</p>
              </div>
            )}

            <div className="pt-4">
              <Link href="/dashboard/billing" className="inline-block w-full py-3 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/20">Ir a facturación</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FlowReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <h2 className="text-xl font-medium text-slate-200 mt-4">Cargando...</h2>
        </div>
      </div>
    }>
      <FlowReturnContent />
    </Suspense>
  );
}
