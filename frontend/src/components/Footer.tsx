'use client'

import { usePathname } from 'next/navigation'
import { MapPin, Instagram, Twitter, Facebook, Youtube, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
    const pathname = usePathname()

    // Hide footer for all admin and agent pages, and auth pages if needed
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/agent') || pathname === '/login' || pathname === '/register') {
        return null
    }

    return (
        <footer className="bg-[#111111] text-white/60 py-6 border-t border-white/10 relative overflow-hidden">

            {/* Subtle background glow */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/[0.03] blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-6 max-w-7xl relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] text-white/30 font-black tracking-[0.2em] uppercase">
                        © {new Date().getFullYear()} TOURSAAS. ALL RIGHTS RESERVED.
                    </p>
                    <div className="flex gap-8 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                        <span className="hover:text-white cursor-pointer transition-colors" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>BACK TO TOP ↑</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
