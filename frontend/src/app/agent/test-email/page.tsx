'use client'

import { EmailTemplatePicker } from '@/components/agent/EmailTemplatePicker'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function TestEmailPage() {
    const [sent, setSent] = useState(false)
    const [selectedTheme, setSelectedTheme] = useState('')

    const mockBooking = {
        customerName: "Alex Thompson",
        referenceId: "RT-77829-XP",
        packageName: "Luxury Santorini & Mykonos Escape",
        travelDate: "June 15, 2026",
        travelers: 2,
        totalAmount: 4850.00,
        itinerarySummary: "7 Days of island hopping, private catamaran sunset cruise, and boutique caldera-view stays."
    }

    const handleSend = (themeId: string) => {
        console.log(`Sending email with theme: ${themeId}`, mockBooking)
        
        // Reset after 3 seconds
        setTimeout(() => setSent(false), 3000)
    }

    return (
        <div className="min-h-screen bg-transparent p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <Link href="/agent">
                        <Button variant="ghost" className="rounded-full gap-2 border border-white/20 bg-white/10 backdrop-blur-md">
                            <ChevronLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                    
                    <div className="text-right">
                        <h1 className="text-2xl font-black text-slate-800">Component Gallery</h1>
                        <p className="text-slate-500 text-sm">Previewing: EmailTemplatePicker</p>
                    </div>
                </div>

                {sent ? (
                    <Card className="p-20 text-center space-y-6 border-2 border-green-200 bg-green-50/50 backdrop-blur-xl rounded-[40px] animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-200">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                             </svg>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black text-slate-800">Email Sent Successfully!</h2>
                            <p className="text-slate-500 text-xl font-medium">Using the <span className="text-green-600 font-bold uppercase tracking-wider">{selectedTheme}</span> theme.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="bg-white/30 backdrop-blur-md rounded-[48px] border border-white/40 p-10 shadow-2xl">
                        <EmailTemplatePicker 
                            bookingData={mockBooking}
                            onSend={handleSend}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
