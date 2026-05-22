"use client";

import { ShoppingBag, Stethoscope, Home, Briefcase, User, Store } from "lucide-react";

export function UseCases() {
  const cases = [
    {
      icon: <ShoppingBag className="w-8 h-8 text-brand-pink" />,
      title: "Ecommerce",
      description: "Responde dudas sobre envíos, tallas y stock. Recupera carritos abandonados automáticamente."
    },
    {
      icon: <Stethoscope className="w-8 h-8 text-brand-cyan" />,
      title: "Clínicas",
      description: "Agenda citas, envía recordatorios y responde consultas sobre servicios médicos 24/7."
    },
    {
      icon: <Home className="w-8 h-8 text-brand-blue" />,
      title: "Inmobiliarias",
      description: "Precalifica compradores, agenda visitas a propiedades y envía catálogos interactivos."
    },
    {
      icon: <Briefcase className="w-8 h-8 text-brand-violet" />,
      title: "Agencias",
      description: "Capta leads calificados, envía cotizaciones automáticas y programa reuniones de ventas."
    },
    {
      icon: <User className="w-8 h-8 text-brand-purple" />,
      title: "Coaches",
      description: "Vende cursos, responde dudas sobre programas y agenda sesiones de consultoría."
    },
    {
      icon: <Store className="w-8 h-8 text-brand-success" />,
      title: "Negocios locales",
      description: "Toma reservas, comparte ubicación, horarios y el menú o catálogo de productos."
    }
  ];

  return (
    <section className="py-24 bg-dark-secondary relative border-y border-card-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-text-main mb-4">
            Diseñado para negocios que viven de conversar
          </h2>
          <p className="text-text-secondary text-lg">
            No importa tu industria, si hablas con clientes, ConversaAI puede ayudarte.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((useCase, index) => (
            <div 
              key={index} 
              className="bg-dark-bg border border-card-border p-8 rounded-2xl hover:border-brand-violet/50 transition-colors"
            >
              <div className="mb-6">{useCase.icon}</div>
              <h3 className="text-xl font-bold text-text-main mb-3">{useCase.title}</h3>
              <p className="text-text-soft">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
