"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CheckCircle, Clock, XCircle, TrendingUp, Users, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { API_URL } from '@/lib/api'

interface BookingReportsProps {
    dateRange: DateRange | undefined
}

export default function BookingReports({ dateRange }: BookingReportsProps) {
    const [summary, setSummary] = useState<any>(null)
    const [agentBookings, setAgentBookings] = useState<any[]>([])
    const [packageBookings, setPackageBookings] = useState<any[]>([])
    const [conversion, setConversion] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [searchAgent, setSearchAgent] = useState('')
    const [searchPackage, setSearchPackage] = useState('')

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

            const [summaryRes, agentRes, packageRes, conversionRes] = await Promise.all([
                fetch(`${API_URL}/api/v1/reports/bookings/summary?${queryParams}`, { headers }),
                fetch(`${API_URL}/api/v1/reports/bookings/by-agent?${queryParams}`, { headers }),
                fetch(`${API_URL}/api/v1/reports/bookings/by-package?${queryParams}`, { headers }),
                fetch(`${API_URL}/api/v1/reports/bookings/conversion?${queryParams}`, { headers })
            ])

            if (summaryRes.ok) setSummary(await summaryRes.json())

            if (agentRes.ok) {
                const data = await agentRes.json()
                setAgentBookings(Array.isArray(data) ? data : [])
            }

            if (packageRes.ok) {
                const data = await packageRes.json()
                setPackageBookings(Array.isArray(data) ? data : [])
            }

            if (conversionRes.ok) setConversion(await conversionRes.json())
        } catch (error) {
            console.error('Error fetching booking reports:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="text-[#0f172a] text-center py-12">Loading reports...</div>
    }

    const filteredAgents = agentBookings.filter(agent =>
        agent.agent_name.toLowerCase().includes(searchAgent.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchAgent.toLowerCase())
    )

    const filteredPackages = packageBookings.filter(pkg =>
        pkg.package_name.toLowerCase().includes(searchPackage.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                {[
                    { label: 'TOTAL BOOKINGS', value: summary?.total || 0, sub: 'All time', icon: Calendar, color: '#6366F1', bg: '#EEF2FF', border: '#6366F1' },
                    { label: 'COMPLETED', value: summary?.completed || 0, sub: 'Successfully done', icon: CheckCircle, color: '#10B981', bg: '#DCFCE7', border: '#10B981' },
                    { label: 'UPCOMING', value: summary?.upcoming || 0, sub: 'Confirmed', icon: Clock, color: '#F59E0B', bg: '#FEF3C7', border: '#F59E0B' },
                    { label: 'CANCELLED', value: summary?.cancelled || 0, sub: 'Terminated', icon: XCircle, color: '#EF4444', bg: '#FEE2E2', border: '#EF4444' },
                    { label: 'CONVERSION', value: `${conversion?.conversion_rate || 0}%`, sub: 'Success rate', icon: TrendingUp, color: '#8B5CF6', bg: '#F3E8FF', border: '#8B5CF6' }
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
                                <div className="text-[32px] font-extrabold text-[#0F172A] tracking-[-1px] leading-none">
                                    {item.value}
                                </div>
                                <p className="text-[12px] font-medium mt-1" style={{ color: item.color }}>{item.sub}</p>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 w-full h-[3px]" style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}4D)` }} />
                    </Card>
                ))}
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Agent-wise Bookings */}
                <Card className="glass-panel border-[1.5px] border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px]">
                    <CardHeader className="border-b border-[#F1F5F9] pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <CardTitle className="text-[#0F172A] text-[17px] font-bold flex items-center gap-2">
                                <Users className="h-5 w-5 text-[#6366F1]" />
                                Agent-wise Bookings
                            </CardTitle>
                        </div>
                        <Input
                            placeholder="Search agents..."
                            value={searchAgent}
                            onChange={(e) => setSearchAgent(e.target.value)}
                            className="bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] placeholder:text-[#1e293b] focus-visible:ring-[#6366F1]"
                        />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-[#F8FAFC]">
                                    <tr className="border-b border-[#F1F5F9]">
                                        <th className="text-left text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Agent</th>
                                        <th className="text-center text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Total</th>
                                        <th className="text-center text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Done</th>
                                        <th className="text-center text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Cancel</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAgents.map((agent: any) => (
                                        <tr key={agent.agent_id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="text-[#0F172A] text-[14px] font-semibold">{agent.agent_name}</div>
                                                <div className="text-[#0f172a] text-[12px]">{agent.email}</div>
                                            </td>
                                            <td className="py-4 px-6 text-center text-[#0F172A] text-[14px] font-bold">{agent.total_bookings}</td>
                                            <td className="py-4 px-6 text-center text-[#10B981] text-[14px] font-medium">{agent.completed}</td>
                                            <td className="py-4 px-6 text-center text-[#EF4444] text-[14px] font-medium">{agent.cancelled}</td>
                                        </tr>
                                    ))}
                                    {filteredAgents.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-[#0f172a]">
                                                No agents found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Package-wise Bookings */}
                <Card className="glass-panel border-[1.5px] border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px]">
                    <CardHeader className="border-b border-[#F1F5F9] pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <CardTitle className="text-[#0F172A] text-[17px] font-bold flex items-center gap-2">
                                <Package className="h-5 w-5 text-[#8B5CF6]" />
                                Package-wise Bookings
                            </CardTitle>
                        </div>
                        <Input
                            placeholder="Search packages..."
                            value={searchPackage}
                            onChange={(e) => setSearchPackage(e.target.value)}
                            className="bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] placeholder:text-[#1e293b] focus-visible:ring-[#8B5CF6]"
                        />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-[#F8FAFC]">
                                    <tr className="border-b border-[#F1F5F9]">
                                        <th className="text-left text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Package</th>
                                        <th className="text-center text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Total</th>
                                        <th className="text-center text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Done</th>
                                        <th className="text-center text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-3 px-6">Cancel</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPackages.map((pkg: any) => (
                                        <tr key={pkg.package_id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                                            <td className="py-4 px-6 text-[#0F172A] text-[14px] font-semibold">{pkg.package_name}</td>
                                            <td className="py-4 px-6 text-center text-[#0F172A] text-[14px] font-bold">{pkg.total_bookings}</td>
                                            <td className="py-4 px-6 text-center text-[#10B981] text-[14px] font-medium">{pkg.completed}</td>
                                            <td className="py-4 px-6 text-center text-[#EF4444] text-[14px] font-medium">{pkg.cancelled}</td>
                                        </tr>
                                    ))}
                                    {filteredPackages.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-[#0f172a]">
                                                No packages found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
