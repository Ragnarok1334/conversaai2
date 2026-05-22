import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { LogOut, Plus, MessageSquare, Users, Bot } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'

  return (
    <div className="min-h-screen bg-dark-bg text-text-main flex flex-col">
      {/* Dashboard Header */}
      <header className="border-b border-card-border bg-dark-secondary/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center font-bold text-white">
              C
            </div>
            <span className="text-xl font-bold tracking-tight">ConversaAI</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary hidden md:block">Hola, {userName}</span>
            <form action={signOut}>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-white/10 transition-colors text-sm font-medium">
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-violet/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Panel de Control</h1>
            <p className="text-text-soft">Gestiona tus asistentes y analiza tu rendimiento.</p>
          </div>
          <button className="gradient-btn px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2 glow-violet hover:scale-105 transition-transform w-fit">
            <Plus className="w-5 h-5" />
            Crear asistente
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 glow-violet relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-secondary font-medium">Asistentes creados</h3>
              <div className="w-10 h-10 rounded-full bg-brand-violet/20 flex items-center justify-center text-brand-violet">
                <Bot className="w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold">1</p>
            <p className="text-sm text-brand-success mt-2">+1 este mes</p>
          </div>

          <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 glow-cyan relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-secondary font-medium">Conversaciones</h3>
              <div className="w-10 h-10 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold">1,248</p>
            <p className="text-sm text-brand-success mt-2">+12% vs mes anterior</p>
          </div>

          <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 glow-violet relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-secondary font-medium">Leads generados</h3>
              <div className="w-10 h-10 rounded-full bg-brand-pink/20 flex items-center justify-center text-brand-pink">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold">342</p>
            <p className="text-sm text-brand-success mt-2">+18% vs mes anterior</p>
          </div>
        </div>

        {/* Empty State / Activity */}
        <div className="bg-dark-secondary border border-card-border rounded-2xl p-8 text-center">
          <Bot className="w-16 h-16 text-text-soft mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">Tu asistente está funcionando</h3>
          <p className="text-text-secondary max-w-md mx-auto mb-6">
            Actualmente tu asistente "Soporte Ventas" está activo en 2 canales (Web, WhatsApp) y respondiendo a tus clientes.
          </p>
          <button className="px-6 py-2.5 rounded-xl bg-card-bg border border-card-border text-text-main hover:bg-white/10 transition-colors">
            Ver configuración del asistente
          </button>
        </div>
      </main>
    </div>
  )
}
