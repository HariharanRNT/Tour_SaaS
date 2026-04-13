"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, TrendingUp, Calendar, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SubscriptionReports from '@/components/admin/reports/SubscriptionReports'
import RevenueReports from '@/components/admin/reports/RevenueReports'
import BookingReports from '@/components/admin/reports/BookingReports'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { subDays } from 'date-fns'

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('subscriptions')
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date() })

    return (
        <div className="min-h-screen bg-transparent font-sans">
            {/* Header */}
            <div className="glass-navbar border-b border-[#F1F5F9]">
                <div className="container mx-auto px-10 py-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div>
                            <h1 className="text-[28px] font-black text-[#1a1a2e] tracking-[-0.3px] mb-2 font-['Outfit']">Reports & Analytics</h1>
                            <p className="text-[#1a1a2e] text-[15px] font-bold opacity-70">Comprehensive insights into subscriptions, revenue, and bookings</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-10 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    {/* Tab Navigation */}
                    <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-[6px] rounded-[16px] w-fit shadow-xl">
                        <TabsList className="bg-transparent h-10 gap-1 flex">
                            <TabsTrigger
                                value="subscriptions"
                                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B2B] data-[state=active]:to-[#FF8E53] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(255,107,43,0.3)] data-[state=active]:font-black uppercase text-[11px] tracking-widest data-[state=inactive]:font-bold data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#1a1a2e]/60 rounded-[10px] px-6 h-8 transition-all"
                            >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Subscriptions
                            </TabsTrigger>
                            <TabsTrigger
                                value="revenue"
                                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B2B] data-[state=active]:to-[#FF8E53] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(255,107,43,0.3)] data-[state=active]:font-black uppercase text-[11px] tracking-widest data-[state=inactive]:font-bold data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#1a1a2e]/60 rounded-[10px] px-6 h-8 transition-all"
                            >
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Revenue
                            </TabsTrigger>
                            <TabsTrigger
                                value="bookings"
                                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B2B] data-[state=active]:to-[#FF8E53] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(255,107,43,0.3)] data-[state=active]:font-black uppercase text-[11px] tracking-widest data-[state=inactive]:font-bold data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#1a1a2e]/60 rounded-[10px] px-6 h-8 transition-all"
                            >
                                <Calendar className="h-4 w-4 mr-2" />
                                Bookings
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Tab Content */}
                    <TabsContent value="subscriptions" className="space-y-6 focus-visible:outline-none">
                        <SubscriptionReports dateRange={dateRange} />
                    </TabsContent>

                    <TabsContent value="revenue" className="space-y-6 focus-visible:outline-none">
                        <RevenueReports dateRange={dateRange} />
                    </TabsContent>

                    <TabsContent value="bookings" className="space-y-6 focus-visible:outline-none">
                        <BookingReports dateRange={dateRange} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
