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
            {/* Agent-wise Bookings Only */}
            <Card className="glass-panel border-[1.5px] border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.05)] rounded-[16px]">
                <CardHeader className="border-b border-[#F1F5F9] pb-4">
                    <div className="flex items-center justify-between mb-4">
                        <CardTitle className="text-[#0F172A] text-[17px] font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-[#6366F1]" />
                            Agent-wise Bookings
                        </CardTitle>
                    </div>
                    <div className="max-w-md">
                        <Input
                            placeholder="Search agents..."
                            value={searchAgent}
                            onChange={(e) => setSearchAgent(e.target.value)}
                            className="bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] placeholder:text-[#1e293b] focus-visible:ring-[#6366F1]"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-[#F8FAFC] z-10">
                                <tr className="border-b border-[#F1F5F9]">
                                    <th className="text-left text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-4 px-8">Agent</th>
                                    <th className="text-center text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-4 px-8">Enquiries</th>
                                    <th className="text-center text-[#1e293b] text-[11px] font-bold uppercase tracking-wider py-4 px-8">Total Bookings</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAgents.map((agent: any) => (
                                    <tr key={agent.agent_id} className="border-b border-[#F1F5F9] transition-colors">
                                        <td className="py-5 px-8">
                                            <div className="text-[#0F172A] text-[14px] font-semibold">{agent.agent_name}</div>
                                            <div className="text-[#0f172a] text-[12px] opacity-70">{agent.email}</div>
                                        </td>
                                        <td className="py-5 px-8 text-center text-[#6366F1] text-[15px] font-bold">{agent.total_enquiries}</td>
                                        <td className="py-5 px-8 text-center text-[#0F172A] text-[15px] font-extrabold">{agent.total_bookings}</td>
                                    </tr>
                                ))}
                                {filteredAgents.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-[#0f172a] font-medium opacity-60">
                                            No agents found matching your search criteria
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
