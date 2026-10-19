"use client";
import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

// shadcn/ui Slider composition, with a custom thumb slot for the curved track.
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { thumb?: React.ReactNode; thumbLabel?: string }
>(({ className, thumb, thumbLabel, ...props }, ref) => (
  <SliderPrimitive.Root ref={ref} className={cn('relative flex w-full touch-none select-none items-center', className)} {...props}>
    <SliderPrimitive.Track className="absolute inset-x-0 top-1/2 h-px opacity-0">
      <SliderPrimitive.Range className="absolute h-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb aria-label={thumbLabel} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} className="relative block h-11 w-11 cursor-grab rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#9483b3] focus-visible:ring-offset-4 active:cursor-grabbing">
      {thumb}
    </SliderPrimitive.Thumb>
  </SliderPrimitive.Root>
));
Slider.displayName = 'Slider';
export { Slider };
