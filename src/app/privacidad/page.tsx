import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Política de Privacidad | ConversaAI',
  description: 'Conoce cómo ConversaAI recopila, utiliza y protege la información de sus usuarios.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050816] text-slate-300 font-sans selection:bg-brand-violet/30 selection:text-white relative">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-brand-violet/10 blur-[150px] pointer-events-none rounded-full" />
      
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
            Política de Privacidad
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-6">
            Cómo ConversaAI recopila, usa y protege la información de sus usuarios.
          </p>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-medium text-slate-400">
            Última actualización: 12 de junio de 2026
          </div>
        </header>

        {/* Content Card */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-12 shadow-2xl prose prose-invert prose-slate max-w-none">
          
          <p className="lead text-slate-300 text-lg mb-10">
            En ConversaAI respetamos tu privacidad y nos comprometemos a proteger la información personal de nuestros usuarios, clientes y visitantes. Esta Política de Privacidad explica qué información recopilamos, cómo la usamos, cómo la protegemos y qué derechos tienes sobre tus datos.
          </p>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">1. Responsable del tratamiento</h2>
            <p className="mb-4">
              El responsable de esta plataforma es ConversaAI.<br />
              Sitio web: <a href="https://conversaai.store" className="text-brand-cyan hover:underline">https://conversaai.store</a><br />
              Correo de contacto: <a href="mailto:soporte@conversaai.store" className="text-brand-cyan hover:underline">soporte@conversaai.store</a>
            </p>
            <p>
              Si en el futuro ConversaAI opera bajo una razón social, RUT o entidad legal específica, esta sección podrá actualizarse para reflejar dicha información.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">2. Información que recopilamos</h2>
            <p className="mb-4">Podemos recopilar la siguiente información:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Nombre completo.</li>
              <li>Correo electrónico.</li>
              <li>Nombre del negocio o empresa.</li>
              <li>País, teléfono y datos de contacto proporcionados voluntariamente.</li>
              <li>Información relacionada con asistentes creados dentro de la plataforma.</li>
              <li>Información de configuración, canales, dominios autorizados y preferencias de uso.</li>
              <li>Conversaciones, mensajes y leads generados mediante los asistentes IA.</li>
              <li>Información de pagos, planes, estado de suscripción y proveedor de pago.</li>
              <li>Datos técnicos como dirección IP, navegador, dispositivo, fecha, hora, eventos de seguridad y registros de actividad.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">3. Información obtenida mediante Google o Facebook</h2>
            <p className="mb-4">
              Cuando inicias sesión con Google o Facebook, ConversaAI puede recibir tu nombre y correo electrónico para autenticarte y crear o acceder a tu cuenta. No publicamos en tus redes, no leemos mensajes privados y no solicitamos permisos innecesarios.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">4. Uso de la información</h2>
            <p className="mb-4">Usamos la información recopilada para:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Crear y administrar cuentas de usuario.</li>
              <li>Permitir el acceso seguro a la plataforma.</li>
              <li>Crear, configurar y operar asistentes IA.</li>
              <li>Procesar conversaciones, mensajes y leads.</li>
              <li>Mostrar métricas, diagnósticos y estados dentro del panel.</li>
              <li>Administrar planes, pagos, límites y suscripciones.</li>
              <li>Mejorar la seguridad, prevenir abuso, fraude o uso indebido.</li>
              <li>Brindar soporte técnico.</li>
              <li>Mejorar la experiencia del usuario y la calidad del servicio.</li>
              <li>Cumplir obligaciones legales o requerimientos aplicables.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">5. Uso de inteligencia artificial</h2>
            <p className="mb-4">
              ConversaAI permite crear asistentes IA que responden mensajes, procesan información del negocio y ayudan a captar leads. Para esto, la información proporcionada por el usuario puede ser procesada por servicios de inteligencia artificial externos, como proveedores de modelos de lenguaje.
            </p>
            <p>
              El usuario es responsable de no ingresar información sensible, confidencial o ilegal que no desee que sea procesada por el sistema.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">6. Información de pagos</h2>
            <p className="mb-4">
              ConversaAI puede procesar pagos mediante proveedores externos como Flow, PayPal o proveedores de criptoactivos, según disponibilidad.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>No almacenamos datos completos de tarjetas bancarias.</li>
              <li>Los pagos son procesados por plataformas externas seguras.</li>
              <li>Podemos guardar información relacionada con el estado del pago, plan contratado, monto, moneda, fecha y proveedor.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">7. Cookies y tecnologías similares</h2>
            <p className="mb-4">Podemos utilizar cookies, almacenamiento local y tecnologías similares para:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Mantener la sesión iniciada.</li>
              <li>Recordar preferencias.</li>
              <li>Mejorar la seguridad.</li>
              <li>Analizar el uso de la plataforma.</li>
              <li>Proteger formularios contra bots o abuso.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">8. Protección contra bots</h2>
            <p>
              ConversaAI puede utilizar tecnologías de protección como Cloudflare Turnstile u otros mecanismos de seguridad para prevenir spam, bots, abuso o accesos automatizados.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">9. Compartición de información</h2>
            <p className="mb-4"><strong>No vendemos datos personales.</strong></p>
            <p className="mb-4">Podemos compartir información solo cuando sea necesario con:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Proveedores tecnológicos que permiten operar la plataforma.</li>
              <li>Proveedores de autenticación como Supabase, Google o Facebook.</li>
              <li>Proveedores de IA utilizados para generar respuestas.</li>
              <li>Proveedores de pago.</li>
              <li>Servicios de hosting, email, seguridad o analítica.</li>
              <li>Autoridades competentes si existe una obligación legal.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">10. Conservación de datos</h2>
            <p>
              Conservamos la información mientras la cuenta esté activa o mientras sea necesario para operar el servicio, cumplir obligaciones legales, resolver disputas, prevenir fraude o mantener registros de seguridad.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">11. Seguridad</h2>
            <p className="mb-4">
              Aplicamos medidas técnicas y organizativas para proteger la información, incluyendo autenticación, control de acceso, reglas de seguridad, registros de actividad y restricciones por usuario.
            </p>
            <p>
              Sin embargo, ningún sistema es completamente infalible. El usuario debe proteger sus credenciales y utilizar contraseñas seguras.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">12. Derechos del usuario</h2>
            <p className="mb-4">Puedes solicitar:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400 mb-4">
              <li>Acceso a tus datos.</li>
              <li>Corrección de información incorrecta.</li>
              <li>Elimación de tu cuenta o datos, cuando sea aplicable.</li>
              <li>Limitación u oposición al tratamiento de datos.</li>
              <li>Información sobre el uso de tus datos.</li>
            </ul>
            <p>
              Para ejercer estos derechos, escríbenos a: <a href="mailto:soporte@conversaai.store" className="text-brand-cyan hover:underline">soporte@conversaai.store</a>
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">13. Menores de edad</h2>
            <p>
              ConversaAI no está dirigida a menores de edad. Si detectamos que una cuenta fue creada por una persona menor de edad sin autorización correspondiente, podremos eliminarla.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">14. Enlaces externos</h2>
            <p>
              La plataforma puede contener enlaces a sitios externos, proveedores de pago, documentación o servicios de terceros. No somos responsables por las prácticas de privacidad de sitios externos.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">15. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad para reflejar cambios legales, técnicos o comerciales. La versión vigente estará siempre disponible en: <a href="https://conversaai.store/privacidad" className="text-brand-cyan hover:underline">https://conversaai.store/privacidad</a>
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">16. Contacto</h2>
            <p>
              Para dudas sobre privacidad, tratamiento de datos o eliminación de información, contáctanos en: <a href="mailto:soporte@conversaai.store" className="text-brand-cyan hover:underline">soporte@conversaai.store</a>
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
