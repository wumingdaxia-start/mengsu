"use client";

import { useEffect, useRef } from "react";

/** No images or animation libraries required. Place inside an isolated page wrapper. */
export default function DeepSeaBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const compact = matchMedia("(max-width: 767px)");
    const TAU = Math.PI * 2;
    let width = 1, height = 1, frame = 0, last = 0, time = 0;
    let visible = true, disposed = false;
    // Stable random parameters: resizing never regenerates the school.
    const fish = Array.from({ length: 260 }, (_, i) => ({
      angle: Math.random() * TAU,
      radius: 0.66 + Math.random() * 0.37,
      speed: 0.055 + Math.random() * 0.075,
      size: 3.5 + Math.random() * 5,
      phase: Math.random() * TAU,
      depth: Math.random(),
      band: i % 3,
    }));
    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random(), size: 0.4 + Math.random(),
      speed: 0.004 + Math.random() * 0.008,
    }));

    // Cache background lighting once per resize instead of repainting gradients per fish.
    const light = document.createElement("canvas");
    function resize() {
      if (!canvas || !ctx) return;
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, box.width); height = Math.max(1, box.height);
      const dpr = Math.min(devicePixelRatio || 1, compact.matches ? 1.25 : 1.75);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      light.width = Math.ceil(width); light.height = Math.ceil(height);
      const bg = light.getContext("2d");
      if (bg) {
        const glow = bg.createRadialGradient(width * .5, height * .46, 0,
          width * .5, height * .46, Math.max(width, height) * .68);
        glow.addColorStop(0, "#277b9c");
        glow.addColorStop(.32, "#135879");
        glow.addColorStop(.72, "#082e4d");
        glow.addColorStop(1, "#041a32");
        bg.fillStyle = glow; bg.fillRect(0, 0, width, height);
      }
      draw();
    }

    // Parametric orbit with smooth individual drift and shared density waves.
    // Heading follows the path tangent; fish never rotate as one rigid layer.
    function position(f: typeof fish[number], t: number) {
      const a = f.angle + t * f.speed;
      const density = a + .14 * Math.sin(a * 3 + t * .045);
      const r = f.radius + .025 * Math.sin(t * .5 + f.phase);
      return {
        x: width * .5 + Math.cos(density) * width * .42 * r
          + Math.sin(t * .32 + f.phase) * width * .008,
        y: height * .52 + Math.sin(density) * height * .39 * r
          + Math.cos(t * .42 + f.phase) * height * .009,
      };
    }

    function draw() {
      if (!ctx) return;
      ctx.globalAlpha = 1;
      ctx.drawImage(light, 0, 0, width, height);

      // Broad translucent light beams, with gently shifting water distortion.
      ctx.save(); ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < 5; i++) {
        const x = width * (.12 + i * .19) + Math.sin(time * .13 + i) * width * .025;
        const beam = ctx.createLinearGradient(x, 0, x + width * .12, height);
        beam.addColorStop(0, "rgba(138,216,243,.085)");
        beam.addColorStop(1, "rgba(116,201,229,0)");
        ctx.fillStyle = beam; ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x + width * .04, 0);
        ctx.lineTo(x + width * .25, height); ctx.lineTo(x + width * .06, height);
        ctx.fill();
      }
      // Sparse underwater caustics, not a costly pixel-by-pixel filter.
      ctx.strokeStyle = "rgba(145,219,239,.04)"; ctx.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        for (let j = 0; j <= 24; j++) {
          const x = j / 24 * width;
          const y = height * (.14 + i * .12) + Math.sin(j * .55 + time * .22 + i) * 13;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();

      const count = compact.matches ? 110 : fish.length;
      const scale = Math.max(.6, Math.min(1.3, width / 1280));
      for (let i = 0; i < count; i++) {
        const f = fish[i], p = position(f, time), next = position(f, time + .08);
        const tail = Math.sin(time * (5 + f.speed * 24) + f.phase) * .65;
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(next.y - p.y, next.x - p.x));
        ctx.scale(f.size * scale, f.size * scale);
        ctx.globalAlpha = .35 + f.depth * .5;
        ctx.fillStyle = ["#8cb9cb", "#588ca8", "#b6d2dc"][f.band];
        // Head faces +X. A curved body and hinged tail create a natural silhouette.
        ctx.beginPath(); ctx.moveTo(1, 0);
        ctx.bezierCurveTo(.4, -.38, -.6, -.3 + tail * .08, -.95, tail * .13);
        ctx.bezierCurveTo(-.5, .3 + tail * .08, .4, .38, 1, 0);
        ctx.fill();
        ctx.translate(-.9, tail * .13); ctx.rotate(tail * .45);
        ctx.beginPath(); ctx.moveTo(.1, 0); ctx.lineTo(-.65, -.43);
        ctx.quadraticCurveTo(-.45, 0, -.65, .43); ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = "#b0d7e7";
      for (let i = 0; i < (compact.matches ? 28 : particles.length); i++) {
        const p = particles[i];
        const x = ((p.x + Math.sin(time * .07 + i) * .012 + 1) % 1) * width;
        const y = ((p.y - time * p.speed + 1000) % 1) * height;
        ctx.globalAlpha = .12 + .18 * (.5 + .5 * Math.sin(time * .6 + i));
        ctx.beginPath(); ctx.arc(x, y, p.size, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function tick(now: number) {
      frame = 0;
      if (disposed || document.hidden || !visible || reduced.matches) return;
      // 30 fps on small screens; timestamp-based movement remains speed independent.
      const interval = compact.matches ? 1000 / 30 : 1000 / 60;
      if (!last || now - last >= interval - .5) {
        time += last ? Math.min((now - last) / 1000, .06) : 0;
        last = now; draw();
      }
      frame = requestAnimationFrame(tick);
    }
    function resume() {
      cancelAnimationFrame(frame); frame = 0; last = 0;
      if (!disposed && !document.hidden && visible && !reduced.matches)
        frame = requestAnimationFrame(tick);
      else draw();
    }
    const observer = new ResizeObserver(resize);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting; resume();
    });
    observer.observe(canvas); visibility.observe(canvas);
    document.addEventListener("visibilitychange", resume);
    reduced.addEventListener("change", resume);
    compact.addEventListener("change", resize);
    resize(); resume();
    return () => {
      disposed = true; cancelAnimationFrame(frame);
      observer.disconnect(); visibility.disconnect();
      document.removeEventListener("visibilitychange", resume);
      reduced.removeEventListener("change", resume);
      compact.removeEventListener("change", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 h-full w-full ${className}`}
      style={{ zIndex: -1, background: "#082e4d" }} />
  );
}
