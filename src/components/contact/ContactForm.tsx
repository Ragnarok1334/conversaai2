"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    subject: "",
    message: "",
    website: "" // honeypot
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMessage("")

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      
      let data;
      try {
        data = await res.json()
      } catch (e) {
        throw new Error("Error de conexión con el servidor. Intenta nuevamente.")
      }

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error inesperado.")
      }

      setStatus("success")
      setForm({ name: "", email: "", company: "", phone: "", subject: "", message: "", website: "" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message)
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card-bg/80 backdrop-blur-2xl border border-brand-success/30 rounded-[2rem] p-12 text-center shadow-[0_0_50px_rgba(34,197,94,0.1)]"
      >
        <div className="w-20 h-20 rounded-full bg-brand-success/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          <CheckCircle2 className="w-10 h-10 text-brand-success" />
        </div>
        <h3 className="text-3xl font-bold text-white mb-4">¡Mensaje enviado!</h3>
        <p className="text-text-secondary text-lg mb-8 max-w-sm mx-auto">
          Mensaje enviado correctamente. Te responderemos pronto.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="px-8 py-3 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/10 font-semibold text-white transition-all"
        >
          Enviar otro mensaje
        </button>
      </motion.div>
    )
  }

  return (
    <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-violet/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-cyan/5 blur-[100px] rounded-full pointer-events-none" />
      
      <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
        {/* Honeypot field - visually hidden to trick bots */}
        <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={handleChange}
          />
        </div>

        {status === "error" && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-text-secondary">Nombre *</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Tu nombre completo"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-cyan/50 focus:bg-white/[0.05] transition-all"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-text-secondary">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="tu@empresa.com"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-cyan/50 focus:bg-white/[0.05] transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="company" className="text-sm font-medium text-text-secondary">Empresa (Opcional)</label>
            <input
              id="company"
              name="company"
              type="text"
              value={form.company}
              onChange={handleChange}
              placeholder="Nombre de tu empresa"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-cyan/50 focus:bg-white/[0.05] transition-all"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-text-secondary">Teléfono (Opcional)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+56 9 1234 5678"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-cyan/50 focus:bg-white/[0.05] transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="subject" className="text-sm font-medium text-text-secondary">Asunto *</label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            value={form.subject}
            onChange={handleChange}
            placeholder="¿Sobre qué quieres hablar?"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-cyan/50 focus:bg-white/[0.05] transition-all"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium text-text-secondary">Mensaje *</label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            value={form.message}
            onChange={handleChange}
            placeholder="Cuéntanos un poco más sobre tus necesidades o dudas..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-cyan/50 focus:bg-white/[0.05] transition-all resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full gradient-btn py-4 rounded-xl text-white font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity glow-violet disabled:opacity-70 disabled:cursor-not-allowed mt-4 shadow-lg"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Enviar mensaje
            </>
          )}
        </button>
      </form>
    </div>
  )
}
