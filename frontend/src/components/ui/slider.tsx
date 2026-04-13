"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SliderPrimitive.Root
        ref={ref}
        orientation="horizontal"
        onPointerDown={(e) => {
            e.stopPropagation();
            props.onPointerDown?.(e);
        }}
        onTouchStart={(e) => {
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
            props.onTouchStart?.(e)
        }}
        className={cn(
            "relative flex flex-row w-full touch-none select-none items-center",
            className
        )}
        style={{ touchAction: 'none' }}
        {...props}
    >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/30 pointer-events-none">
            <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[var(--primary)] to-[#FFAC82]" />
        </SliderPrimitive.Track>
        {Array.from({ length: (props.value?.length || props.defaultValue?.length || 1) }).map((_, i) => (
            <SliderPrimitive.Thumb
                key={i}
                className="block h-6 w-6 rounded-full border-2 border-white bg-[var(--primary)] ring-offset-background transition-all shadow-[0_2px_10px_rgba(0,0,0,0.1),0_0_0_4px_var(--primary-glow)] hover:shadow-[0_2px_15px_rgba(0,0,0,0.15),0_0_0_6px_var(--primary-glow)] focus-visible:outline-none focus-visible:shadow-[0_0_0_6px_var(--primary-glow)] cursor-grab active:cursor-grabbing active:scale-110 flex items-center justify-center disabled:pointer-events-none disabled:opacity-50 pointer-events-auto"
            >
                <div className="h-2 w-2 bg-white rounded-full shadow-inner" />
            </SliderPrimitive.Thumb>
        ))}
    </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
