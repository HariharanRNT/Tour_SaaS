'use client'

import { useEffect, useState } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function RevenueChart({ data, weeklyData = [] }: { data: any[], weeklyData?: any[] }) {
    const [mounted, setMounted] = useState(false)
    const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly')

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = period === 'monthly' ? data : weeklyData

    if (!mounted) {
        return (
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Overview</CardTitle>
                    <CardDescription>
                        Revenue and subscription trends
                    </CardDescription>
                </CardHeader>
                <CardContent className="pl-2 h-[400px] flex items-center justify-center">
                    <div className="text-gray-400">Loading chart...</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-4">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Overview</CardTitle>
                        <CardDescription>
                            {period === 'monthly' ? 'Revenue and subscription trends for the last 6 months' : 'Revenue and subscription trends for the last 6 weeks'}
                        </CardDescription>
                    </div>
                    <Select value={period} onValueChange={(v: 'monthly' | 'weekly') => setPeriod(v)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="pl-2">
                {chartData.length === 0 ? (
                    <div className="h-[350px] flex flex-col items-center justify-center text-slate-500">
                        <p>No data available for this period</p>
                        <p className="text-xs mt-1">Try restarting the backend if this persists.</p>
                    </div>
                ) : (
                    <Tabs defaultValue="revenue" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="revenue">Revenue</TabsTrigger>
                            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                        </TabsList>

                        <TabsContent value="revenue" className="space-y-4">
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `₹${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }}
                                            cursor={{ fill: 'transparent' }}
                                            formatter={(value: any) => [`₹${value}`, 'Revenue']}
                                        />
                                        <Bar
                                            dataKey="revenue"
                                            fill="#2563eb"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </TabsContent>

                        <TabsContent value="subscriptions" className="space-y-4">
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="subscriptions"
                                            stroke="#2563eb"
                                            strokeWidth={2}
                                            activeDot={{ r: 8 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
        </Card>
    )
}
