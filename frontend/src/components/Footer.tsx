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
        <footer className="bg-[#1A0D05] text-orange-200/80 py-16 border-t border-orange-900/30 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF6B2B]/5 blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-6 max-w-7xl relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
                    {/* Logo & Brand Section */}
                    <div className="md:col-span-4">
                        <Link href="/" className="flex items-center space-x-2 mb-4 group">
                            <MapPin className="h-7 w-7 text-[#FF6B2B] group-hover:scale-110 transition-transform" />
                            <div className="flex flex-col">
                                <span className="text-2xl font-black text-white font-display uppercase tracking-widest">TourSaaS</span>
                                <div className="h-0.5 w-8 bg-[#FF6B2B] mt-1 transition-all group-hover:w-full" />
                            </div>
                        </Link>
                        <p className="text-sm leading-relaxed mb-8 text-orange-100/80 max-w-xs font-medium">
                            Experience the world through a warmer lens. Premium tours designed for real travelers seeking authentic connection.
                        </p>
                        <div className="flex gap-4">
                            {[
                                { icon: <Instagram className="h-5 w-5" />, label: 'Instagram' },
                                { icon: <Twitter className="h-5 w-5" />, label: 'Twitter' },
                                { icon: <Facebook className="h-5 w-5" />, label: 'Facebook' },
                                { icon: <Youtube className="h-5 w-5" />, label: 'Youtube' }
                            ].map((social, i) => (
                                <div key={i} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF6B2B] hover:border-[#FF6B2B] hover:text-white transition-all cursor-pointer group hover:scale-110 hover:-translate-y-1 shadow-lg">
                                    {social.icon}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="md:col-span-2">
                        <h4 className="font-black text-white mb-8 uppercase text-[11px] tracking-[0.2em] opacity-90">Explore</h4>
                        <ul className="space-y-4 text-sm font-bold">
                            {['Popular Destinations', 'Special Offers', 'Trip Stories', 'Travel Guides'].map((item) => (
                                <li key={item} className="hover:text-[#FF6B2B] cursor-pointer transition-all flex items-center group">
                                    <span className="w-0 h-0.5 bg-[#FF6B2B] mr-0 group-hover:w-2 group-hover:mr-2 transition-all"></span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="md:col-span-2">
                        <h4 className="font-black text-white mb-8 uppercase text-[11px] tracking-[0.2em] opacity-90">Company</h4>
                        <ul className="space-y-4 text-sm font-bold">
                            {['About Us', 'Contact Support', 'Privacy Policy', 'Terms of Service'].map((item) => (
                                <li key={item} className="hover:text-[#FF6B2B] cursor-pointer transition-all flex items-center group">
                                    <span className="w-0 h-0.5 bg-[#FF6B2B] mr-0 group-hover:w-2 group-hover:mr-2 transition-all"></span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter Section */}
                    <div className="md:col-span-4 lg:pl-8">
                        <div className="bg-white/[0.03] p-8 rounded-[40px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#FF6B2B]/10 blur-2xl rounded-full" />
                            <h4 className="font-black text-white mb-3 text-lg font-display">Weekly Wanderlust</h4>
                            <p className="text-xs mb-6 opacity-70 font-medium">Get curated travel inspiration delivered to your inbox every Friday.</p>
                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    className="w-full bg-black/40 border border-white/10 rounded-full py-4 px-6 text-sm focus:outline-none focus:border-[#FF6B2B]/50 transition-all font-bold text-white placeholder:text-white/20"
                                />
                                <button className="absolute right-2 top-2 h-10 w-10 rounded-full bg-[#FF6B2B] text-white flex items-center justify-center hover:bg-[#FF8C66] transition-all shadow-[0_4px_12px_rgba(255,107,43,0.3)] hover:scale-105 active:scale-95">
                                    <ArrowRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar Spacer */}
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] text-white/30 font-black tracking-[0.2em] uppercase">
                        © {new Date().getFullYear()} TourSaaS. All rights reserved. Built with heart & glass.
                    </p>
                    <div className="flex gap-8 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                        <span className="hover:text-[#FF6B2B] cursor-pointer transition-colors" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to Top ↑</span>
                        <span className="hover:text-[#FF6B2B] cursor-pointer transition-colors">Sitemap</span>
                        <span className="hover:text-[#FF6B2B] cursor-pointer transition-colors">Cookies</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
