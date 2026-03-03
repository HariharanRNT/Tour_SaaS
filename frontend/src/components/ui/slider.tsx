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
            <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[#FF6B2B] to-[#FFAC82]" />
        </SliderPrimitive.Track>
        {Array.from({ length: (props.value?.length || props.defaultValue?.length || 1) }).map((_, i) => (
            <SliderPrimitive.Thumb
                key={i}
                className="block h-5 w-5 rounded-full border-2 border-white bg-[#FF6B2B] ring-offset-background transition-shadow shadow-[0_0_0_4px_rgba(255,107,43,0.3)] hover:shadow-[0_0_0_6px_rgba(255,107,43,0.4)] focus-visible:outline-none focus-visible:shadow-[0_0_0_6px_rgba(255,107,43,0.4)] cursor-grab active:cursor-grabbing flex items-center justify-center disabled:pointer-events-none disabled:opacity-50 pointer-events-auto"
            >
                <div className="h-1.5 w-1.5 bg-white rounded-full" />
            </SliderPrimitive.Thumb>
        ))}
    </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
