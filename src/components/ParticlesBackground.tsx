"use client";

export function ParticlesBackground() {
  return (
    <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
      {Array.from({ length: 35 }).map((_, i) => (
        <span
          key={i}
          className="absolute w-1 h-1 rounded-full bg-cyan-400/40 animate-pulse"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 23) % 100}%`,
            animationDelay: `${(i % 8) * 0.4}s`,
            animationDuration: `${3 + (i % 5)}s`,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(124,58,237,0.12),transparent_25%),radial-gradient(circle_at_80%_60%,rgba(6,182,212,0.10),transparent_25%)]" />
    </div>
  );
}