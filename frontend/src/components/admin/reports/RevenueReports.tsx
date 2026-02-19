"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, Users, CreditCard, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'

interface RevenueReportsProps {
    dateRange: DateRange | undefined
}

export default function RevenueReports({ dateRange }: RevenueReportsProps) {
    const [summary, setSummary] = useState<any>(null)
    const [trends, setTrends] = useState<any[]>([])
    const [agentRevenue, setAgentRevenue] = useState<any[]>([])
    const [planRevenue, setPlanRevenue] = useState<any[]>([])
    const [paymentStatus, setPaymentStatus] = useState<any[]>([])
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

            const [summaryRes, trendsRes, agentRes, planRes, paymentRes] = await Promise.all([
                fetch(`http://localhost:8000/api/v1/reports/revenue/summary?${queryParams}`, { headers }),
                fetch(`http://localhost:8000/api/v1/reports/revenue/trends?period=month${queryParams}`, { headers }),
                fetch(`http://localhost:8000/api/v1/reports/revenue/by-agent?${queryParams}`, { headers }),
                fetch(`http://localhost:8000/api/v1/reports/revenue/by-plan?${queryParams}`, { headers }),
                fetch(`http://localhost:8000/api/v1/reports/revenue/payment-status?${queryParams}`, { headers })
            ])

            if (summaryRes.ok) setSummary(await summaryRes.json())

            if (trendsRes.ok) {
                const data = await trendsRes.json()
                setTrends(Array.isArray(data) ? data : [])
            }

            if (agentRes.ok) {
                const data = await agentRes.json()
                setAgentRevenue(Array.isArray(data) ? data : [])
            }

            if (planRes.ok) {
                const data = await planRes.json()
                setPlanRevenue(Array.isArray(data) ? data : [])
            }

            if (paymentRes.ok) {
                const data = await paymentRes.json()
                setPaymentStatus(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error('Error fetching revenue reports:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="text-[#64748B] text-center py-12">Loading reports...</div>
    }

    // Calculate payment status totals
    const paidTotal = paymentStatus.find(p => p.status === 'paid')?.amount || 0
    const pendingTotal = paymentStatus.find(p => p.status === 'pending')?.amount || 0
    const failedTotal = paymentStatus.find(p => p.status === 'failed')?.amount || 0

    // Calculate growth rate
    const calculateGrowth = () => {
        if (trends.length < 2) return 0
        const current = trends[trends.length - 1]?.revenue || 0
        const previous = trends[trends.length - 2]?.revenue || 0
        if (previous === 0) return 0
        return ((current - previous) / previous) * 100
    }

    const growthRate = calculateGrowth()

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                {/* Total Revenue - Spans 2 cols */}
                <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-[#10B981]/10 to-white border-[1.5px] border-[#10B981]/20 shadow-[0_4px_20px_rgba(16,185,129,0.1)] rounded-[16px] relative overflow-hidden h-[130px]">
                    <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                                    <DollarSign className="h-4 w-4 text-[#10B981]" />
                                </div>
                                <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">Total Revenue</p>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${growthRate >= 0 ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                                {growthRate >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                                <span className="text-[11px] font-bold">{Math.abs(growthRate).toFixed(1)}%</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-[32px] font-extrabold text-[#0F172A] tracking-tight fa-outfit">
                                ₹{summary?.total_revenue?.toLocaleString() || 0}
                            </div>
                            <p className="text-[12px] text-[#64748B] font-medium mt-1">Total earnings from all plans</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Status Cards */}
                {[
                    { label: 'PAID', value: paidTotal, sub: 'Successful', icon: CheckCircle, color: '#10B981', bg: '#DCFCE7' },
                    { label: 'PENDING', value: pendingTotal, sub: 'Awaiting', icon: Clock, color: '#F59E0B', bg: '#FEF3C7' },
                    { label: 'FAILED', value: failedTotal, sub: 'Transactions', icon: XCircle, color: '#EF4444', bg: '#FEE2E2' }
                ].map((item, index) => (
                    <Card key={index} className="bg-white border-[1.5px] border-[#F1F5F9] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 relative overflow-hidden h-[130px] rounded-[16px]">
                        <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
                            <div className="flex justify-between items-start">
                                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[1.2px]">{item.label}</p>
                                <div className="h-8 w-8 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: `${item.color}1F` }}>
                                    <item.icon className="h-[16px] w-[16px]" style={{ color: item.color }} />
                                </div>
                            </div>
                            <div>
                                <div className="text-[24px] font-extrabold text-[#0F172A] tracking-tight leading-none">
                                    ₹{item.value.toLocaleString()}
                                </div>
                                <p className="text-[11px] font-medium mt-1" style={{ color: item.color }}>{item.sub}</p>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 w-full h-[3px]" style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}4D)` }} />
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Revenue Bar Chart */}
                <Card className="bg-white border-[1.5px] border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[#0F172A] text-[17px] font-bold">Monthly Revenue</CardTitle>
                        <Button variant="outline" size="sm" className="h-[32px] text-[12px] font-medium text-[#64748B] border-[#E2E8F0]">
                            Filter <span className="ml-1">▼</span>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={trends} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                                <XAxis
                                    dataKey="period"
                                    stroke="#94A3B8"
                                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#94A3B8"
                                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    labelStyle={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}
                                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                    itemStyle={{ color: '#0F172A', fontWeight: 'bold', fontSize: '14px' }}
                                />
                                <Bar dataKey="revenue" fill="#10B981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Revenue Growth Line Chart */}
                <Card className="bg-white border-[1.5px] border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px]">
                    <CardHeader>
                        <CardTitle className="text-[#0F172A] text-[17px] font-bold">Revenue Growth Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trends}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                                <XAxis
                                    dataKey="period"
                                    stroke="#94A3B8"
                                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#94A3B8"
                                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    labelStyle={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}
                                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                    itemStyle={{ color: '#0F172A', fontWeight: 'bold', fontSize: '14px' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#8B5CF6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "#fff", stroke: "#8B5CF6", strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: "#8B5CF6", stroke: "#fff", strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Agent-wise Revenue */}
                <Card className="bg-white border-[1.5px] border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px]">
                    <CardHeader className="border-b border-[#F1F5F9] pb-4">
                        <CardTitle className="text-[#0F172A] text-[17px] font-bold">Agent-wise Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-[#F8FAFC]">
                                    <tr className="border-b border-[#F1F5F9]">
                                        <th className="text-left text-[#94A3B8] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Agent</th>
                                        <th className="text-right text-[#94A3B8] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Subs</th>
                                        <th className="text-right text-[#94A3B8] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agentRevenue.map((agent: any) => (
                                        <tr key={agent.agent_id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="text-[#0F172A] text-[14px] font-semibold">{agent.agent_name}</div>
                                                <div className="text-[#64748B] text-[12px]">{agent.email}</div>
                                            </td>
                                            <td className="py-4 px-6 text-right text-[#64748B] text-[13px] font-medium">{agent.subscription_count}</td>
                                            <td className="py-4 px-6 text-right text-[#10B981] text-[14px] font-bold">
                                                ₹{agent.total_revenue.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Plan-wise Revenue */}
                <Card className="bg-white border-[1.5px] border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px]">
                    <CardHeader className="border-b border-[#F1F5F9] pb-4">
                        <CardTitle className="text-[#0F172A] text-[17px] font-bold">Plan-wise Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-[#F8FAFC]">
                                    <tr className="border-b border-[#F1F5F9]">
                                        <th className="text-left text-[#94A3B8] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Plan</th>
                                        <th className="text-right text-[#94A3B8] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Price</th>
                                        <th className="text-right text-[#94A3B8] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Subs</th>
                                        <th className="text-right text-[#94A3B8] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {planRevenue.map((plan: any) => (
                                        <tr key={plan.plan_id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                                            <td className="py-4 px-6 text-[#0F172A] text-[14px] font-semibold">{plan.plan_name}</td>
                                            <td className="py-4 px-6 text-right text-[#64748B] text-[13px]">₹{plan.price.toLocaleString()}</td>
                                            <td className="py-4 px-6 text-right text-[#64748B] text-[13px]">{plan.subscription_count}</td>
                                            <td className="py-4 px-6 text-right text-[#10B981] text-[14px] font-bold">
                                                ₹{plan.total_revenue.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
