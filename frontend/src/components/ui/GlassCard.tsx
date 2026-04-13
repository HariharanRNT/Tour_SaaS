import React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 group hover:shadow-xl rounded-[20px]", 
        className
      )}
      style={{ 
        background: 'rgba(255,255,255,0.25)', 
        backdropFilter: 'blur(12px)', 
        WebkitBackdropFilter: 'blur(12px)', 
        border: '1px solid rgba(255,255,255,0.3)', 
        boxShadow: '0 8px 32px rgba(180, 100, 60, 0.08)',
      }}
      {...props}
    >
      {children}
    </Card>
  )
}
