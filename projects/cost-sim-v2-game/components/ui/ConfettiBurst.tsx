"use client";

import { useEffect, useState } from "react";

/**
 * CSS-only confetti burst — no library, no canvas, ~1KB.
 * Spawns 14 absolutely-positioned divs with randomized hue + transform keyframes,
 * unmounts after the animation completes so it never leaks DOM weight.
 *
 * Trigger by mounting it conditionally. Each mount = one burst.
 */

const PARTICLE_COUNT = 14;
const DURATION_MS = 900;

interface Particle {
  id: number;
  left: number; // 0..100 vw% within the burst origin
  hue: number;
  rotate: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export interface ConfettiBurstProps {
  /** Increment to retrigger; same value = same burst */
  trigger: number;
}

export default function ConfettiBurst({ trigger }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (trigger <= 0) return;
    if (reducedMotion) return;
    const next: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: trigger * 1000 + i,
      left: 50 + (Math.random() - 0.5) * 14,
      hue: 160 + Math.floor(Math.random() * 60),
      rotate: Math.random() * 360,
      dx: (Math.random() - 0.5) * 240,
      dy: -60 - Math.random() * 220,
      size: 6 + Math.random() * 6,
      delay: Math.random() * 60
    }));
    setParticles(next);
    const t = setTimeout(() => setParticles([]), DURATION_MS + 100);
    return () => clearTimeout(t);
  }, [trigger, reducedMotion]);

  if (particles.length === 0) return null;

  return (
    <div
      data-test="confetti"
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-30 h-0 w-full"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute block rounded-sm"
          style={{
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size * 0.6,
            background: `hsl(${p.hue} 90% 60%)`,
            boxShadow: `0 0 8px hsl(${p.hue} 90% 60% / 0.5)`,
            transform: `translate(-50%, 0) rotate(${p.rotate}deg)`,
            animation: `confetti-fly ${DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${p.delay}ms forwards`,
            ["--dx" as string]: `${p.dx}px`,
            ["--dy" as string]: `${p.dy}px`
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fly {
          0%   { opacity: 0; transform: translate(-50%, 0) rotate(0deg) scale(0.6); }
          10%  { opacity: 1; }
          70%  { opacity: 1; }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--dx)), var(--dy)) rotate(720deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
