"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className?: string;
  background?: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
  description: string;
  href?: string;
  cta?: string;
}) => (
  <div
    className={cn(
      "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-xl",
      "bg-white/[0.04] border-white/10 backdrop-blur-xl shadow-none",
      className,
    )}
  >
    <div className="absolute inset-0 -z-10">{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
      <div className="flex origin-left transform-gpu items-center gap-3 transition-all duration-300 ease-in-out group-hover:scale-75 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-violet/10 border border-brand-violet/20">
          <Icon className="h-5 w-5 text-brand-cyan" />
        </div>
        <h3 className="text-xl font-semibold text-white">{name}</h3>
      </div>
      <p className="max-w-lg text-slate-400">{description}</p>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
      )}
    >
      {cta && href && (
        <a href={href} className="pointer-events-auto text-brand-cyan hover:underline text-sm font-medium">
          {cta} &rarr;
        </a>
      )}
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-white/5" />
  </div>
);
