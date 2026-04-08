'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, ShoppingCart, Lock, ShieldCheck, Clock, Users, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatDuration } from '@/lib/utils'

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
    cardStyle?: 'glassy' | 'minimal' | 'rounded' | 'classic'
    buttonStyle?: 'pill' | 'rounded' | 'square'
    customTitle?: string
    customCtaText?: string
    cancellationEnabled?: boolean
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
    priceGuaranteed = true,
    cardStyle = 'glassy',
    buttonStyle = 'pill',
    customTitle,
    customCtaText,
    cancellationEnabled = true
}: TripCartProps) {
    const totalTravelers = travelers.adults + travelers.children + (travelers.infants || 0)

    // Calculate totals
    const totalBasePrice = basePrice * (travelers.adults + travelers.children)
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
            className={cn(
                "sticky top-24 transition-all duration-500 overflow-hidden",
                cardStyle === 'glassy' ? "shadow-2xl border-0 bg-slate-900/40 backdrop-blur-[24px] rounded-[2.5rem] ring-1 ring-white/15" :
                    cardStyle === 'minimal' ? "shadow-sm border border-slate-100 bg-white rounded-xl" :
                        cardStyle === 'rounded' ? "shadow-md border border-slate-200 bg-white rounded-3xl" :
                            "shadow-none border border-slate-300 bg-slate-50 rounded-lg" // classic
            )}
            style={cardStyle === 'glassy' ? { border: '1px solid rgba(255,255,255,0.15)' } : {}}
        >
            {/* Header */}
            <CardHeader className={cn(
                "py-5 border-b relative overflow-hidden",
                cardStyle === 'glassy' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50/50 border-slate-100 text-[var(--color-primary-font)]"
            )}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                <CardTitle className="flex items-center gap-2.5 text-lg font-bold relative z-10 font-display">
                    <div className="p-2 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] rounded-xl text-white shadow-lg ring-1 ring-white/20">
                        <ShoppingCart className="h-4 w-4" />
                    </div>
                    {customTitle || "Trip Summary"}
                </CardTitle>
                <CardDescription className={cn(
                    "font-bold pl-1 relative z-10 text-[11px] italic",
                    cardStyle === 'glassy' ? "text-white/60" : "text-slate-500"
                )}>
                    Ready for your dream escape?
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-5 space-y-5">
                {/* Traveler & Duration Info - Pill Style */}
                <div className={cn(
                    "flex items-center justify-between p-1 rounded-[1.2rem] border",
                    cardStyle === 'glassy' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"
                )}>
                    <div className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-xl backdrop-blur-md border shadow-sm",
                        cardStyle === 'glassy' ? "bg-white/10 border-white/20" : "bg-white border-slate-200"
                    )}>
                        <Users className="h-3.5 w-3.5 text-[var(--primary)]" />
                        <div className="flex flex-col leading-none">
                            <span className={cn("text-[8px] font-black uppercase tracking-widest mb-0.5", cardStyle === 'glassy' ? "text-white/60" : "text-[var(--color-primary-font)]/60")}>Travelers</span>
                            <span className={cn("font-bold text-xs", cardStyle === 'glassy' ? "text-white" : "text-[var(--color-primary-font)]")}>{totalTravelers} People</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-xl ml-1">
                        <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
                        <div className="flex flex-col leading-none">
                            <span className={cn("text-[8px] font-black uppercase tracking-widest mb-0.5", cardStyle === 'glassy' ? "text-white/60" : "text-[var(--color-primary-font)]/60")}>Duration</span>
                            <span className={cn("font-bold text-xs", cardStyle === 'glassy' ? "text-white" : "text-[var(--color-primary-font)]")}>{formatDuration(duration.days)}</span>
                        </div>
                    </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-5">
                    {/* Base Price Section */}
                    <div className="group">
                        <div className={cn("flex justify-between text-[10px] mb-1 uppercase tracking-widest font-black", cardStyle === 'glassy' ? "text-white/40" : "text-slate-400")}>
                            <span>Base Package (Per Person)</span>
                            <span className={cardStyle === 'glassy' ? "text-white/80" : "text-[var(--color-primary-font)]/80"}>₹{basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={cn("font-bold flex items-center gap-2 text-xs", cardStyle === 'glassy' ? "text-white/60" : "text-slate-500")}>
                                <Users className="h-3 w-3 opacity-50 text-[var(--primary)]" />
                                <span className="text-[10px]">x {travelers.adults + travelers.children} Adults/Children</span>
                            </span>
                            <span className={cn("font-black text-lg", cardStyle === 'glassy' ? "text-white" : "text-[var(--color-primary-font)]")}>₹{totalBasePrice.toLocaleString()}</span>
                        </div>
                        {travelers.infants > 0 && (
                            <div className="flex justify-between items-center mt-1.5 px-2 py-1 bg-[var(--primary)]/5 rounded-lg border border-[var(--primary)]/10">
                                <span className={cn("font-bold text-[10px]", cardStyle === 'glassy' ? "text-white/60" : "text-slate-500")}>
                                    Infants ({travelers.infants})
                                </span>
                                <span className="text-[10px] font-black text-[var(--primary)]">FREE</span>
                            </div>
                        )}
                    </div>

                    <Separator className={cardStyle === 'glassy' ? "bg-white/10" : "bg-slate-100"} />

                    {/* Services Section */}
                    {services.length > 0 && (
                        <div className="space-y-2 pt-0.5">
                            {services.map((service, index) => (
                                <div key={index} className={cn(
                                    "flex flex-col space-y-2 py-2 border-b last:border-0 group",
                                    cardStyle === 'glassy' ? "border-white/10" : "border-slate-100"
                                )}>
                                    <div className="flex justify-between items-start text-xs">
                                        <span className={cn("flex items-center gap-2 font-bold", cardStyle === 'glassy' ? "text-white/70" : "text-[var(--color-primary-font)]/70")}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                                            <div className="flex flex-col">
                                                <span>{service.name}</span>
                                                {service.name.includes('Flight') && (
                                                    <span className="text-[9px] text-[var(--primary)] font-black uppercase tracking-tighter">Live Fare Rate</span>
                                                )}
                                            </div>
                                        </span>
                                        <span className={cn("font-black whitespace-nowrap", cardStyle === 'glassy' ? "text-white" : "text-[var(--color-primary-font)]")}>₹{service.price.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                            <Separator className={cardStyle === 'glassy' ? "bg-white/10 my-1.5" : "bg-slate-100 my-1.5"} />
                        </div>
                    )}

                    {/* Subtotal / Taxes & Fees Section */}
                    <div className={cn(
                        "flex justify-between items-center p-3 rounded-xl border shadow-sm",
                        cardStyle === 'glassy' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"
                    )}>
                        <span className={cn("font-black text-[9px] uppercase tracking-[0.2em]", cardStyle === 'glassy' ? "text-white/60" : "text-[var(--color-primary-font)]/60")}>
                            {gstSettings && !gstSettings.inclusive ? "Net Amount" : "Taxes & Fees"}
                        </span>
                        {gstSettings && !gstSettings.inclusive ? (
                            <span className={cn("font-black text-sm", cardStyle === 'glassy' ? "text-white" : "text-[var(--color-primary-font)]")}>₹{subTotal.toLocaleString()}</span>
                        ) : (
                            <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                <span className="text-[9px] font-bold tracking-widest uppercase">Included</span>
                            </div>
                        )}
                    </div>

                    {/* GST Section (Exclusive) - Now below Subtotal/Net Amount */}
                    {gstSettings && !gstSettings.inclusive && (
                        <div className={cn(
                            "flex justify-between items-center text-[11px] group p-2.5 rounded-xl border",
                            cardStyle === 'glassy' ? "bg-[var(--primary)]/10 border-[var(--primary)]/20" : "bg-orange-50 border-orange-100"
                        )}>
                            <span className="flex items-center gap-2 text-[var(--primary)] font-black uppercase tracking-widest">
                                GST ({gstSettings.percentage}%)
                            </span>
                            <span className={cn("font-black", cardStyle === 'glassy' ? "text-white" : "text-[var(--color-primary-font)]")}>₹{gstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                </div>

                {/* Total */}
                <div className={cn(
                    "-mx-6 -mb-6 p-6 mt-4 relative overflow-hidden border-t",
                    cardStyle === 'glassy' ? "bg-white/5 text-white border-white/10" : "bg-slate-50 text-[var(--color-primary-font)] border-slate-100"
                )}>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 space-y-5">
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-0.5", cardStyle === 'glassy' ? "text-white/60" : "text-[var(--color-primary-font)]/60")}>Total Amount</span>
                                {gstSettings && gstSettings.inclusive && (
                                    <span className="text-[9px] text-emerald-500 font-black tracking-widest">INC. ALL TAXES</span>
                                )}
                                {priceGuaranteed && (
                                    <div className={cn(
                                        "mt-1 flex items-center gap-1.5 border px-2 py-0.5 rounded-md self-start shadow-sm",
                                        cardStyle === 'glassy' ? "bg-white/10 border-white/20" : "bg-white border-slate-200"
                                    )}>
                                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className={cn("text-[8px] font-black uppercase tracking-wider", cardStyle === 'glassy' ? "text-white/80" : "text-[var(--color-primary-font)]/80")}>Price Locked</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <span className={cn("text-3xl font-black tracking-tighter font-display", cardStyle === 'glassy' ? "text-white" : "text-[var(--color-primary-font)]")}>
                                    ₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>


                        <Button
                            id="checkout-trigger"
                            className={cn(
                                "w-full h-13 text-white font-bold text-base transition-all duration-300 border border-white/20",
                                buttonStyle === 'pill' ? "rounded-full shadow-[0_8px_30px_var(--primary-glow)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] hover:scale-[1.01] active:scale-[0.99]" :
                                    buttonStyle === 'rounded' ? "rounded-xl shadow-md bg-[var(--primary)] hover:bg-[var(--primary-light)]" :
                                        "rounded-none shadow-none bg-slate-800 hover:bg-black" // square
                            )}
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
                                    <span>{customCtaText || "Confirm & Pay Securely"}</span>
                                </div>
                            )}
                        </Button>

                        <div className="flex items-center justify-center gap-4 pt-1">
                            <div className={cn("flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em]", cardStyle === 'glassy' ? "text-white/30" : "text-slate-300")}>
                                <Lock className="h-2.5 w-2.5" /> 256-bit Secure
                            </div>
                            <div className={cn("w-0.5 h-0.5 rounded-full", cardStyle === 'glassy' ? "bg-white/10" : "bg-slate-200")}></div>
                            <div className={cn("text-[9px] font-black uppercase tracking-[0.15em]", cardStyle === 'glassy' ? "text-white/30" : "text-slate-300")}>
                                Instant Booking
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
            {/* Footer padding compensation for negative margin above */}
            <div className={cn("h-2", cardStyle === 'glassy' ? "bg-white/5" : "bg-slate-50")}></div>
        </Card>
    )
}
