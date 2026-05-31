"use client";

import { useState, useEffect } from "react";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import { User } from "@supabase/supabase-js";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    
    // Check auth state
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  const navLinks = [
    { name: "Inicio", href: "/" },
    { name: "Funciones", href: "/#funciones" },
    { name: "Beneficios", href: "/#beneficios" },
    { name: "Cómo funciona", href: "/#como-funciona" },
    { name: "Precios", href: "/#precios" },
    { name: "FAQ", href: "/#faq" },
    { name: "Contacto", href: "/contact" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#050816]/80 backdrop-blur-xl border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
          <Image src="/logo.png" alt="ConversaAI logo" width={34} height={34} className="rounded-lg" priority />
          <span className="text-xl font-bold text-text-main tracking-tight">
            ConversaAI
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6">
          <ul className="flex items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-text-secondary hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="flex items-center gap-4 pl-4 border-l border-white/10">
            {user ? (
              <>
                <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 hover:border-brand-cyan/50 hover:bg-white/[0.08] transition-all text-sm font-medium text-white shadow-sm">
                  <LayoutDashboard className="w-4 h-4 text-brand-cyan" />
                  Dashboard
                </Link>
                <form action={signOut}>
                  <button className="gradient-btn px-5 py-2.5 rounded-full text-white font-medium text-sm hover:opacity-90 transition-opacity glow-violet flex items-center gap-2 shadow-md">
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="gradient-btn px-5 py-2.5 rounded-full text-white font-medium text-sm hover:opacity-90 transition-opacity glow-violet shadow-md">
                  Comenzar gratis
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden text-text-main"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden absolute top-full left-0 w-full bg-dark-secondary border-b border-card-border p-4 flex flex-col gap-4 shadow-xl"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-text-secondary hover:text-white font-medium p-2 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-4 mt-2">
              {user ? (
                <>
                  <p className="text-xs font-semibold text-text-soft uppercase tracking-wider px-2">Cuenta</p>
                  <Link href="/dashboard" className="text-white font-medium p-3 flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl hover:bg-white/[0.08] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                    <LayoutDashboard className="w-4 h-4 text-brand-cyan" />
                    Entrar al Dashboard
                  </Link>
                  <form action={signOut}>
                    <button className="gradient-btn w-full py-3 rounded-xl text-white font-medium glow-violet flex items-center justify-center gap-2 shadow-md">
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-text-soft uppercase tracking-wider px-2">Cuenta</p>
                  <Link href="/login" className="text-white font-medium p-3 flex items-center justify-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl hover:bg-white/[0.08] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                    Iniciar sesión
                  </Link>
                  <Link href="/register" className="gradient-btn w-full py-3 rounded-xl text-white font-medium glow-violet text-center shadow-md" onClick={() => setIsMobileMenuOpen(false)}>
                    Comenzar gratis
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
