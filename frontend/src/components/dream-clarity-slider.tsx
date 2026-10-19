"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import './dream-clarity-slider.css';

export type DreamClaritySliderProps = {
  defaultValue?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  title?: string;
  startLabel?: string;
  endLabel?: string;
};
const point = (t: number) => ({ x: 600 * t, y: 92 - 144 * t * (1 - t) });
const particles = Array.from({ length: 28 }, (_, i) => ({
  t: (i + .5) / 28, offset: Math.sin(i * 2.399) * 38,
  r: 1.3 + (i % 4) * .4, color: ['#e6b8ce', '#c2b3df', '#a7ccdf', '#acd7ce'][i % 4],
}));

export default function DreamClaritySlider({ defaultValue = 2, value, onValueChange, onValueCommit, className, min = 1, max = 10, step = 1, title = '梦境清晰度', startLabel = '🌫 朦胧', endLabel = '✨ 清晰' }: DreamClaritySliderProps) {
  const lower = Number.isFinite(min) ? min : 1;
  const upper = Number.isFinite(max) && max > lower ? max : lower + 9;
  const increment = Number.isFinite(step) && step > 0 ? step : 1;
  const clampValue = (n: number) => {
    const safe = Number.isFinite(n) ? n : lower;
    return Number(Math.max(lower, Math.min(upper, lower + Math.round((safe - lower) / increment) * increment)).toFixed(8));
  };
  const [internal, setInternal] = useState(() => clampValue(defaultValue));
  const current = clampValue(value ?? internal);
  const t = (current - lower) / (upper - lower);
  const orb = point(t);
  const root = useRef<HTMLDivElement>(null);
  const control = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const reduced = useReducedMotion();
  const visible = useInView(root);
  const id = `clarity-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    const el = control.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    setWidth(el.clientWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const description = title !== '梦境清晰度' ? `${title}：${current}` : t <= 2/9 ? '像薄雾一样，只记得一些片段' : t <= 5/9 ? '一些画面，正在慢慢浮现' : t <= 7/9 ? '人物与场景，已经清楚可辨' : '细节鲜明，仿佛仍在梦里';
  const transition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 30 };

  return (
    <section ref={root} className={cn('dream-clarity-scope w-full rounded-3xl border border-[#e8e2ee] bg-[#fcfbfe] p-6 text-[#534b61] sm:p-8', className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={`${id}-title`} className="font-serif text-xl font-medium">{title}</h2>
        <span className="text-sm tabular-nums text-[#80758f]"><strong className="text-2xl font-medium text-[#716182]">{current}</strong> / {upper}</span>
      </div>
      <p id={`${id}-description`} className="pt-2 text-sm text-[#80758f]">{description}</p>
      <div className="relative mx-5 mt-4 aspect-[600/160]">
        <svg viewBox="0 0 600 160" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-track`} x1="0" x2="600" y1="92" y2="92" gradientUnits="userSpaceOnUse">
              <stop stopColor="#edc4d8"/><stop offset=".4" stopColor="#cdbce9"/><stop offset=".72" stopColor="#b7d0e9"/><stop offset="1" stopColor="#b5ded1"/>
            </linearGradient>
            <filter id={`${id}-mist`} x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="7"/></filter>
          </defs>
          <path d="M0 92 Q300 20 600 92" fill="none" stroke={`url(#${id}-track)`} strokeWidth="24" opacity=".45" filter={`url(#${id}-mist)`}/>
          <path d="M0 92 Q300 20 600 92" fill="none" stroke={`url(#${id}-track)`} strokeWidth="5" strokeLinecap="round" opacity=".6"/>
          <path d="M0 92 Q300 20 600 92" pathLength="1" fill="none" stroke={`url(#${id}-track)`} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${Math.max(.001, t)} 1`}/>
          <g style={{ filter: `blur(${(1-t)*2.4}px)` }}>
            {particles.map((p, i) => {
              const base = point(p.t);
              return <motion.g key={i} initial={false} animate={{ x: base.x + (orb.x-base.x)*t*.82, y: base.y + (orb.y-base.y)*t*.82 + p.offset*(1-t*.86), opacity: .4+t*.45 }} transition={transition}>
                <motion.circle r={p.r} fill={p.color} animate={{ y: !reduced && visible ? [0, -3, 0] : 0 }} transition={!reduced && visible ? { duration: 4+i%4, repeat: Infinity, ease: [.77,0,.175,1] } : { duration: 0 }}/>
              </motion.g>;
            })}
          </g>
        </svg>
        <div ref={control} className="absolute inset-0">
          <Slider min={lower} max={upper} step={increment} value={[current]}
            thumbLabel={title}
            aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
            className="nebula-control h-full"
            style={{ '--orb-y': `${orb.y * width / 600 - 22}px` } as CSSProperties}
            onPointerDownCapture={() => setDragging(true)}
            onPointerUpCapture={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            onLostPointerCapture={() => setDragging(false)}
            onValueChange={([next]) => { const n = clampValue(next); if (value === undefined) setInternal(n); onValueChange?.(n); }}
            onValueCommit={([next]) => { setDragging(false); onValueCommit?.(clampValue(next)); }}
            thumb={<motion.span className="pointer-events-none absolute inset-0 flex items-center justify-center" animate={{ scale: dragging ? 1.12 : 1 }} transition={reduced ? { duration: 0 } : { duration: .16 }}>
              <span className="absolute h-14 w-14 rounded-full bg-[radial-gradient(circle,#fff_0%,#e2d4f3_35%,transparent_72%)] opacity-90"/>
              <span className="relative h-5 w-5 rounded-full border border-white bg-[radial-gradient(circle_at_30%_25%,#fff_5%,#f9f3ff_45%,#c4afdF_100%)] shadow-[0_0_14px_#d7c5ec]"/>
            </motion.span>}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-[#80758f]"><span>{startLabel}</span><span>{endLabel}</span></div>
    </section>
  );
}
