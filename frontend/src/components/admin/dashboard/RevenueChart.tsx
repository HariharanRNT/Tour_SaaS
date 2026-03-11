'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Area,
    AreaChart,
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function RevenueChart({ data, weeklyData = [], dailyData = [] }: { data: any[], weeklyData?: any[], dailyData?: any[] }) {
    const [mounted, setMounted] = useState(false)
    const [period, setPeriod] = useState<'monthly' | 'weekly' | 'daily'>('monthly')
    const [activeTab, setActiveTab] = useState('revenue')

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = period === 'monthly' ? data : period === 'weekly' ? weeklyData : dailyData

    if (!mounted) {
        return (
            <div className="h-[350px] flex items-center justify-center text-gray-400">
                Loading chart...
            </div>
        )
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
                <TabsList className="bg-slate-100/50 p-1 rounded-2xl h-12 w-fit">
                    <TabsTrigger
                        value="revenue"
                        className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                    >
                        Revenue
                    </TabsTrigger>
                    <TabsTrigger
                        value="bookings"
                        className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                    >
                        Bookings
                    </TabsTrigger>
                    <TabsTrigger
                        value="subscriptions"
                        className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                    >
                        Subscriptions
                    </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3">
                    <Select value={period} onValueChange={(v: 'monthly' | 'weekly' | 'daily') => setPeriod(v)}>
                        <SelectTrigger className="w-[160px] h-12 bg-slate-50 border-transparent rounded-2xl font-bold text-slate-700 shadow-sm hover:shadow-md transition-all">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-indigo-50 shadow-xl">
                            <SelectItem value="monthly" className="font-medium">Monthly View</SelectItem>
                            <SelectItem value="weekly" className="font-medium">Weekly View</SelectItem>
                            <SelectItem value="daily" className="font-medium">Daily View</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* SaaS Analytics Summary Bar */}
            <div className="grid grid-cols-3 gap-4 px-2 py-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                <div className="text-center border-r border-indigo-100 last:border-0">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total {activeTab}</p>
                    <p className="text-xl font-black text-slate-800">
                        {activeTab === 'revenue'
                            ? `₹${chartData.reduce((acc: any, curr: any) => acc + (curr.revenue || 0), 0).toLocaleString()}`
                            : chartData.reduce((acc: any, curr: any) => acc + (curr[activeTab] || curr.bookings || 0), 0)
                        }
                    </p>
                </div>
                <div className="text-center border-r border-indigo-100 last:border-0">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Growth</p>
                    <p className="text-xl font-black text-emerald-600">+12.4%</p>
                </div>
                <div className="text-center last:border-0">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Highest Point</p>
                    <p className="text-xl font-black text-indigo-600">
                        {chartData.length > 0 ? [...chartData].sort((a: any, b: any) => (b[activeTab] || b.revenue || 0) - (a[activeTab] || a.revenue || 0))[0]?.name : '-'}
                    </p>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-slate-500 border border-dashed border-gray-200 rounded-lg">
                    <p>No data available for this period</p>
                </div>
            ) : (
                <>
                    <TabsContent value="revenue" className="mt-0 outline-none">
                        <div className="h-[350px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#FF6B2B" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#FF6B2B" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#FF6B2B" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#94A3B8"
                                        fontSize={10}
                                        fontWeight={800}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={15}
                                        className="uppercase tracking-widest"
                                    />
                                    <YAxis
                                        stroke="#94A3B8"
                                        fontSize={10}
                                        fontWeight={800}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255, 107, 43, 0.05)', radius: 10 }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const currentVal = payload[0].value;
                                                const currentIndex = chartData.findIndex(d => d.name === label);
                                                let percentChange = null;
                                                if (currentIndex > 0) {
                                                    const prevVal = chartData[currentIndex - 1].revenue;
                                                    percentChange = (((currentVal - prevVal) / prevVal) * 100).toFixed(1);
                                                }

                                                return (
                                                    <div className="bg-white/90 backdrop-blur-xl border border-orange-100 p-4 rounded-2xl shadow-2xl">
                                                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">{label}</p>
                                                        <div className="flex items-end gap-3">
                                                            <p className="text-xl font-black text-slate-800">₹{currentVal.toLocaleString()}</p>
                                                            {percentChange !== null && (
                                                                <span className={cn(
                                                                    "text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center mb-1",
                                                                    parseFloat(percentChange) >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                                )}>
                                                                    {parseFloat(percentChange) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(percentChange))}%
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] font-bold text-slate-400 mt-1 italic uppercase">Total Revenue Stream</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    {/* Area Overlay for flow */}
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="none"
                                        fill="url(#areaGradient)"
                                        fillOpacity={1}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="url(#revenueGradient)"
                                        radius={[12, 12, 0, 0]}
                                        barSize={period === 'monthly' ? 45 : period === 'weekly' ? 30 : 50}
                                        minPointSize={5} // Ensure minimal visibility for zero data
                                        animationDuration={2000}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>

                    <TabsContent value="bookings" className="mt-0 outline-none">
                        <div className="h-[350px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#C084FC" stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#64748B"
                                        fontSize={12}
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={15}
                                    />
                                    <YAxis
                                        stroke="#64748B"
                                        fontSize={12}
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#F8FAFF' }}
                                        contentStyle={{
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                            padding: '12px 16px'
                                        }}
                                        itemStyle={{ fontWeight: 800, fontSize: '14px', color: '#1E293B' }}
                                        labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#8B5CF6', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                        formatter={(value: any) => [value, 'Total Bookings']}
                                    />
                                    <Bar
                                        dataKey="bookings"
                                        fill="#FF6B2B"
                                        fillOpacity={0.8}
                                        radius={[8, 8, 0, 0]}
                                        barSize={period === 'monthly' ? 40 : period === 'weekly' ? 25 : 45}
                                        minPointSize={5} // Ensure minimal visibility for zero data
                                        animationDuration={1500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>

                    <TabsContent value="subscriptions" className="mt-0 outline-none">
                        <div className="h-[350px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#64748B"
                                        fontSize={12}
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={15}
                                    />
                                    <YAxis
                                        stroke="#64748B"
                                        fontSize={12}
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                            padding: '12px 16px'
                                        }}
                                        itemStyle={{ fontWeight: 800, fontSize: '14px', color: '#1E293B' }}
                                        labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#8B5CF6', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                        formatter={(value: any) => [value, 'New Subscriptions']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="subscriptions"
                                        name="New Subscriptions"
                                        stroke="#8B5CF6"
                                        strokeWidth={4}
                                        dot={{ r: 6, fill: '#8B5CF6', strokeWidth: 3, stroke: '#fff' }}
                                        activeDot={{ r: 8, fill: '#8B5CF6', strokeWidth: 0 }}
                                        animationDuration={1500}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>
                </>
            )}
        </Tabs>
    )
}
