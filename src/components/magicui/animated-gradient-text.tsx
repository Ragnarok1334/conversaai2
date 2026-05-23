"use client";

import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

export function AnimatedGradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block bg-gradient-to-r from-brand-violet via-brand-cyan to-brand-blue bg-clip-text text-transparent animate-gradient bg-300%",
        className
      )}
    >
      {children}
    </span>
  );
}
