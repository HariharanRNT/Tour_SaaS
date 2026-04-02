"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckCircle, Clock, Pause, XCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/api'

interface SubscriptionReportsProps {
    dateRange: DateRange | undefined
}

export default function SubscriptionReports({ dateRange }: SubscriptionReportsProps) {
    const [summary, setSummary] = useState<any>(null)
    const [trends, setTrends] = useState<any[]>([])
    const [planAnalytics, setPlanAnalytics] = useState<any>(null)
    const [renewalStats, setRenewalStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchReports()
    }, [dateRange])

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }

            let queryParams = ''
            if (dateRange?.from) {
                queryParams += `&start_date=${format(dateRange.from, 'yyyy-MM-dd')}`
            }
            if (dateRange?.to) {
                queryParams += `&end_date=${format(dateRange.to, 'yyyy-MM-dd')}`
            }

            // Fetch all subscription reports
            const [summaryRes, trendsRes, plansRes, renewalsRes] = await Promise.all([
                fetch(`${API_URL}/api/v1/reports/subscriptions/summary?${queryParams}`, { headers }),
                fetch(`${API_URL}/api/v1/reports/subscriptions/trends?period=month${queryParams}`, { headers }),
                fetch(`${API_URL}/api/v1/reports/subscriptions/plans?${queryParams}`, { headers }),
                fetch(`${API_URL}/api/v1/reports/subscriptions/renewals?${queryParams}`, { headers })
            ])

            if (summaryRes.ok) setSummary(await summaryRes.json())

            if (trendsRes.ok) {
                const trendsData = await trendsRes.json()
                setTrends(Array.isArray(trendsData) ? trendsData : [])
            }

            if (plansRes.ok) setPlanAnalytics(await plansRes.json())

            if (renewalsRes.ok) setRenewalStats(await renewalsRes.json())
        } catch (error) {
            console.error('Error fetching subscription reports:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="text-[#0f172a] text-center py-12">Loading reports...</div>
    }

    const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

    const renewalData = renewalStats ? [
        { name: 'Renewals', value: renewalStats.renewals, color: '#10B981' },
        { name: 'Cancellations', value: renewalStats.cancellations, color: '#EF4444' }
    ] : []

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                {[
                    { label: 'TOTAL SUBS', value: summary?.total || 0, sub: 'All subscriptions', icon: Users, color: '#6366F1', bg: '#EEF2FF', border: '#6366F1' },
                    { label: 'ACTIVE', value: summary?.active || 0, sub: 'Currently active', icon: CheckCircle, color: '#10B981', bg: '#DCFCE7', border: '#10B981' },
                    { label: 'COMPLETED', value: summary?.completed || 0, sub: 'Finished plans', icon: CheckCircle, color: '#3B82F6', bg: '#DBEAFE', border: '#3B82F6' },
                    { label: 'UPCOMING', value: summary?.upcoming || 0, sub: 'Starting soon', icon: Clock, color: '#F59E0B', bg: '#FEF3C7', border: '#F59E0B' },
                    { label: 'PAUSED', value: summary?.paused || 0, sub: 'On hold', icon: Pause, color: '#1e293b', bg: '#F1F5F9', border: '#1e293b' },
                    { label: 'CANCELLED', value: summary?.cancelled || 0, sub: 'Terminated', icon: XCircle, color: '#EF4444', bg: '#FEE2E2', border: '#EF4444' }
                ].map((item, index) => (
                    <Card key={index} className="glass-card border-[1.5px] border-[#F1F5F9] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 relative overflow-hidden h-[130px] rounded-[16px]">
                        <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
                            <div className="flex justify-between items-start">
                                <p className="text-[10px] font-bold text-[#1e293b] uppercase tracking-[1.2px]">{item.label}</p>
                                <div className="h-9 w-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: `${item.color}1F` }}>
                                    <item.icon className="h-[18px] w-[18px]" style={{ color: item.color }} />
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-[36px] font-extrabold text-[#0F172A] tracking-[-1px] leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {item.value}
                                </div>
                                <p className="text-[12px] font-medium mt-1" style={{ color: item.color }}>{item.sub}</p>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 w-full h-[3px]" style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}4D)` }} />
                    </Card>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Month-wise Trends */}
                <Card className="glass-panel border-[1.5px] border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px]">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div>
                            <CardTitle className="text-[#0F172A] text-[17px] font-bold">Month-wise Subscription Trends</CardTitle>
                            <p className="text-[#1e293b] text-[12px] font-medium mt-1">Feb 2026 • {summary?.total || 0} total subscriptions</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-[32px] text-[12px] font-medium text-[#0f172a] border-[#E2E8F0]">
                            Filter <span className="ml-1">▼</span>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trends}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                                <XAxis
                                    dataKey="period"
                                    stroke="#1e293b"
                                    tick={{ fill: '#1e293b', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#1e293b"
                                    tick={{ fill: '#1e293b', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    labelStyle={{ color: '#0f172a', fontSize: '12px', marginBottom: '4px' }}
                                    itemStyle={{ color: '#0F172A', fontWeight: 'bold', fontSize: '14px' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-[#0f172a] text-[12px] font-medium ml-2">{value}</span>}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#6366F1"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "#fff", stroke: "#6366F1", strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: "#6366F1", stroke: "#fff", strokeWidth: 2 }}
                                    name="Subscriptions"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Renewal vs Cancellation */}
                <Card className="glass-panel border-[1.5px] border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px]">
                    <CardHeader>
                        <CardTitle className="text-[#0F172A] text-[17px] font-bold">Renewal vs Cancellation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center relative h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={renewalData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {renewalData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.name === 'Renewals' ? '#10B981' : '#FCA5A5'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        itemStyle={{ color: '#0F172A', fontWeight: 'bold' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Donut Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className="text-[28px] font-extrabold text-[#0F172A]">
                                    {renewalStats?.renewal_rate || 0}%
                                </div>
                                <div className="text-[11px] font-medium text-[#1e293b] mt-1">Renewal Rate</div>
                            </div>
                        </div>

                        {/* Custom Legend & Metrics */}
                        <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-[#F1F5F9]">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div>
                                    <span className="text-[13px] font-medium text-[#374151]">Renewals</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[18px] font-bold text-[#10B981]">{renewalStats?.renewals || 0}</span>
                                    <span className="text-[12px] font-medium text-[#1e293b]">({renewalStats?.renewal_rate || 0}%)</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center border-l border-[#F1F5F9]">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#FCA5A5]"></div>
                                    <span className="text-[13px] font-medium text-[#374151]">Cancellations</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[18px] font-bold text-[#EF4444]">{renewalStats?.cancellations || 0}</span>
                                    <span className="text-[12px] font-medium text-[#1e293b]">({renewalStats?.cancellation_rate || 0}%)</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Plan Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Most & Least Purchased Plans - 1/3 width */}
                <div className="flex flex-col gap-5">
                    {/* Most Purchased */}
                    <Card className="bg-gradient-to-br from-[rgba(16,185,129,0.06)] to-[rgba(16,185,129,0.02)] border-[1.5px] border-[rgba(16,185,129,0.20)] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px] relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#10B981]" />
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-[10px] font-bold uppercase tracking-wider">
                                    ↗ Most Purchased
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[20px]">🥇</span>
                                <h3 className="text-[20px] font-bold text-[#0F172A]">{planAnalytics?.most_purchased?.plan_name || 'N/A'}</h3>
                            </div>

                            <div className="flex justify-between items-center glass-input rounded-lg p-3 mb-4 border border-[#10B981]/10">
                                <div className="text-center">
                                    <p className="text-[16px] font-bold text-[#0F172A]">{planAnalytics?.most_purchased?.subscription_count || 0}</p>
                                    <p className="text-[11px] text-[#0f172a] font-medium">Subscribers</p>
                                </div>
                                <div className="h-8 w-[1px] bg-[#10B981]/20"></div>
                                <div className="text-center">
                                    <p className="text-[16px] font-bold text-[#10B981]">₹{planAnalytics?.most_purchased?.total_revenue?.toLocaleString() || 0}</p>
                                    <p className="text-[11px] text-[#0f172a] font-medium">Revenue</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px] font-medium">
                                    <span className="text-[#0f172a]">Market Share</span>
                                    <span className="text-[#0F172A]">90%</span>
                                </div>
                                <div className="h-[6px] w-full bg-[#10B981]/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#10B981] w-[90%] rounded-full" />
                                </div>
                                <p className="text-[11px] text-[#10B981] font-semibold mt-1">
                                    +340% above average
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Least Purchased */}
                    <Card className="bg-gradient-to-br from-[rgba(239,68,68,0.04)] to-[rgba(239,68,68,0.01)] border-[1.5px] border-[rgba(239,68,68,0.15)] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px] relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#EF4444]" />
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#EF4444]/10 text-[#EF4444] text-[10px] font-bold uppercase tracking-wider">
                                    ↘ Least Purchased
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingDown className="h-5 w-5 text-[#EF4444]" />
                                <h3 className="text-[20px] font-bold text-[#0F172A]">{planAnalytics?.least_purchased?.plan_name || 'N/A'}</h3>
                            </div>

                            <p className="text-[#0f172a] text-[13px] font-medium mb-1">
                                Only <span className="text-[#0F172A] font-bold">{planAnalytics?.least_purchased?.subscription_count || 0}</span> subscriptions
                            </p>
                            <p className="text-[#EF4444] text-[12px] font-medium">vs avg: -80% below average</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Plan Revenue Summary Table - 2/3 width */}
                <Card className="lg:col-span-2 glass-panel border-[1.5px] border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px]">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#F1F5F9]">
                        <CardTitle className="text-[#0F172A] text-[17px] font-bold">Plan Revenue Summary</CardTitle>
                        <Button variant="ghost" className="text-[#6366F1] text-[13px] font-semibold hover:bg-[#EEF2FF] hover:text-[#4F46E5] h-8 px-3">
                            View All →
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-[#F8FAFC] border-b border-[#F1F5F9]">
                                        <th className="text-left text-[#1e293b] text-[10px] font-bold uppercase tracking-wider py-3 px-6">Plan</th>
                                        <th className="text-center text-[#1e293b] text-[10px] font-bold uppercase tracking-wider py-3 px-6">Subscriptions</th>
                                        <th className="text-right text-[#1e293b] text-[10px] font-bold uppercase tracking-wider py-3 px-6">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {planAnalytics?.plans?.map((plan: any, index: number) => {
                                        const maxRevenue = Math.max(...(planAnalytics?.plans?.map((p: any) => p.total_revenue) || [0]));
                                        const widthPercentage = maxRevenue ? (plan.total_revenue / maxRevenue) * 100 : 0;
                                        const colors = ['#6366F1', '#0EA5E9', '#8B5CF6', '#F59E0B', '#F97316'];
                                        const color = colors[index % colors.length];

                                        return (
                                            <tr key={plan.plan_id} className="border-b border-[#F8FAFC] hover:bg-[#F8FAFC] transition-colors duration-150 group">
                                                <td className="py-4 px-6 relative">
                                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-[#6366F1] transition-colors" />
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                        <span className="text-[#0F172A] text-[14px] font-semibold">{plan.plan_name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-center text-[#374151] text-[14px] font-bold">{plan.subscription_count}</td>
                                                <td className="py-4 px-6 text-right relative">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-[14px] font-bold ${plan.total_revenue > 10000 ? 'text-[#10B981]' : (plan.total_revenue > 1000 ? '#6366F1' : '#1e293b')}`}>
                                                            ₹{plan.total_revenue.toLocaleString()}
                                                        </span>
                                                        <div className="h-[4px] bg-[#F1F5F9] w-[100px] rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${widthPercentage}%`,
                                                                    backgroundColor: color,
                                                                    opacity: 0.6
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
