"use client";

import { useState, useEffect } from "react";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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
  ];

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-dark-bg/80 backdrop-blur-xl border-b border-card-border py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(124,58,237,0.5)]">
            C
          </div>
          <span className="text-xl font-bold text-text-main tracking-tight">
            ConversaAI
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          <ul className="flex items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-text-secondary hover:text-brand-cyan transition-colors"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm font-medium text-text-secondary hover:text-text-main transition-colors flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <form action={signOut}>
                  <button className="gradient-btn px-5 py-2.5 rounded-full text-white font-medium text-sm hover:opacity-90 transition-opacity glow-violet flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-text-main transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="gradient-btn px-5 py-2.5 rounded-full text-white font-medium text-sm hover:opacity-90 transition-opacity glow-violet">
                  Comenzar ahora
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
                className="text-text-main font-medium p-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="border-t border-card-border pt-4 flex flex-col gap-4">
              {user ? (
                <>
                  <Link href="/dashboard" className="text-text-main font-medium p-2 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <form action={signOut}>
                    <button className="gradient-btn w-full py-3 rounded-xl text-white font-medium glow-violet flex items-center justify-center gap-2">
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-text-main font-medium p-2 text-center">
                    Iniciar sesión
                  </Link>
                  <Link href="/register" className="gradient-btn w-full py-3 rounded-xl text-white font-medium glow-violet text-center">
                    Comenzar ahora
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
