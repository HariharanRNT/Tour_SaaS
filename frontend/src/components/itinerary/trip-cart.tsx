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
    ctaTextColor
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
            className="sticky top-24 shadow-2xl border-0 bg-[#3A1A08] overflow-hidden rounded-[2.5rem] transition-all duration-500 ring-1 ring-white/5"
        >
            {/* Header */}
            <CardHeader className="bg-[#4D250D] pb-8 pt-8 border-b border-orange-100/10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8682A]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <CardTitle className="flex items-center gap-3 text-2xl font-bold relative z-10 font-display">
                    <div className="p-3 bg-gradient-to-br from-[#E8682A] to-[#F4A261] rounded-2xl text-white shadow-lg ring-1 ring-white/20">
                        <ShoppingCart className="h-6 w-6" />
                    </div>
                    Trip Summary
                </CardTitle>
                <CardDescription className="text-orange-100/60 font-medium pl-1 relative z-10 text-sm italic">
                    Ready for your dream escape?
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-8 space-y-8">
                {/* Traveler & Duration Info - Pill Style */}
                <div className="flex items-center justify-between bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5">
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                        <Users className="h-4 w-4 text-[#E8682A]" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] text-orange-100/40 font-bold uppercase tracking-widest mb-1">Travelers</span>
                            <span className="font-bold text-white text-sm">{totalTravelers} People</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-2xl ml-1.5">
                        <Clock className="h-4 w-4 text-[#E8682A]" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] text-orange-100/40 font-bold uppercase tracking-widest mb-1">Duration</span>
                            <span className="font-bold text-white text-sm">{duration.days}D / {duration.nights}N</span>
                        </div>
                    </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-5">
                    {/* Base Price Section */}
                    <div className="group">
                        <div className="flex justify-between text-orange-100/40 text-xs mb-1 uppercase tracking-widest font-bold">
                            <span>Base Package (Per Person)</span>
                            <span className="text-orange-100/80">₹{basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-orange-100/60 font-semibold flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 opacity-50" />
                                <span className="text-xs">x {totalTravelers} Travelers</span>
                            </span>
                            <span className="font-bold text-xl text-white">₹{totalBasePrice.toLocaleString()}</span>
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Services Section */}
                    {services.length > 0 && (
                        <div className="space-y-3 pt-1">
                            {services.map((service, index) => (
                                <div key={index} className="flex justify-between items-center text-sm group">
                                    <span className="flex items-center gap-2 text-orange-100/60 font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#E8682A]" />
                                        {service.name}
                                    </span>
                                    <span className="font-bold text-white">₹{service.price.toLocaleString()}</span>
                                </div>
                            ))}
                            <Separator className="bg-white/10 my-2" />
                        </div>
                    )}

                    {/* GST Section (Exclusive) */}
                    {gstSettings && !gstSettings.inclusive && (
                        <div className="flex justify-between items-center text-sm group bg-[#E8682A]/10 p-3 rounded-2xl border border-[#E8682A]/20">
                            <span className="flex items-center gap-2 text-orange-200 font-bold text-xs uppercase tracking-widest">
                                GST ({gstSettings.percentage}%)
                            </span>
                            <span className="font-bold text-white">₹{gstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                        <span className="text-orange-100/40 font-bold text-xs uppercase tracking-[0.2em]">
                            {gstSettings && !gstSettings.inclusive ? "Subtotal" : "Taxes & Fees"}
                        </span>
                        {gstSettings && !gstSettings.inclusive ? (
                            <span className="font-bold text-white">₹{subTotal.toLocaleString()}</span>
                        ) : (
                            <Badge variant="secondary" className="bg-[#E8682A]/20 text-[#FFECD2] border-transparent font-bold px-3 py-1 rounded-full text-[10px] tracking-widest">
                                INCLUDED
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Total */}
                <div className="bg-[#4D250D] -mx-6 -mb-6 p-8 text-white mt-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8682A]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="text-orange-100/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Total Amount</span>
                                {gstSettings && gstSettings.inclusive && (
                                    <span className="text-[10px] text-emerald-400 font-bold tracking-widest">INC. ALL TAXES</span>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="text-5xl font-bold tracking-tighter text-white font-display">
                                    ₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>

                        <Button
                            id="checkout-trigger"
                            className="w-full h-16 text-white font-bold text-lg rounded-2xl shadow-[0_12px_40px_rgba(232,104,42,0.3)] bg-gradient-to-r from-[#E8682A] to-[#F4A261] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-white/20"
                            onClick={onCheckout}
                            disabled={loading || disabled}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <div className="flex items-center justify-center w-full gap-3">
                                    <ShieldCheck className="h-6 w-6" />
                                    <span>Confirm & Pay Securely</span>
                                </div>
                            )}
                        </Button>

                        <div className="flex items-center justify-center gap-6 pt-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-orange-100/30 uppercase tracking-[0.15em]">
                                <Lock className="h-3 w-3" /> 256-bit Secure
                            </div>
                            <div className="w-1 h-1 rounded-full bg-white/10"></div>
                            <div className="text-[10px] font-bold text-orange-100/30 uppercase tracking-[0.15em]">
                                Instant Booking
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
            {/* Footer padding compensation for negative margin above */}
            <div className="h-2 bg-[#4D250D]"></div>
        </Card>
    )
}
