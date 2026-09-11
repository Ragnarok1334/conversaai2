"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  Clock3,
  Globe2,
  Menu,
  MessageCircle,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PUBLIC_PAID_PLANS } from "@/lib/plans";
import { ReviewsSection } from "@/components/ReviewsSection";

const features = [
  { icon: MessageCircle, title: "Respuestas automáticas", text: "Atiende preguntas frecuentes con información real de cada negocio." },
  { icon: UserRoundCheck, title: "Captura de prospectos", text: "Solicita datos en el momento adecuado y mantiene cada oportunidad organizada." },
  { icon: MessagesSquare, title: "Historial centralizado", text: "Consulta conversaciones y continúa la atención desde un solo panel." },
  { icon: BrainCircuit, title: "Asistentes personalizados", text: "Define servicios, productos, tono y reglas diferentes para cada asistente." },
  { icon: ShieldCheck, title: "Información controlada", text: "Reduce respuestas inventadas y deriva a una persona cuando falta información." },
  { icon: TrendingUp, title: "Seguimiento comercial", text: "Convierte conversaciones en oportunidades que tu equipo puede gestionar." },
];

const faqs = [
  ["¿Necesito conocimientos técnicos?", "No. ConversaAI guía la configuración del negocio y entrega un código sencillo para instalar el webchat."],
  ["¿Puedo personalizar las respuestas?", "Sí. Cada asistente puede tener su propia información, personalidad, servicios, reglas y objetivo."],
  ["¿Sirve para captar clientes?", "Sí. El asistente puede solicitar datos de contacto y guardar cada prospecto para su seguimiento."],
  ["¿Qué ocurre si no conoce una respuesta?", "Puede reconocer que falta información y derivar la consulta a una persona, en lugar de inventar datos."],
];

