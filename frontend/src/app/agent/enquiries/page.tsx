'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, subMonths, subYears, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import {
    MessageSquare,
    Calendar,
    MapPin,
    Users,
    Clock,
    ChevronRight,
    Search,
    Filter,
    ArrowLeft,
    MoreHorizontal,
    CheckCircle,
    XCircle,
    AlertCircle,
    Mail,
    Phone,
    User,
    Info,
    Trash2,
    Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { QuoteBuilderDrawer } from '@/components/enquiries/QuoteBuilderDrawer'
import { 
    Sparkles, 
    History, 
    Download, 
    ExternalLink, 
    FileText,
    Loader2
} from 'lucide-react'

interface Enquiry {
    id: string
    customer_name: string
    email: string
    phone: string
    travel_date: string
    travellers: number
    message?: string
    status: 'NEW' | 'CONTACTED' | 'CONFIRMED' | 'REJECTED' | 'new' | 'contacted' | 'confirmed' | 'rejected'
    package_name_snapshot: string
    created_at: string
    package_id?: string
    agent_notes?: string
    quotes_count: number
}

export default function AgentEnquiriesPage() {
    const router = useRouter()
    const { hasPermission, isSubUser } = useAuth()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('ALL')
    const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [conversionResult, setConversionResult] = useState<any>(null)
    const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined, preset: string }>({
        from: subMonths(new Date(), 1),
        to: new Date(),
        preset: '1M'
    })
    const [isQuoteBuilderOpen, setIsQuoteBuilderOpen] = useState(false)

    const { data: quoteHistory = [], isLoading: loadingHistory } = useQuery({
        queryKey: ['enquiry-quote-history', selectedEnquiry?.id],
        queryFn: async () => {
            if (!selectedEnquiry) return []
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/api/v1/enquiries/agent/${selectedEnquiry.id}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Failed to fetch quote history')
            const data = await res.json()
            return data.quotes || []
        },
        enabled: !!selectedEnquiry && isDetailsOpen
    })

    useEffect(() => {
        if (isSubUser && !hasPermission('enquiries', 'view')) {
            router.push('/agent/dashboard')
        }
    }, [isSubUser, hasPermission, router])

    const { data: enquiries = [], isLoading: loading } = useQuery<Enquiry[]>({
        queryKey: ['agent-enquiries'],
        queryFn: async () => {
            const token = localStorage.getItem('token')
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const res = await fetch(`${API_URL}/api/v1/enquiries/agent/list`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Domain': domain
                }
            })
            if (!res.ok) throw new Error('Failed to fetch enquiries')
            const data = await res.json()
            return data.enquiries || data
        }
    })

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const token = localStorage.getItem('token')
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const res = await fetch(`${API_URL}/api/v1/enquiries/agent/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Domain': domain
                },
                body: JSON.stringify({ status })
            })
            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.detail || 'Failed to update status')
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-enquiries'] })
            toast.success('Status updated successfully')
            setIsDetailsOpen(false)
        },
        onError: (error: any) => {
            toast.error(error.message)
        }
    })

    const convertToBookingMutation = useMutation({
        mutationFn: async (id: string) => {
            const token = localStorage.getItem('token')
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const res = await fetch(`${API_URL}/api/v1/enquiries/agent/${id}/convert-to-booking`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Domain': domain
                }
            })
            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.detail || 'Failed to convert to booking')
            }
            return res.json()
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['agent-enquiries'] })
            queryClient.invalidateQueries({ queryKey: ['agent-bookings'] })
            setConversionResult(data)
            toast.success('Converted to booking successfully!')
        },
        onError: (error: any) => {
            toast.error(error.message)
        }
    })

    const filteredEnquiries = enquiries.filter(enquiry => {
        const received = new Date(enquiry.created_at)
        const status = (enquiry.status || '').toUpperCase()

        // Date range check
        const matchesDate = !dateRange.from || !dateRange.to || isWithinInterval(received, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to)
        })

        const matchesSearch =
            enquiry.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            enquiry.package_name_snapshot?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            enquiry.email?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesTab = activeTab === 'ALL' || status === activeTab

        return matchesDate && matchesSearch && matchesTab
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Calculations for tab counts (respecting only search and date, not the active tab itself)
    const getTabCount = (tabStatus: string) => {
        return enquiries.filter(enquiry => {
            const received = new Date(enquiry.created_at)
            const status = (enquiry.status || '').toUpperCase()

            const matchesDate = !dateRange.from || !dateRange.to || isWithinInterval(received, {
                start: startOfDay(dateRange.from),
                end: endOfDay(dateRange.to)
            })

            const matchesSearch =
                enquiry.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                enquiry.package_name_snapshot?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                enquiry.email?.toLowerCase().includes(searchQuery.toLowerCase())

            if (!matchesDate || !matchesSearch) return false
            return tabStatus === 'ALL' || status === tabStatus
        }).length
    }

    const handlePresetChange = (preset: string) => {
        const now = new Date()
        let from: Date | undefined
        let to: Date | undefined = now

        switch (preset) {
            case '1M': from = subMonths(now, 1); break
            case '3M': from = subMonths(now, 3); break
            case '6M': from = subMonths(now, 6); break
            case '1Y': from = subYears(now, 1); break
            case 'ALL': from = undefined; to = undefined; break
        }
        setDateRange({ from, to, preset })
    }

    const getStatusStyles = (status: string) => {
        switch ((status || '').toUpperCase()) {
            case 'NEW': return 'bg-blue-600 text-white font-black'
            case 'CONTACTED': return 'bg-amber-600 text-white font-black'
            case 'CONFIRMED': return 'bg-green-700 text-white font-black'
            case 'REJECTED': return 'bg-red-600 text-white font-black'
            default: return 'bg-slate-600 text-white font-black'
        }
    }

    return (
        <div className="min-h-screen pb-20">
            <div className="container mx-auto px-4 pt-10 pb-6 max-w-5xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/agent/dashboard">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/20 backdrop-blur-md border border-white/30">
                                    <ArrowLeft className="h-5 w-5 text-[var(--color-primary-font)]" />
                                </Button>
                            </Link>
                            <nav className="text-xs font-bold text-[var(--color-primary-font)]/60 uppercase tracking-widest flex items-center gap-2">
                                Agent Portal <ChevronRight className="h-3 w-3" /> Enquiries
                            </nav>
                        </div>
                        <h1 className="text-4xl font-bold text-[var(--color-primary-font)]">
                            Customer Enquiries
                        </h1>
                    </div>
                </div>

                <div className="relative group mb-10">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--primary)] opacity-60" />
                    <Input
                        placeholder="Search reference, customer or package..."
                        className="w-full h-[52px] pl-14 pr-6 rounded-full bg-white/25 backdrop-blur-[16px] border-white/40 text-[var(--color-primary-font)] font-semibold shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                    <DatePickerWithRange
                        date={{ from: dateRange.from, to: dateRange.to }}
                        setDate={(newDate) => setDateRange({
                            from: newDate?.from,
                            to: newDate?.to,
                            preset: 'custom'
                        })}
                        onPresetSelect={(calendarPreset) => {
                            if (calendarPreset === 'last30') {
                                setDateRange(prev => ({ ...prev, preset: '1M' }))
                            } else {
                                setDateRange(prev => ({ ...prev, preset: 'custom' }))
                            }
                        }}
                    />

                    <div className="flex items-center gap-1.5 p-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
                        <span className="text-[10px] font-black uppercase text-[var(--color-primary-font)]/40 ml-2 mr-1">Quick:</span>
                        {[
                            { label: '1M', value: '1M' },
                            { label: '3M', value: '3M' },
                            { label: '6M', value: '6M' },
                            { label: '1Y', value: '1Y' },
                            { label: 'All', value: 'ALL' }
                        ].map((p) => (
                            <button
                                key={p.value}
                                onClick={() => handlePresetChange(p.value)}
                                className={`px-3 py-1.5 rounded-[8px] text-[11px] font-bold transition-all ${dateRange.preset === p.value
                                        ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary-glow)]'
                                        : 'text-[var(--color-primary-font)]/60 hover:bg-white/10'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <div className="flex justify-center">
                        <TabsList className="h-[52px] bg-white/15 backdrop-blur-xl p-1.5 rounded-full border border-white/30">
                            {[
                                { label: 'All', value: 'ALL', color: 'var(--primary)' },
                                { label: 'New', value: 'NEW', color: '#3B82F6' },
                                { label: 'Contacted', value: 'CONTACTED', color: '#F59E0B' },
                                { label: 'Confirmed', value: 'CONFIRMED', color: '#10B981' },
                                { label: 'Rejected', value: 'REJECTED', color: '#EF4444' }
                            ].map((tab) => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className={`rounded-full px-6 text-[11px] font-bold uppercase transition-all data-[state=active]:bg-[var(--active-bg)] data-[state=active]:text-white`}
                                    style={{
                                        '--active-bg': tab.color
                                    } as any}
                                >
                                    {tab.label} ({getTabCount(tab.value)})
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="grid gap-6">
                        {loading ? (
                            <div className="text-center py-20 opacity-50">Loading enquiries...</div>
                        ) : filteredEnquiries.length > 0 ? (
                            filteredEnquiries.map(enquiry => (
                                <Card key={enquiry.id} className="relative overflow-hidden border-white/40 bg-white/15 backdrop-blur-xl rounded-[24px] shadow-sm hover:shadow-lg transition-all group">
                                    <CardContent className="p-6 md:p-8">
                                        <div className="flex flex-col md:flex-row justify-between gap-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusStyles(enquiry.status)}`}>
                                                        {(enquiry.status || '').toUpperCase()}
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-bold text-[var(--color-primary-font)] break-all">
                                                    {enquiry.package_name_snapshot}
                                                </h3>

                                                <div className="flex flex-wrap gap-4 text-sm text-[var(--color-primary-font)]/70">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <User className="h-4 w-4 text-[var(--primary)] shrink-0" />
                                                        <span className="font-bold break-all">{enquiry.customer_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-[var(--primary)]" />
                                                        <span>{format(new Date(enquiry.travel_date), 'dd MMM yyyy')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-[var(--primary)]" />
                                                        <span>{enquiry.travellers} Guests</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col justify-between items-end gap-4 min-w-[200px]">
                                                <div className="flex gap-2">
                                                    {enquiry.quotes_count > 0 && (
                                                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                                                            <CheckCircle className="h-3 w-3" /> Quote Sent
                                                        </div>
                                                    )}
                                                    <div className="text-right text-[10px] font-black uppercase tracking-widest text-[var(--color-primary-font)]/40">
                                                        Received {format(new Date(enquiry.created_at), 'dd MMM')}
                                                    </div>
                                                </div>
                                                <Button
                                                    className="w-full md:w-auto h-12 px-8 rounded-full bg-gradient-to-r from-[var(--button-bg)] to-[var(--button-bg-light)] text-white font-bold shadow-lg shadow-[var(--button-glow)]"
                                                    onClick={() => { setSelectedEnquiry(enquiry); setIsDetailsOpen(true); }}
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="text-center py-24 bg-white/10 rounded-[32px] border border-dashed border-white/30 text-[var(--color-primary-font)]/40 backdrop-blur-sm">
                                <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <MessageSquare className="h-10 w-10 opacity-20" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--color-primary-font)] mb-2">
                                    No enquiries found for this period
                                </h3>
                                <p className="mb-8 text-sm max-w-[300px] mx-auto opacity-60">
                                    Try adjusting your date range or search filters to find what you're looking for.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => handlePresetChange('ALL')}
                                    className="rounded-full px-8 border-white/30 hover:bg-white/10 font-bold"
                                >
                                    View All Enquiries
                                </Button>
                            </div>
                        )}
                    </div>
                </Tabs>
            </div>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="sm:max-w-lg bg-white/80 backdrop-blur-2xl border-white/40 rounded-[32px] p-0 overflow-hidden shadow-2xl">
                    <div className="flex flex-col max-h-[85vh]">
                        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] px-5 py-3 text-white shrink-0">
                            <h2 className="text-lg font-bold mb-0.5">Enquiry Details</h2>
                            <p className="text-white/70 text-[10px] font-bold">{selectedEnquiry?.package_name_snapshot}</p>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar p-5">
                            {conversionResult ? (
                                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] space-y-4 animate-in fade-in zoom-in duration-300">
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className="h-14 w-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/40">
                                            <Check className="h-7 w-7" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h3 className="text-xl font-bold text-emerald-600">Converted Successfully!</h3>
                                            <p className="text-emerald-600/70 text-sm font-bold">Booking Reference: {conversionResult.booking?.booking_reference}</p>
                                        </div>
                                    </div>

                                    {conversionResult.payment_link && (
                                        <div className="p-5 bg-white rounded-2xl border border-emerald-500/20 space-y-3">
                                            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Sharable Payment Link</p>
                                            <div className="flex gap-2">
                                                <Input readOnly value={conversionResult.payment_link} className="bg-emerald-50/50 border-emerald-200" />
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(conversionResult.payment_link)
                                                        toast.success("Link copied to clipboard!")
                                                    }}
                                                    className="border-emerald-200 text-emerald-600 font-bold px-6"
                                                >
                                                    Copy
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-center pt-1">
                                        <Button
                                            variant="outline"
                                            className="rounded-full h-10 px-6 text-sm font-bold border-emerald-200 text-emerald-600"
                                            onClick={() => {
                                                setIsDetailsOpen(false)
                                                setConversionResult(null)
                                            }}
                                        >
                                            Close Details
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-4">
                                            <div className="p-3 bg-white/40 rounded-xl border border-white/60">
                                                <p className="text-[9px] font-black text-[var(--color-primary-font)]/50 uppercase tracking-widest mb-1">Customer</p>
                                                <p className="font-bold text-sm leading-tight break-all">{selectedEnquiry?.customer_name}</p>
                                                <div className="mt-1.5 space-y-0.5">
                                                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-primary-font)]/70 break-all">
                                                        <Mail className="h-3 w-3 shrink-0" /> {selectedEnquiry?.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-primary-font)]/70 break-all">
                                                        <Phone className="h-3 w-3 shrink-0" /> {selectedEnquiry?.phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="p-3 bg-white/40 rounded-xl border border-white/60">
                                                <p className="text-[9px] font-black text-[var(--color-primary-font)]/50 uppercase tracking-widest mb-1">Trip Details</p>
                                                <p className="font-bold text-sm leading-tight break-all">{selectedEnquiry?.package_name_snapshot}</p>
                                                <div className="mt-1.5 space-y-0.5">
                                                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-primary-font)]/70">
                                                        <Calendar className="h-3 w-3" /> {selectedEnquiry?.travel_date ? format(new Date(selectedEnquiry.travel_date), 'dd MMM yyyy') : ''}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-primary-font)]/70">
                                                        <Users className="h-3 w-3" /> {selectedEnquiry?.travellers} Guests
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {selectedEnquiry?.message && (
                                        <section>
                                            <p className="text-[9px] font-black text-[var(--color-primary-font)]/50 uppercase tracking-widest mb-1.5">Customer Message</p>
                                            <div className="p-3 bg-[var(--primary)]/5 rounded-xl border border-[var(--primary)]/10 text-[11px] italic text-[var(--color-primary-font)] break-all">
                                                &quot;{selectedEnquiry.message}&quot;
                                            </div>
                                        </section>
                                    )}

                                    {/* Agent Notes */}
                                    <section>
                                        <p className="text-[9px] font-black text-[var(--color-primary-font)]/50 uppercase tracking-widest mb-1.5">Agent Notes</p>
                                        <Textarea
                                            placeholder="Add internal notes about this enquiry..."
                                            defaultValue={selectedEnquiry?.agent_notes || ''}
                                            className="bg-white/50 border-white/40 min-h-[60px] resize-none rounded-xl text-[var(--color-primary-font)] font-semibold text-[11px]"
                                            onBlur={async (e) => {
                                                if (!selectedEnquiry) return
                                                const token = localStorage.getItem('token')
                                                const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
                                                await fetch(`${API_URL}/api/v1/enquiries/agent/${selectedEnquiry.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Domain': domain },
                                                    body: JSON.stringify({ agent_notes: e.target.value })
                                                })
                                            }}
                                        />
                                    </section>

                                    {/* Quote History */}
                                    <section className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black text-[var(--color-primary-font)]/50 uppercase tracking-widest">Quote History</p>
                                            <History className="h-3 w-3 text-slate-300" />
                                        </div>
                                        {loadingHistory ? (
                                            <div className="h-20 bg-slate-50 flex items-center justify-center rounded-2xl animate-pulse">
                                                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                                            </div>
                                        ) : quoteHistory.length > 0 ? (
                                            <div className="space-y-3">
                                                {quoteHistory.map((quote: any) => (
                                                    <div key={quote.id} className="p-3 bg-white/40 border border-white/60 rounded-xl flex items-center justify-between hover:bg-white/60 transition-all">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-600">
                                                                <FileText className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[13px] font-bold">Quote for {quote.quoted_packages?.length} Packages</p>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{format(new Date(quote.quote_sent_at), 'dd MMM yyyy, hh:mm a')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild>
                                                                <a href={`${API_URL}${quote.pdf_url}`} target="_blank" rel="noopener noreferrer">
                                                                    <ExternalLink className="h-4 w-4 text-slate-400" />
                                                                </a>
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild>
                                                                <a href={`${API_URL}${quote.pdf_url}`} download>
                                                                    <Download className="h-4 w-4 text-slate-400" />
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center">
                                                <p className="text-[11px] text-slate-400 font-bold">No quotes sent yet.</p>
                                            </div>
                                        )}
                                    </section>
                                </div>
                            )}
                        </div>

                        {!conversionResult && (
                            <div className="p-5 pt-3 border-t border-black/5 bg-white/50 shrink-0">
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        className="h-10 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold shadow-lg shadow-blue-500/20"
                                        onClick={() => {
                                            setIsDetailsOpen(false);
                                            setIsQuoteBuilderOpen(true);
                                        }}
                                    >
                                        <Sparkles className="h-3.5 w-3.5 mr-2" /> Send with AI
                                    </Button>
                                    {(selectedEnquiry?.status || '').toUpperCase() === 'NEW' && (
                                        <Button
                                            className="h-10 px-5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-bold"
                                            disabled={updateStatusMutation.isPending}
                                            onClick={() => updateStatusMutation.mutate({ id: selectedEnquiry!.id, status: 'CONTACTED' })}
                                        >
                                            Mark Contacted
                                        </Button>
                                    )}

                                    {['NEW', 'CONTACTED'].includes((selectedEnquiry?.status || '').toUpperCase()) && (
                                        <>
                                            <Button
                                                className="h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-bold"
                                                disabled={updateStatusMutation.isPending}
                                                onClick={() => updateStatusMutation.mutate({ id: selectedEnquiry!.id, status: 'CONFIRMED' })}
                                            >
                                                Confirm
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="h-10 px-5 rounded-full border-red-200 text-red-600 hover:bg-red-50 text-[13px] font-bold"
                                                disabled={updateStatusMutation.isPending}
                                                onClick={() => updateStatusMutation.mutate({ id: selectedEnquiry!.id, status: 'REJECTED' })}
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}

                                    {(selectedEnquiry?.status || '').toUpperCase() === 'CONFIRMED' && (
                                        <Button
                                            className="h-10 px-6 rounded-full bg-[var(--primary)] text-white font-black text-[13px] shadow-lg shadow-[var(--primary-glow)]"
                                            disabled={convertToBookingMutation.isPending}
                                            onClick={() => convertToBookingMutation.mutate(selectedEnquiry!.id)}
                                        >
                                            <Check className="h-4 w-4 mr-2" /> Convert to Booking
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <QuoteBuilderDrawer 
                isOpen={isQuoteBuilderOpen}
                onClose={() => {
                    setIsQuoteBuilderOpen(false)
                    queryClient.invalidateQueries({ queryKey: ['agent-enquiries'] })
                }}
                enquiry={selectedEnquiry}
            />
        </div>
    )
}
