"use client";

import { useEffect, useState } from "react";

export function CursorGlow() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-[9999] hidden md:block h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED]/20 blur-[90px] transition-transform duration-75"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    />
  );
}