export function LightLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setIsLoggedIn(Boolean(data.session)));
  }, []);

  const primaryHref = isLoggedIn ? "/dashboard" : "/register";

  return (
    <main className="light-landing">
      <header className="light-nav">
        <div className="light-container light-nav-inner">
          <Link href="/" className="light-brand" aria-label="ConversaAI, inicio">
            <Image src="/logo.png" alt="" width={42} height={42} priority />
            <span>Conversa<span>AI</span></span>
          </Link>
          <nav className="light-nav-links" aria-label="Navegación principal">
            <a href="#funciones">Funciones</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#precios">Precios</a>
            <a href="#preguntas">Preguntas</a>
          </nav>
          <div className="light-nav-actions">
            <Link href={isLoggedIn ? "/dashboard" : "/login"} className="light-login">
              {isLoggedIn ? "Ir al panel" : "Iniciar sesión"}
            </Link>
            <Link href={primaryHref} className="light-button light-button-small">
              {isLoggedIn ? "Mis asistentes" : "Crear cuenta"}
            </Link>
          </div>
          <button className="light-menu-button" type="button" aria-label="Abrir menú" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav className="light-mobile-menu" aria-label="Navegación móvil">
            <a href="#funciones" onClick={() => setMenuOpen(false)}>Funciones</a>
            <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
            <a href="#precios" onClick={() => setMenuOpen(false)}>Precios</a>
            <a href="#preguntas" onClick={() => setMenuOpen(false)}>Preguntas</a>
            <Link href={primaryHref}>{isLoggedIn ? "Ir al panel" : "Crear cuenta"}</Link>
          </nav>
        )}
      </header>

      <section className="light-hero">
        <div className="light-orb light-orb-one" />
        <div className="light-orb light-orb-two" />
        <div className="light-container light-hero-grid">
          <div className="light-hero-copy">
            <div className="light-pill"><Sparkles /> Asistentes IA para negocios</div>
            <h1>Convierte conversaciones en <span>clientes reales.</span></h1>
            <p>ConversaAI responde consultas, captura prospectos y organiza cada conversación para que tu negocio pueda atender mejor, incluso cuando tú no estás disponible.</p>
            <div className="light-hero-actions">
              <Link href={primaryHref} className="light-button">Crear mi asistente <ArrowRight /></Link>
              <a href="#como-funciona" className="light-button light-button-secondary">Ver cómo funciona</a>
            </div>
            <div className="light-trust-row">
              <span><Check /> Prueba de 7 días para cuentas nuevas</span>
              <span><Check /> 50 respuestas de IA</span>
              <span><Check /> Cancela cuando quieras</span>
            </div>
          </div>

          <div className="light-product-visual" aria-label="Vista previa de una conversación con ConversaAI">
            <div className="light-chat-card">
              <div className="light-chat-header">
                <div className="light-chat-avatar"><Bot /></div>
                <div><strong>Asistente ConversaAI</strong><span><i /> En línea</span></div>
                <div className="light-chat-badge">24/7</div>
              </div>
              <div className="light-chat-body">
                <p className="light-bubble light-bubble-user">Hola, ¿qué servicios ofrecen?</p>
                <p className="light-bubble light-bubble-bot">¡Hola! Puedo mostrarte los servicios, precios y horarios del negocio. ¿Qué necesitas conocer?</p>
                <p className="light-bubble light-bubble-user">Quiero que me contacten.</p>
                <p className="light-bubble light-bubble-bot">Perfecto. Comencemos con tu nombre y luego registraré tu solicitud.</p>
              </div>
              <div className="light-lead-card">
                <span><Check /></span>
                <div><strong>Nuevo prospecto</strong><small>Registrado hace un momento</small></div>
                <TrendingUp />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="light-proof">
        <div className="light-container light-proof-grid">
          <div><Clock3 /><strong>24/7</strong><span>Atención automática</span></div>
          <div><UserRoundCheck /><strong>Leads</strong><span>Prospectos organizados</span></div>
          <div><Globe2 /><strong>Webchat</strong><span>Instalación en tu sitio</span></div>
          <div><ShieldCheck /><strong>Control</strong><span>Reglas por asistente</span></div>
        </div>
      </section>

      <section id="funciones" className="light-section">
        <div className="light-container">
          <div className="light-heading">
            <span>TODO EN UN SOLO LUGAR</span>
            <h2>Atiende, organiza y vende mejor.</h2>
            <p>Las herramientas esenciales para transformar consultas repetitivas en conversaciones útiles para tu negocio.</p>
          </div>
          <div className="light-feature-grid">
            {features.map(({ icon: Icon, title, text }) => (
              <article className="light-feature-card" key={title}>
                <span><Icon /></span><h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="light-section light-section-soft">
        <div className="light-container">
          <div className="light-heading">
            <span>IMPLEMENTACIÓN SIMPLE</span>
            <h2>Tu asistente listo en pocos pasos.</h2>
          </div>
          <div className="light-steps-grid">
            {[
              ["01", "Crea el asistente", "Define el objetivo y la personalidad que tendrá frente a tus clientes."],
              ["02", "Agrega tu información", "Incorpora servicios, productos, horarios, preguntas frecuentes y reglas."],
              ["03", "Prueba sus respuestas", "Conversa con el asistente y ajusta la información antes de publicarlo."],
              ["04", "Conecta tu canal", "Instala el webchat y administra los prospectos desde tu panel."],
            ].map(([number, title, text]) => (
              <article className="light-step" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="light-section">
        <div className="light-container">
          <div className="light-heading">
            <span>PLANES PARA CRECER</span>
            <h2>Elige la capacidad que necesitas.</h2>
            <p>Tres opciones claras para comenzar, vender y escalar. Valores mensuales en pesos chilenos.</p>
          </div>
          <div className="light-plan-grid">
            {PUBLIC_PAID_PLANS.map((plan) => (
              <article className={`light-plan-card${plan.recommended ? " light-plan-featured" : ""}`} key={plan.key}>
                {plan.recommended && <div className="light-plan-label">RECOMENDADO</div>}
                <h3>{plan.label}</h3><p>{plan.description}</p>
                <div className="light-price">{plan.priceLabelCLP.replace(" CLP", "")}<small> CLP/mes</small></div>
                <ul>{plan.features.slice(0, 5).map((item) => <li key={item}><Check /> {item}</li>)}</ul>
                {plan.futureFeatures.length > 0 && <p><strong>Próximamente:</strong> {plan.futureFeatures.join(", ")}.</p>}
                <Link href={primaryHref} className={`light-plan-button${plan.recommended ? " light-plan-button-filled" : ""}`}>{plan.cta}</Link>
              </article>
            ))}
          </div>
          <p className="light-pricing-note">Solo descuentan del límite las respuestas generadas por IA. Los mensajes del visitante y las respuestas de tu equipo no consumen respuestas de IA.</p>
        </div>
      </section>

      <ReviewsSection />

      <section id="preguntas" className="light-section light-section-soft">
        <div className="light-container light-faq-wrap">
          <div className="light-heading"><span>PREGUNTAS FRECUENTES</span><h2>Resolvamos tus dudas.</h2></div>
          <div className="light-faq-list">
            {faqs.map(([question, answer], index) => (
              <details key={question} open={index === 0}>
                <summary>{question}<ChevronDown /></summary><p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="light-cta-section">
        <div className="light-container">
          <div className="light-cta-card">
            <div className="light-cta-logo"><Image src="/logo.png" alt="" width={58} height={58} /></div>
            <h2>Empieza a convertir mensajes en oportunidades.</h2>
            <p>Las cuentas nuevas pueden activar 7 días de prueba con 1 asistente, Web Chat y 50 respuestas de IA.</p>
            <Link href={primaryHref} className="light-button light-button-white">Probar durante 7 días <ArrowRight /></Link>
          </div>
        </div>
      </section>

      <footer className="light-footer">
        <div className="light-container light-footer-grid">
          <div><Link href="/" className="light-brand"><Image src="/logo.png" alt="" width={36} height={36} /><span>Conversa<span>AI</span></span></Link><p>Asistentes inteligentes para atención y captación de clientes.</p></div>
          <div><strong>Producto</strong><a href="#funciones">Funciones</a><a href="#precios">Precios</a><Link href="/contact">Contacto</Link></div>
          <div><strong>Cuenta</strong><Link href="/login">Iniciar sesión</Link><Link href="/register">Crear cuenta</Link><Link href="/dashboard">Panel</Link></div>
          <div><strong>Legal</strong><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><a href="mailto:soporte@conversaai.store">soporte@conversaai.store</a></div>
        </div>
        <div className="light-container light-copyright">© 2026 ConversaAI. Todos los derechos reservados.</div>
      </footer>
    </main>
  );
}
