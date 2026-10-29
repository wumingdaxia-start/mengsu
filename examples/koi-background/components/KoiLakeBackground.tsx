'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { createKoiLake } from './koi-lake';

/** Fixed page background; put content in a relative z-10 container above it.
 * The supplied image is retained, with photograph-derived koi, petals and ripples.
 * Use inside a relative isolate wrapper so the negative z-index remains visible.
 */
export default function KoiLakeBackground({ className = '' }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!canvas.current) return;
    const scene = createKoiLake(canvas.current, { base: '/' });
    let frame = 0, previous = 0;
    const resize = () => scene.resize(innerWidth, innerHeight);
    const pointer = (event: PointerEvent) => scene.move(event.clientX, event.clientY);
    const tick = (now: number) => {
      scene.render(Math.min((now - previous) / 1000, .06), now / 1000);
      previous = now;
      if (!reduce && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) { previous = performance.now(); frame = requestAnimationFrame(tick); }
    };
    resize(); visibility();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointer, { passive: true });
    window.addEventListener('pointerdown', pointer, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame); scene.destroy();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', pointer);
      window.removeEventListener('pointerdown', pointer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [reduce]);
  return (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#91ada7] ${className}`}>
      {/* Image fallback remains visible while Canvas loads. The reference is cover-fit at every ratio. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/osmanthus-koi-photo.jpg" alt="" className="absolute size-full object-cover" />
      <canvas ref={canvas} className="absolute inset-0 size-full" />
      <motion.div
        className="absolute inset-0 bg-[#fff3ce]/[0.04]"
        initial={false}
        animate={{ opacity: reduce ? .5 : [.3, .65, .3] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
