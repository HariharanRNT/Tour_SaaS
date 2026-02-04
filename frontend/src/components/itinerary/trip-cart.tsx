'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, ShoppingCart, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TripCartProps {
    travelers: {
        adults: number
        children: number
        infants: number
    }
    basePrice: number
    flightPrice?: number
    hotelPrice?: number
    transferPrice?: number
    currency?: string
    onCheckout: () => void
    loading?: boolean
    disabled?: boolean
}

export function TripCart({
    travelers,
    basePrice,
    flightPrice = 0,
    hotelPrice = 0,
    transferPrice = 0,
    currency = 'USD',
    onCheckout,
    loading = false,
    disabled = false
}: TripCartProps) {
    const totalTravelers = travelers.adults + travelers.children + (travelers.infants || 0)

    // Calculate totals
    const totalBasePrice = basePrice * totalTravelers
    const totalFlightPrice = flightPrice // Price is total for group
    const totalHotelPrice = hotelPrice // Assuming per room/total estimate (simplified)
    const totalTransferPrice = transferPrice

    const grandTotal = totalBasePrice + totalFlightPrice + totalHotelPrice + totalTransferPrice

    return (
        <Card className="sticky top-6 shadow-lg border-blue-100 overflow-hidden">
            <CardHeader className="bg-blue-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl text-blue-900">
                    <ShoppingCart className="h-5 w-5" />
                    Trip Cart
                </CardTitle>
                <CardDescription>
                    {totalTravelers} Traveler{totalTravelers !== 1 && 's'} ({travelers.adults} Adults, {travelers.children} Children, {travelers.infants} Infants)
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                {/* Base Package */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Base Package</span>
                        <span className="font-medium">₹{totalBasePrice.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-400 pl-2 border-l-2 border-gray-200">
                        ₹{basePrice.toLocaleString()} x {totalTravelers}
                    </div>
                </div>

                {/* Flights */}
                {flightPrice > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Flights (Est.)</span>
                            <span className="font-medium">₹{totalFlightPrice.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* Hotels */}
                {hotelPrice > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Hotels (Est.)</span>
                            <span className="font-medium">₹{totalHotelPrice.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* Transfers */}
                {transferPrice > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Transfers (Est.)</span>
                            <span className="font-medium">₹{totalTransferPrice.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                <Separator />

                {/* Total */}
                <div className="flex justify-between items-end pt-2">
                    <div>
                        <p className="text-sm text-gray-500">Total Estimate</p>
                        <p className="text-xs text-blue-600 font-medium">Taxes included</p>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                        ₹{grandTotal.toLocaleString()}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-gray-50 p-4">
                <Button
                    className="w-full h-11 text-lg"
                    onClick={onCheckout}
                    disabled={loading || disabled}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        'Proceed to Checkout'
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
