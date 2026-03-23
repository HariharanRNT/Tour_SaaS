'use client'

import React, { useState, useEffect } from 'react'
import { Check, Send, Mail, Sun, Moon, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BookingData {
    customerName: string
    referenceId: string
    packageName: string
    travelDate: string
    travelers: number
    totalAmount: number
    itinerarySummary: string
}

interface EmailTemplatePickerProps {
    bookingData: BookingData
    onSend?: (themeId: string) => void
    initialTheme?: string
    onThemeChange?: (themeId: string) => void
    showSendButton?: boolean
    customMessage?: string
}

const themes = [
    {
        id: 'classic',
        name: 'Classic Elegance',
        description: 'Clean white layout, blue accent headers. Professional and trustworthy.',
        icon: Mail,
        colors: { primary: '#2563eb', bg: '#ffffff' }
    },
    {
        id: 'tropical',
        name: 'Tropical Wanderlust',
        description: 'Warm sunset gradient, bold sans-serif, and travel-inspired accents.',
        icon: Sun,
        colors: { primary: '#f97316', bg: 'linear-gradient(to bottom right, #fb923c, #f43f5e, #fbbf24)' }
    },
    {
        id: 'midnight',
        name: 'Midnight Luxury',
        description: 'Dark navy background, gold accent text. Premium feel with subtle texture.',
        icon: Moon,
        colors: { primary: '#fbbf24', bg: '#0f172a' }
    }
]

export function EmailTemplatePicker({ 
    bookingData, 
    onSend, 
    initialTheme = 'classic',
    onThemeChange,
    showSendButton = true,
    customMessage
}: EmailTemplatePickerProps) {
    const [selectedTheme, setSelectedTheme] = useState(initialTheme)

    useEffect(() => {
        setSelectedTheme(initialTheme)
    }, [initialTheme])

    const handleThemeSelect = (themeId: string) => {
        setSelectedTheme(themeId)
        if (onThemeChange) onThemeChange(themeId)
    }

    const renderPreview = (themeId: string, isMini = false) => {
        const data = bookingData
        
        // Helper to resolve placeholders
        const resolvePlaceholders = (text: string) => {
            if (!text) return text;
            const displayPackage = data.packageName;
            const p_the = displayPackage.toLowerCase().startsWith('the ') ? '' : 'the ';
            
            return text
                .replace(/{package_name}/g, `<strong>${displayPackage}</strong>`)
                .replace(/{customer_name}/g, data.customerName)
                .replace(/{reference_id}/g, data.referenceId)
                .replace(/{agency_name}/g, "TourSaaS")
                .replace(/{travel_date}/g, data.travelDate)
                .replace(/{travelers}/g, `${data.travelers}`)
                .replace(/{total_amount}/g, `$${data.totalAmount.toLocaleString()}`);
        };

        const displayPackage = data.packageName;
        const p_the = displayPackage.toLowerCase().startsWith('the ') ? '' : 'the ';

        if (themeId === 'classic') {
            return (
                <div className={cn("bg-white text-slate-900 font-serif border border-slate-200 overflow-hidden", isMini ? "scale-[0.25] origin-top-left w-[400%] h-[400%]" : "w-full max-w-2xl mx-auto rounded-xl shadow-2xl p-10")}>
                    <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6 mb-8 text-left">
                        <div>
                            <h1 className="text-3xl font-bold text-blue-800 tracking-tight">Booking Confirmation</h1>
                            <p className="text-slate-500 italic text-sm mt-1">Official Document | Ref: {data.referenceId}</p>
                        </div>
                        <div className="text-right">
                             <div className="text-blue-600 font-bold text-xl uppercase tracking-tighter">TourSaaS</div>
                             <div className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Global Travel Group</div>
                        </div>
                    </div>
                    
                    <div className="mb-10 text-left">
                        <p className="text-xl mb-4 text-slate-800 italic">Dear <strong>{data.customerName}</strong>,</p>
                        <div className="leading-relaxed text-slate-600 text-lg">
                            {customMessage ? (
                                <p dangerouslySetInnerHTML={{ __html: resolvePlaceholders(customMessage).replace(/\n/g, '<br/>') }} />
                            ) : (
                                <p>Your journey with us is officially confirmed. We are truly delighted to host you for the upcoming {p_the}<strong>{displayPackage}</strong>. Our team is now preparing all the details to ensure your trip is seamless and memorable.</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-slate-50/80 p-8 rounded-2xl border border-slate-100 mb-10 relative overflow-hidden text-left">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16"></div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-200 pb-2">Voyage Particulars</h2>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-1">
                                <span className="text-slate-400 uppercase tracking-wider font-sans text-[10px] font-black">Departure Date</span>
                                <p className="font-sans font-bold text-slate-800 text-lg">{data.travelDate}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-slate-400 uppercase tracking-wider font-sans text-[10px] font-black">Travel Delegation</span>
                                <p className="font-sans font-bold text-blue-700 text-lg">{data.travelers} Persons</p>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <span className="text-slate-400 uppercase tracking-wider font-sans text-[10px] font-black">Itinerary Highlights</span>
                                <p className="italic text-slate-600 leading-snug">{data.itinerarySummary}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-end py-6 border-t border-slate-100">
                        <div className="space-y-1 text-left">
                             <span className="text-slate-400 font-sans font-bold uppercase text-[10px] tracking-widest">Total Investment</span>
                             <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 uppercase text-[9px] font-black px-2">Paid in Full</Badge>
                             </div>
                        </div>
                        <span className="text-4xl font-black text-slate-900 font-sans tracking-tighter">${data.totalAmount.toLocaleString()}</span>
                    </div>
                    
                    <div className="mt-12 text-center text-[10px] text-slate-400 font-sans uppercase tracking-[0.3em]">
                        <p>© 2026 TourSaaS Travel Group | Secure Booking Protocol</p>
                    </div>
                </div>
            )
        }
        
        if (themeId === 'tropical') {
            return (
                <div className={cn("bg-[#fff9f4] text-orange-950 font-sans border-4 border-orange-100 overflow-hidden relative", isMini ? "scale-[0.25] origin-top-left w-[400%] h-[400%]" : "w-full max-w-2xl mx-auto rounded-[40px] shadow-2xl p-10")}>
                    {/* Decorative Leaves Background */}
                    <div className="absolute top-0 right-0 w-48 h-48 animate-pulse p-4 opacity-5 pointer-events-none">
                         <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <path fill="currentColor" d="M100 0c55.23 0 100 44.77 100 100s-44.77 100-100 100S0 155.23 0 100 44.77 0 100 0z" />
                         </svg>
                    </div>
                    
                    <div className="bg-gradient-to-br from-[#ff7e5f] via-[#feb47b] to-[#ffcc33] rounded-[32px] p-10 text-white mb-10 relative overflow-hidden shadow-xl shadow-orange-200 text-left">
                        <div className="absolute top-0 right-0 p-8 opacity-20 transform rotate-12">
                            <Sun className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <Badge className="bg-white/20 text-white border-white/40 backdrop-blur-md mb-4 uppercase tracking-widest text-[10px] font-black">Confirmed Escape</Badge>
                            <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-2">Paradise <br/> Awaits!</h1>
                            <p className="font-bold text-orange-50/80 flex items-center gap-2">
                                <span className="w-8 h-px bg-white/40"></span>
                                {data.referenceId}
                            </p>
                        </div>
                    </div>
                    
                    <div className="mb-10 space-y-4 px-2 text-left">
                        <h2 className="text-3xl font-black text-[#ff4b2b] tracking-tight">Aloha, {data.customerName}!</h2>
                        <p className="text-xl leading-relaxed text-slate-600 font-medium italic">"The tan will fade, but the memories will last forever."</p>
                        <div className="text-lg leading-relaxed text-slate-700">
                            {customMessage ? (
                                <p dangerouslySetInnerHTML={{ __html: resolvePlaceholders(customMessage).replace(/\n/g, '<br/>') }} />
                            ) : (
                                <p>Get ready to soak up the sun. Your adventure to {p_the}<strong>{displayPackage}</strong> is fully reserved! Our team is already preparing for your arrival to ensure every moment is sun-drenched and stress-free.</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-10">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-50 flex flex-col items-center text-center gap-2">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                <Sun className="w-6 h-6 text-orange-500" />
                            </div>
                            <span className="uppercase font-black text-[10px] text-orange-300 tracking-widest">Date</span>
                            <p className="text-xl font-black text-slate-800">{data.travelDate.split(',')[0]}</p>
                        </div>
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-50 flex flex-col items-center text-center gap-2">
                            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                                <Check className="w-6 h-6 text-rose-500" />
                            </div>
                            <span className="uppercase font-black text-[10px] text-orange-300 tracking-widest">Travelers</span>
                            <p className="text-xl font-black text-slate-800">{data.travelers} People</p>
                        </div>
                    </div>
                    
                    <div className="bg-[#1a1a1a] text-white rounded-[32px] p-8 flex flex-col items-center gap-2 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <span className="uppercase font-black text-[10px] tracking-[0.3em] opacity-60">Complete Trip Value</span>
                        <span className="text-5xl font-black tracking-tighter relative z-10">${data.totalAmount.toLocaleString()}</span>
                        <div className="mt-4 flex items-center gap-2 relative z-10">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-orange-400">Transaction Secured</span>
                        </div>
                    </div>
                </div>
            )
        }
        
        if (themeId === 'midnight') {
            return (
                <div className={cn("bg-[#020617] text-slate-100 font-sans border border-slate-800 overflow-hidden relative", isMini ? "scale-[0.25] origin-top-left w-[400%] h-[400%]" : "w-full max-w-2xl mx-auto rounded-3xl shadow-[0_0_100px_rgba(37,99,235,0.1)] p-0")}>
                    {/* Subtle Texture/Grid */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                    
                    <div className="bg-slate-900/50 backdrop-blur-xl py-14 px-10 border-b border-amber-500/20 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 transform rotate-12 opacity-5">
                             <Moon className="w-32 h-32" />
                        </div>
                        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-8"></div>
                        <h1 className="text-sm font-black tracking-[0.5em] uppercase text-amber-500/80 mb-4 px-4">Reservation Finalized</h1>
                        <h2 className="text-6xl font-extralight tracking-tighter text-white mb-6">Confirmed</h2>
                        <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/30 px-4 py-1 rounded-full text-xs font-mono tracking-widest">ID: {data.referenceId}</Badge>
                    </div>
                    
                    <div className="p-12 space-y-14 relative z-10 text-left">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-light tracking-tight leading-tight">Welcome to the Elite Tier, <br/> <span className="text-amber-400 font-medium">{data.customerName.split(' ')[0]}</span>.</h2>
                            <div className="text-slate-400 font-light text-lg leading-relaxed">
                                {customMessage ? (
                                    <p dangerouslySetInnerHTML={{ __html: resolvePlaceholders(customMessage).replace(/\n/g, '<br/>') }} />
                                ) : (
                                    <p>It is our privilege to confirm your passage for {p_the}<strong>{displayPackage}</strong>. Our concierges are currently finalizing every bespoke detail of your itinerary to ensure absolute perfection upon your arrival.</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-16 border-y border-slate-800/50 py-10">
                             <div className="space-y-3">
                                <h3 className="text-amber-500/40 uppercase text-[9px] tracking-[0.4em] font-black">Commencement</h3>
                                <p className="text-2xl font-light text-slate-200">{data.travelDate.split(',')[0]}</p>
                                <p className="text-[10px] text-slate-500 lowercase tracking-widest">{data.travelDate} </p>
                            </div>
                             <div className="space-y-3">
                                <h3 className="text-amber-500/40 uppercase text-[9px] tracking-[0.4em] font-black">Delegation</h3>
                                <p className="text-2xl font-light text-slate-200">{data.travelers} Guests</p>
                                <div className="flex gap-1">
                                    {[...Array(3)].map((_, i) => <div key={i} className="w-1 h-1 bg-amber-500/30 rounded-full"></div>)}
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50">
                             <h3 className="text-amber-500/40 uppercase text-[9px] tracking-[0.4em] font-black">Program Highlights</h3>
                             <p className="text-base text-slate-300 font-light leading-relaxed mb-2">{data.itinerarySummary}</p>
                             <div className="flex items-center gap-2 text-[10px] text-amber-500/60 font-black uppercase tracking-widest">
                                <Info className="w-3 h-3" />
                                Custom Concierge Assigned
                             </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4">
                            <div className="flex flex-col gap-1 text-left">
                                <span className="text-slate-500 uppercase text-[9px] tracking-[0.4em] font-black">Portfolio Value</span>
                                <Badge variant="outline" className="text-amber-400 border-amber-400/20 bg-amber-400/5 text-[9px] font-black">Verified & Secure</Badge>
                            </div>
                            <div className="text-right">
                                <span className="text-5xl font-extralight text-amber-500 tracking-tighter">${data.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-10 text-center border-t border-slate-800/50 bg-slate-900/20">
                        <p className="text-[9px] uppercase tracking-[0.5em] text-slate-500 font-medium">TourSaaS Private Reserve | Bespoke Voyage Management</p>
                    </div>
                </div>
            )
        }
        
        return null
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-10 p-4">
            {/* Theme Selector */}
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Mail className="w-8 h-8 text-[var(--primary)]" />
                        Choose Email Theme
                    </h2>
                    <p className="text-slate-500 max-w-2xl text-lg">Select a visual style that matches your agent brand or the customer's travel personality.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {themes.map((theme) => {
                        const Icon = theme.icon
                        const isSelected = selectedTheme === theme.id
                        
                        return (
                            <Card 
                                key={theme.id}
                                className={cn(
                                    "relative group cursor-pointer border-2 transition-all duration-500 overflow-hidden bg-white/40 backdrop-blur-xl rounded-[28px]",
                                    isSelected 
                                        ? "border-[var(--primary)] shadow-[0_20px_50px_rgba(var(--primary-rgb),0.2)] ring-4 ring-[var(--primary)]/10" 
                                        : "border-white/40 hover:border-white hover:bg-white/60 hover:shadow-2xl"
                                )}
                                onClick={() => handleThemeSelect(theme.id)}
                            >
                                {/* Mini Preview Thumbnail Container */}
                                <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden relative border-b border-slate-100">
                                    <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-transparent transition-colors z-10"></div>
                                    <div className="w-full h-full pointer-events-none">
                                        {renderPreview(theme.id, true)}
                                    </div>
                                    
                                    {isSelected && (
                                        <div className="absolute top-4 right-4 z-20 bg-[var(--primary)] text-white p-2 rounded-full shadow-lg scale-110 animate-in zoom-in-50 duration-300">
                                            <Check className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-6 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg",
                                            theme.id === 'classic' ? 'bg-blue-600' :
                                            theme.id === 'tropical' ? 'bg-orange-500' : 'bg-slate-900'
                                        )}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-black text-xl text-slate-800">{theme.name}</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                        {theme.description}
                                    </p>
                                </div>
                                
                                {isSelected && (
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--primary)]"></div>
                                )}
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* Live Preview Panel */}
            <div className="space-y-6 pt-10 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                             Full Size Preview
                             <Badge variant="outline" className="ml-2 uppercase tracking-wide text-[10px] h-5 bg-[var(--primary)]/5 border-[var(--primary)]/20 text-[var(--primary)] font-bold">
                                Live
                             </Badge>
                        </h3>
                        <p className="text-sm text-slate-400 font-medium">This is exactly how your customer will see the confirmation email.</p>
                    </div>
                    
                    {showSendButton && onSend && (
                        <Button 
                            size="lg"
                            className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-black rounded-full px-8 py-7 text-lg shadow-[0_15px_30px_rgba(var(--primary-rgb),0.3)] hover:scale-105 transition-all flex items-center gap-3"
                            onClick={() => onSend(selectedTheme)}
                        >
                            Send Confirmation Email
                            <Send className="w-5 h-5" />
                        </Button>
                    )}
                </div>
                
                <div className="bg-slate-50/50 backdrop-blur-sm rounded-[40px] border-2 border-dashed border-slate-200 p-12 flex justify-center items-start min-h-[600px] relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-[var(--primary)]/5 rounded-full blur-[80px]"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]"></div>
                    
                    <div className="w-full relative z-10 transition-all duration-700 ease-in-out">
                         {renderPreview(selectedTheme)}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 justify-center py-6 text-slate-400 text-sm font-medium">
                <Info className="w-4 h-4" />
                <span>You can edit the customer's personal details before sending if required.</span>
                <button className="text-[var(--primary)] font-black hover:underline ml-1">Edit Info</button>
            </div>
        </div>
    )
}
