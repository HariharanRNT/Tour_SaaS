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
        to: new Date(),
    })

    return (
        <div className="min-h-screen bg-transparent font-sans">
            {/* Header */}
            <div className="glass-navbar border-b border-[#F1F5F9]">
                <div className="container mx-auto px-10 py-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div>
                            <h1 className="text-[28px] font-bold text-[#0F172A] tracking-[-0.3px] mb-2">Reports & Analytics</h1>
                            <p className="text-[#64748B] text-[15px] font-normal">Comprehensive insights into subscriptions, revenue, and bookings</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                            <Button className="h-[44px] px-6 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] hover:from-[#5558E3] hover:to-[#6D28D9] text-white font-bold rounded-[10px] shadow-[0_4px_16px_rgba(99,102,241,0.30)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.40)] hover:-translate-y-[2px] transition-all duration-200">
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-10 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    {/* Tab Navigation */}
                    <TabsList className="glass-card border-[1.5px] border-[#F1F5F9] rounded-[12px] p-[5px] h-auto inline-flex shadow-sm">
                        <TabsTrigger
                            value="subscriptions"
                            className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(99,102,241,0.25)] text-[#64748B] font-medium text-[13px] px-6 py-2.5 rounded-[9px] transition-all gap-2"
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Subscription Reports
                        </TabsTrigger>
                        <TabsTrigger
                            value="revenue"
                            className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#10B981] data-[state=active]:to-[#34D399] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(16,185,129,0.25)] text-[#64748B] font-medium text-[13px] px-6 py-2.5 rounded-[9px] transition-all gap-2"
                        >
                            <TrendingUp className="h-3.5 w-3.5" />
                            Revenue Reports
                        </TabsTrigger>
                        <TabsTrigger
                            value="bookings"
                            className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#F59E0B] data-[state=active]:to-[#FCD34D] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(245,158,11,0.25)] text-[#64748B] font-medium text-[13px] px-6 py-2.5 rounded-[9px] transition-all gap-2"
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            Booking Reports
                        </TabsTrigger>
                    </TabsList>

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
