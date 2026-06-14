"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AnimatePresence, motion } from "framer-motion";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-dark-bg text-text-main flex relative">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block z-20">
        <Sidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#050816] border-r border-white/10 z-50 shadow-2xl lg:hidden flex flex-col"
            >
              <Sidebar onNavClick={closeMobileMenu} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top bar */}
        <Topbar onMenuClick={toggleMobileMenu} />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 relative overflow-y-auto">
          {/* Background glows */}
          <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] bg-brand-violet/5 rounded-full blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-cyan/5 rounded-full blur-[100px]" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
