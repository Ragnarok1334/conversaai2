"use client";

import { useState, useEffect } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Inicio", href: "#" },
    { name: "Funciones", href: "#funciones" },
    { name: "Beneficios", href: "#beneficios" },
    { name: "Cómo funciona", href: "#como-funciona" },
    { name: "Precios", href: "#precios" },
    { name: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isScrolled
          ? "py-4 bg-[#050816]/80 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
          : "py-6 bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div
          className={`flex items-center justify-between transition-all duration-500 ${
            isScrolled
              ? "rounded-2xl"
              : "rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/10 px-4 py-3 shadow-[0_0_40px_rgba(124,58,237,0.08)]"
          }`}
        >
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] flex items-center justify-center font-bold text-white shadow-[0_0_25px_rgba(124,58,237,0.45)] group-hover:scale-105 transition-transform duration-300">
              C
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] blur-xl opacity-40 -z-10" />
            </div>

            <span className="text-xl font-bold text-white tracking-tight">
              Conversa<span className="text-[#06B6D4]">AI</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            <ul className="flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl p-1">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="px-4 py-2 rounded-full text-sm font-medium text-[#CBD5E1] hover:text-white hover:bg-white/[0.07] transition-all duration-300"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>

            <a
              href="#precios"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white font-semibold text-sm hover:scale-105 transition-all duration-300 shadow-[0_0_35px_rgba(124,58,237,0.42)]"
            >
              <Sparkles className="w-4 h-4" />
              Comenzar ahora
            </a>
          </nav>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/10 text-white flex items-center justify-center"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Abrir menú"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden absolute top-full left-0 w-full px-4 md:px-6"
          >
            <div className="mt-3 rounded-[2rem] bg-[#050816]/95 backdrop-blur-2xl border border-white/10 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-white/90 font-medium px-4 py-3 rounded-2xl hover:bg-white/[0.07] transition-all"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                ))}
              </div>

              <a
                href="#precios"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white font-semibold shadow-[0_0_35px_rgba(124,58,237,0.42)]"
              >
                <Sparkles className="w-4 h-4" />
                Comenzar ahora
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
