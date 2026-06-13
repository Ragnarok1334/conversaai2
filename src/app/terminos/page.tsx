import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Términos y Condiciones | ConversaAI',
  description: 'Consulta las condiciones de uso, planes, pagos y responsabilidades al utilizar ConversaAI.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#050816] text-slate-300 font-sans selection:bg-brand-violet/30 selection:text-white relative">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-brand-cyan/10 blur-[150px] pointer-events-none rounded-full" />
      
      <div className="relative z-10 container mx-auto px-6 py-12 md:py-20 max-w-4xl">
        {/* Navigation */}
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio</span>
          </Link>
          
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="ConversaAI" width={32} height={32} className="rounded-lg shadow-[0_0_15px_rgba(124,58,237,0.3)]" />
            <span className="font-bold text-white tracking-tight">ConversaAI</span>
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Términos y Condiciones
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-6">
            Reglas de uso de ConversaAI y condiciones del servicio.
          </p>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-medium text-slate-400">
            Última actualización: 12 de junio de 2026
          </div>
        </header>

        {/* Content Card */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-12 shadow-2xl prose prose-invert prose-slate max-w-none">
          
          <p className="lead text-slate-300 text-lg mb-10">
            Estos Términos y Condiciones regulan el acceso y uso de ConversaAI, una plataforma SaaS que permite crear, configurar y administrar asistentes de inteligencia artificial para atención, ventas, soporte, captación de leads y automatización de conversaciones.
          </p>
          
          <p className="mb-10 font-semibold text-white">
            Al crear una cuenta, iniciar sesión o utilizar ConversaAI, aceptas estos términos.
          </p>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">1. Identificación del servicio</h2>
            <p className="mb-4">
              ConversaAI es una plataforma digital disponible en:<br />
              <a href="https://conversaai.store" className="text-brand-cyan hover:underline">https://conversaai.store</a>
            </p>
            <p>
              Correo de contacto:<br />
              <a href="mailto:contacto@conversaai.store" className="text-brand-cyan hover:underline">contacto@conversaai.store</a>
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">2. Uso de la plataforma</h2>
            <p className="mb-4">El usuario puede utilizar ConversaAI para:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Crear asistentes IA.</li>
              <li>Configurar información del negocio.</li>
              <li>Instalar Web Chat en sitios autorizados.</li>
              <li>Gestionar conversaciones.</li>
              <li>Capturar leads.</li>
              <li>Revisar métricas, soporte, facturación y diagnósticos.</li>
              <li>Utilizar funciones disponibles según el plan contratado.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">3. Cuenta de usuario</h2>
            <p className="mb-4">
              Para usar ConversaAI debes crear una cuenta o iniciar sesión mediante métodos disponibles como correo electrónico, Google o Facebook.
            </p>
            <p className="mb-4">El usuario es responsable de:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Proporcionar información real y actualizada.</li>
              <li>Mantener la seguridad de sus credenciales.</li>
              <li>No compartir accesos con terceros no autorizados.</li>
              <li>Notificar cualquier uso no autorizado de su cuenta.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">4. Planes, pagos y suscripciones</h2>
            <p className="mb-4">ConversaAI puede ofrecer planes gratuitos, de prueba y de pago.</p>
            <p className="mb-4">Los planes pueden variar en:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400 mb-4">
              <li>Cantidad de mensajes.</li>
              <li>Número de asistentes.</li>
              <li>Dominios permitidos.</li>
              <li>Nivel de IA.</li>
              <li>Funciones disponibles.</li>
              <li>Soporte y herramientas adicionales.</li>
            </ul>
            <p className="mb-4">
              Los pagos pueden procesarse mediante proveedores externos como Flow, PayPal u otros métodos disponibles.
            </p>
            <p>
              La activación de un plan puede depender de la confirmación del proveedor de pago.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">5. Prueba gratuita</h2>
            <p className="mb-4">
              ConversaAI puede ofrecer una prueba gratuita con límites específicos. La disponibilidad, duración y condiciones de la prueba pueden cambiar.
            </p>
            <p>
              La prueba gratuita no garantiza acceso permanente a funciones de pago.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">6. Cancelación de intentos de pago</h2>
            <p className="mb-4">
              El usuario puede cancelar o descartar intentos de pago pendientes dentro de la plataforma cuando estén disponibles.
            </p>
            <p>
              Cancelar un intento pendiente dentro de ConversaAI no necesariamente cancela una operación iniciada en un proveedor externo de pago. Si el proveedor confirma posteriormente un pago válido, ConversaAI podrá actualizar el estado correspondiente.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">7. Uso aceptable</h2>
            <p className="mb-4">El usuario se compromete a no usar ConversaAI para:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Actividades ilegales.</li>
              <li>Spam, fraude, phishing o suplantación de identidad.</li>
              <li>Generar contenido que infrinja derechos de terceros.</li>
              <li>Automatizar abusos, acoso o manipulación.</li>
              <li>Procesar información sensible sin autorización.</li>
              <li>Intentar vulnerar la seguridad de la plataforma.</li>
              <li>Revender el servicio sin autorización.</li>
              <li>Usar la plataforma para fines que afecten la disponibilidad, estabilidad o reputación del sistema.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">8. Contenido del usuario</h2>
            <p className="mb-4">
              El usuario conserva la responsabilidad sobre la información que ingresa en la plataforma, incluyendo:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400 mb-4">
              <li>Información del negocio.</li>
              <li>Textos de entrenamiento.</li>
              <li>Bases de conocimiento.</li>
              <li>Mensajes.</li>
              <li>Conversaciones.</li>
              <li>Datos capturados de clientes o leads.</li>
            </ul>
            <p>
              El usuario declara que tiene derecho a utilizar y procesar dicha información.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">9. Asistentes de inteligencia artificial</h2>
            <p className="mb-4">
              Los asistentes IA pueden generar respuestas automáticas con base en la información configurada por el usuario.
            </p>
            <p className="mb-4">El usuario entiende que:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Las respuestas pueden no ser perfectas.</li>
              <li>Debe revisar la información crítica antes de usarla comercialmente.</li>
              <li>No debe depender del asistente para asesoría médica, legal, financiera o de emergencia sin supervisión profesional.</li>
              <li>Debe configurar reglas claras para su negocio.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">10. Instalación del Web Chat</h2>
            <p className="mb-4">
              El usuario debe instalar el script del Web Chat únicamente en dominios propios o autorizados.
            </p>
            <p>
              ConversaAI puede bloquear dominios o instalaciones que parezcan fraudulentas, abusivas o no autorizadas.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">11. Canales de comunicación</h2>
            <p className="mb-4">
              ConversaAI puede ofrecer canales como Web Chat, Telegram, WhatsApp u otras integraciones, según disponibilidad.
            </p>
            <p>
              Algunas funciones pueden aparecer como “Próximamente” y no estarán disponibles hasta su lanzamiento oficial.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">12. Disponibilidad del servicio</h2>
            <p className="mb-4">
              Trabajamos para mantener ConversaAI disponible y estable, pero no garantizamos disponibilidad ininterrumpida.
            </p>
            <p className="mb-4">Pueden existir interrupciones por:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Mantenimiento.</li>
              <li>Fallas técnicas.</li>
              <li>Proveedores externos.</li>
              <li>Problemas de red.</li>
              <li>Cambios de infraestructura.</li>
              <li>Eventos fuera de nuestro control.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">13. Limitación de responsabilidad</h2>
            <p className="mb-4">
              ConversaAI se ofrece como herramienta tecnológica de apoyo. No garantizamos resultados comerciales específicos, ventas, clientes, ingresos o conversiones.
            </p>
            <p>
              El usuario es responsable de revisar, ajustar y supervisar el uso de sus asistentes IA.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">14. Proveedores externos</h2>
            <p className="mb-4">
              ConversaAI utiliza servicios de terceros para autenticación, pagos, inteligencia artificial, hosting, seguridad, correos y otros componentes.
            </p>
            <p>
              No somos responsables por interrupciones, cambios o errores causados por proveedores externos fuera de nuestro control.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">15. Propiedad intelectual</h2>
            <p className="mb-4">
              ConversaAI, su marca, interfaz, diseño, software y elementos visuales pertenecen a sus titulares correspondientes.
            </p>
            <p>
              El usuario no adquiere derechos sobre la plataforma más allá del uso permitido según su plan.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">16. Suspensión o terminación</h2>
            <p className="mb-4">Podemos suspender o cancelar cuentas si detectamos:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Incumplimiento de estos términos.</li>
              <li>Abuso del servicio.</li>
              <li>Actividad fraudulenta.</li>
              <li>Riesgos de seguridad.</li>
              <li>Uso ilegal.</li>
              <li>Falta de pago en planes de pago.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">17. Cambios en los planes o funciones</h2>
            <p>
              ConversaAI puede modificar planes, límites, precios o funciones. Cuando corresponda, se informará al usuario mediante la plataforma o canales de contacto disponibles.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">18. Privacidad</h2>
            <p>
              El uso de ConversaAI también se rige por nuestra Política de Privacidad disponible en: <br />
              <a href="https://conversaai.store/privacidad" className="text-brand-cyan hover:underline">https://conversaai.store/privacidad</a>
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">19. Contacto</h2>
            <p>
              Para dudas sobre estos Términos y Condiciones, escríbenos a: <br />
              <a href="mailto:contacto@conversaai.store" className="text-brand-cyan hover:underline">contacto@conversaai.store</a>
            </p>
          </section>
          
          <div className="mt-16 pt-8 border-t border-white/10 text-xs text-slate-500 text-center">
            Este documento puede actualizarse para reflejar cambios legales, técnicos o comerciales.
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}
