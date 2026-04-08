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
    AreaChart } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CustomTooltip = ({ active, payload, label, activeTab, chartData }: any) => {
    if (active && payload && payload.length) {
        const currentVal = payload[0].value;
        const currentIndex = chartData.findIndex((d: any) => d.name === label);
        let percentChange = null;
        if (currentIndex > 0) {
            const valKey = activeTab === 'revenue' ? 'revenue' : (activeTab === 'bookings' ? 'subscriptions' : 'subscriptions');
            const prevVal = chartData[currentIndex - 1][valKey];
            if (prevVal && prevVal !== 0) {
                percentChange = (((currentVal - prevVal) / prevVal) * 100).toFixed(1);
            }
        }

        return (
            <div className="bg-white/95 backdrop-blur-xl border border-indigo-100 p-4 rounded-2xl shadow-2xl">
                <p className="text-[10px] font-black text-black uppercase tracking-widest mb-2">{label}</p>
                <div className="flex items-end gap-3">
                    <p className="text-xl font-black text-black">
                        {activeTab === 'revenue' ? `₹${currentVal.toLocaleString()}` : currentVal.toLocaleString()}
                    </p>
                    {percentChange !== null && (
                        <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center mb-1",
                            parseFloat(percentChange) >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                            {parseFloat(percentChange) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(percentChange))}%
                        </span>
                    )}
                </div>
                <p className="text-[9px] font-bold text-black mt-1 italic uppercase">{activeTab} Stream</p>
            </div>
        );
    }
    return null;
};

export function RevenueChart({ data, ytmData = [], weeklyData = [], dailyData = [] }: { data: any[], ytmData?: any[], weeklyData?: any[], dailyData?: any[] }) {
    const [mounted, setMounted] = useState(false)
    const [period, setPeriod] = useState<'ytm' | 'monthly' | 'weekly' | 'daily'>('ytm')
    const [activeTab, setActiveTab] = useState('revenue')

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = period === 'ytm' ? ytmData : period === 'monthly' ? data : period === 'weekly' ? weeklyData : dailyData

    if (!mounted) {
        return (
            <div className="h-[350px] flex items-center justify-center text-black">
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
                        value="subscriptions"
                        className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                    >
                        Subscriptions
                    </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3">
                    <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                        <SelectTrigger className="w-[160px] h-12 bg-white border-transparent rounded-2xl font-bold text-black shadow-sm hover:shadow-md transition-all">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-indigo-50 shadow-xl">
                            <SelectItem value="ytm" className="font-medium italic">YTM (Year-To-Month)</SelectItem>
                            <SelectItem value="monthly" className="font-medium">Monthly View</SelectItem>
                            <SelectItem value="weekly" className="font-medium">Weekly View</SelectItem>
                            <SelectItem value="daily" className="font-medium">Daily View</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 px-2 py-4 bg-white/50 rounded-2xl border border-white/60">
                <div className="text-center border-r border-indigo-100 last:border-0">
                    <p className="text-[10px] uppercase font-bold text-black tracking-wider">Total {activeTab}</p>
                    <p className="text-xl font-black text-black">
                        {activeTab === 'revenue'
                            ? `₹${chartData.reduce((acc: any, curr: any) => acc + (curr.revenue || 0), 0).toLocaleString()}`
                            : chartData.reduce((acc: any, curr: any) => acc + (curr[activeTab] || curr.subscriptions || curr.bookings || 0), 0)
                        }
                    </p>
                </div>
                <div className="text-center border-r border-indigo-100 last:border-0">
                    <p className="text-[10px] uppercase font-bold text-black tracking-wider">Growth</p>
                    <p className={cn(
                        "text-xl font-black",
                        (() => {
                            const valKey = activeTab === 'revenue' ? 'revenue' : 'subscriptions';
                            const first = chartData[0]?.[valKey] || 0;
                            const last = chartData[chartData.length - 1]?.[valKey] || 0;
                            const growth = first > 0 ? ((last - first) / first * 100) : (last > 0 ? 100 : 0);
                            return growth >= 0 ? "text-emerald-600" : "text-rose-600";
                        })()
                    )}>
                        {(() => {
                            const valKey = activeTab === 'revenue' ? 'revenue' : 'subscriptions';
                            const first = chartData[0]?.[valKey] || 0;
                            const last = chartData[chartData.length - 1]?.[valKey] || 0;
                            const growth = first > 0 ? ((last - first) / first * 100) : (last > 0 ? 100 : 0);
                            return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
                        })()}
                    </p>
                </div>
                <div className="text-center last:border-0">
                    <p className="text-[10px] uppercase font-bold text-black tracking-wider">Highest Point</p>
                    <p className="text-xl font-black text-black">
                        {chartData.length > 0 ? [...chartData].sort((a: any, b: any) => (b[activeTab] || b.revenue || 0) - (a[activeTab] || a.revenue || 0))[0]?.name : '-'}
                    </p>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-slate-900 border border-dashed border-gray-200 rounded-lg">
                    <p>No data available for this period</p>
                </div>
            ) : (
                <>
                    <TabsContent value="revenue" className="mt-0 outline-none">
                        <div className="h-[350px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                {period === 'ytm' ? (
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="ytmRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#FF6B2B" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#FF6B2B" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                        <XAxis dataKey="name" stroke="#000000" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} tickMargin={15} className="uppercase tracking-widest" />
                                        <YAxis stroke="#000000" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`} />
                                        <Tooltip content={<CustomTooltip activeTab="revenue" chartData={chartData} />} />
                                        <Area type="monotone" dataKey="revenue" stroke="#FF6B2B" strokeWidth={4} fillOpacity={1} fill="url(#ytmRevenueGradient)" />
                                    </AreaChart>
                                ) : (
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#FF6B2B" stopOpacity={0.8} />
                                                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                        <XAxis dataKey="name" stroke="#000000" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} tickMargin={15} className="uppercase tracking-widest" />
                                        <YAxis stroke="#000000" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`} />
                                        <Tooltip content={<CustomTooltip activeTab="revenue" chartData={chartData} />} />
                                        <Bar dataKey="revenue" fill="url(#revenueGradient)" radius={[12, 12, 0, 0]} barSize={period === 'monthly' ? 45 : period === 'weekly' ? 30 : 50} minPointSize={1} />
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>


                    <TabsContent value="subscriptions" className="mt-0 outline-none">
                        <div className="h-[350px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="name" stroke="#000000" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} tickMargin={15} className="uppercase tracking-widest" />
                                    <YAxis stroke="#000000" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip activeTab="subscriptions" chartData={chartData} />} />
                                    <Line type="monotone" dataKey="subscriptions" stroke="#8B5CF6" strokeWidth={4} dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>
                </>
            )}
        </Tabs>
    )
}
