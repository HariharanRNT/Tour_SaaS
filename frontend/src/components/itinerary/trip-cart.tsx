'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, ShoppingCart, Lock, ShieldCheck, Clock, Users, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TripCartProps {
    travelers: {
        adults: number
        children: number
        infants: number
    }
    duration?: {
        days: number
        nights: number
    }
    basePrice: number
    services?: { name: string; price: number }[]
    currency?: string
    gstSettings?: {
        inclusive: boolean
        percentage: number
    }
    onCheckout: () => void
    loading?: boolean
    disabled?: boolean
    // Theme Props
    sidebarBg?: string
    priceColor?: string
    ctaColor?: string
    ctaTextColor?: string
    priceGuaranteed?: boolean
}

export function TripCart({
    travelers,
    duration = { days: 0, nights: 0 },
    basePrice,
    services = [],
    currency = 'INR',
    gstSettings,
    onCheckout,
    loading = false,
    disabled = false,
    sidebarBg,
    priceColor,
    ctaColor,
    ctaTextColor,
    priceGuaranteed = true
}: TripCartProps) {
    const totalTravelers = travelers.adults + travelers.children + (travelers.infants || 0)

    // Calculate totals
    const totalBasePrice = basePrice * totalTravelers
    const totalServicesPrice = services.reduce((sum, service) => sum + service.price, 0)

    // GST Calculation
    let gstAmount = 0
    let subTotal = totalBasePrice + totalServicesPrice
    let grandTotal = subTotal

    if (gstSettings && !gstSettings.inclusive) {
        gstAmount = (subTotal * gstSettings.percentage) / 100
        grandTotal = subTotal + gstAmount
    }

    return (
        <Card
            className="sticky top-24 shadow-2xl border-0 bg-[rgba(80,40,10,0.35)] backdrop-blur-[14px] overflow-hidden rounded-[2.5rem] transition-all duration-500 ring-1 ring-white/15"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        >
            {/* Header */}
            <CardHeader className="bg-white/5 py-5 border-b border-white/10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                <CardTitle className="flex items-center gap-2.5 text-lg font-bold relative z-10 font-display">
                    <div className="p-2 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] rounded-xl text-white shadow-lg ring-1 ring-white/20">
                        <ShoppingCart className="h-4 w-4" />
                    </div>
                    Trip Summary
                </CardTitle>
                <CardDescription className="text-white/60 font-bold pl-1 relative z-10 text-[11px] italic">
                    Ready for your dream escape?
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-5 space-y-5">
                {/* Traveler & Duration Info - Pill Style */}
                <div className="flex items-center justify-between bg-white/5 p-1 rounded-[1.2rem] border border-white/10">
                    <div className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
                        <Users className="h-3.5 w-3.5 text-[var(--primary)]" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[8px] text-white/40 font-black uppercase tracking-widest mb-0.5">Travelers</span>
                            <span className="font-bold text-white text-xs">{totalTravelers} People</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-xl ml-1">
                        <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[8px] text-white/40 font-black uppercase tracking-widest mb-0.5">Duration</span>
                            <span className="font-bold text-white text-xs">{duration.days}D / {duration.nights}N</span>
                        </div>
                    </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-5">
                    {/* Base Price Section */}
                    <div className="group">
                        <div className="flex justify-between text-white/40 text-[10px] mb-1 uppercase tracking-widest font-black">
                            <span>Base Package (Per Person)</span>
                            <span className="text-white/80">₹{basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-white/60 font-bold flex items-center gap-2">
                                <Users className="h-3 w-3 opacity-50 text-[var(--primary)]" />
                                <span className="text-[10px]">x {totalTravelers} Travelers</span>
                            </span>
                            <span className="font-black text-lg text-white">₹{totalBasePrice.toLocaleString()}</span>
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Services Section */}
                    {services.length > 0 && (
                        <div className="space-y-2 pt-0.5">
                            {services.map((service, index) => (
                                <div key={index} className="flex flex-col space-y-2 py-2 border-b border-white/10 last:border-0 group">
                                    <div className="flex justify-between items-start text-xs">
                                        <span className="flex items-center gap-2 text-white/70 font-bold">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                                            <div className="flex flex-col">
                                                <span>{service.name}</span>
                                                {service.name.includes('Flight') && (
                                                    <span className="text-[9px] text-[var(--primary)] font-black uppercase tracking-tighter">Live Fare Rate</span>
                                                )}
                                            </div>
                                        </span>
                                        <span className="font-black text-white whitespace-nowrap">₹{service.price.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                            <Separator className="bg-white/10 my-1.5" />
                        </div>
                    )}

                    {/* Subtotal / Taxes & Fees Section */}
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10 shadow-sm">
                        <span className="text-white/40 font-black text-[9px] uppercase tracking-[0.2em]">
                            {gstSettings && !gstSettings.inclusive ? "Net Amount" : "Taxes & Fees"}
                        </span>
                        {gstSettings && !gstSettings.inclusive ? (
                            <span className="font-black text-white text-sm">₹{subTotal.toLocaleString()}</span>
                        ) : (
                            <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                <span className="text-[9px] font-bold tracking-widest uppercase">Included</span>
                            </div>
                        )}
                    </div>

                    {/* GST Section (Exclusive) - Now below Subtotal/Net Amount */}
                    {gstSettings && !gstSettings.inclusive && (
                        <div className="flex justify-between items-center text-[11px] group bg-[var(--primary)]/10 p-2.5 rounded-xl border border-[var(--primary)]/20">
                            <span className="flex items-center gap-2 text-[var(--primary)] font-black uppercase tracking-widest">
                                GST ({gstSettings.percentage}%)
                            </span>
                            <span className="font-black text-white">₹{gstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                </div>

                {/* Total */}
                <div className="bg-white/5 -mx-6 -mb-6 p-6 text-white mt-4 relative overflow-hidden border-t border-white/10">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 space-y-5">
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">Total Amount</span>
                                {gstSettings && gstSettings.inclusive && (
                                    <span className="text-[9px] text-emerald-400 font-black tracking-widest">INC. ALL TAXES</span>
                                )}
                                {priceGuaranteed && (
                                    <div className="mt-1 flex items-center gap-1.5 bg-white/10 border border-white/20 px-2 py-0.5 rounded-md self-start shadow-sm">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[8px] font-black text-white/80 uppercase tracking-wider">Price Locked</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-black tracking-tighter text-white font-display">
                                    ₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>

                        <Button
                            id="checkout-trigger"
                            className="w-full h-13 text-white font-bold text-base rounded-xl shadow-[0_8px_30px_var(--primary-glow)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 border border-white/20"
                            onClick={onCheckout}
                            disabled={loading || disabled}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <div className="flex items-center justify-center w-full gap-2.5">
                                    <ShieldCheck className="h-5 w-5" />
                                    <span>Confirm & Pay Securely</span>
                                </div>
                            )}
                        </Button>

                        <div className="flex items-center justify-center gap-4 pt-1">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-white/30 uppercase tracking-[0.15em]">
                                <Lock className="h-2.5 w-2.5" /> 256-bit Secure
                            </div>
                            <div className="w-0.5 h-0.5 rounded-full bg-white/10"></div>
                            <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em]">
                                Instant Booking
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
            {/* Footer padding compensation for negative margin above */}
            <div className="h-2 bg-white/5"></div>
        </Card>
    )
}
