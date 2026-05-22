"use client";

import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

export function ParticlesBackground() {
  const particlesInit = async (engine: any) => {
    await loadSlim(engine);
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: false,
        background: {
          color: "transparent",
        },
        fpsLimit: 60,
        particles: {
          color: {
            value: ["#7C3AED", "#06B6D4", "#2563EB"],
          },
          links: {
            color: "#7C3AED",
            distance: 120,
            enable: true,
            opacity: 0.15,
            width: 1,
          },
          move: {
            enable: true,
            speed: 1,
          },
          number: {
            value: 40,
          },
          opacity: {
            value: 0.3,
          },
          size: {
            value: { min: 1, max: 3 },
          },
        },
      }}
      className="absolute inset-0 z-[1]"
    />
  );
}