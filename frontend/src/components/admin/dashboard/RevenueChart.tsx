'use client'

import { useEffect, useState } from 'react'
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
    Legend
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function RevenueChart({ data, weeklyData = [] }: { data: any[], weeklyData?: any[] }) {
    const [mounted, setMounted] = useState(false)
    const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly')
    const [activeTab, setActiveTab] = useState('revenue')

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = period === 'monthly' ? data : weeklyData

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
                        value="subscriptions"
                        className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                    >
                        Subscriptions
                    </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3">
                    <Select value={period} onValueChange={(v: 'monthly' | 'weekly') => setPeriod(v)}>
                        <SelectTrigger className="w-[160px] h-12 bg-slate-50 border-transparent rounded-2xl font-bold text-slate-700 shadow-sm hover:shadow-md transition-all">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-indigo-50 shadow-xl">
                            <SelectItem value="monthly" className="font-medium">Monthly View</SelectItem>
                            <SelectItem value="weekly" className="font-medium">Weekly View</SelectItem>
                        </SelectContent>
                    </Select>
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
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366F1" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#0EA5E9" stopOpacity={1} />
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
                                        tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
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
                                        labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#6366F1', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                        formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Total Revenue']}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        name="Revenue"
                                        fill="url(#barGradient)"
                                        radius={[8, 8, 0, 0]}
                                        barSize={period === 'monthly' ? 40 : 25}
                                        animationDuration={1500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>

                    <TabsContent value="subscriptions" className="mt-0 outline-none">
                        <div className="h-[350px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
