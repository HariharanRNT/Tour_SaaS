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
    Check,
    Upload,
    File as FileIcon,
    X,
    Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
    confirmation_files?: string[]
    payment_reference?: string
    payment_mode?: string
    payment_date?: string
    payment_amount?: number
}

export default function AgentEnquiriesPage() {
    const router = useRouter()
    const { hasPermission, isSubUser } = useAuth()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('ALL')
    const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined, preset: string }>({
        from: subMonths(new Date(), 1),
        to: new Date(),
        preset: '1M'
    })
    const [isQuoteBuilderOpen, setIsQuoteBuilderOpen] = useState(false)

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [markConfirmed, setMarkConfirmed] = useState(false)
    const [confirmationFiles, setConfirmationFiles] = useState<File[]>([])
    const [isUploading, setIsUploading] = useState(false)

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [paymentReference, setPaymentReference] = useState('')
    const [paymentMode, setPaymentMode] = useState('')
    const [paymentDate, setPaymentDate] = useState('')
    const [paymentAmount, setPaymentAmount] = useState('')


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



    
    const handleConfirmSubmit = async () => {
        if (!selectedEnquiry || !markConfirmed) return
        setIsUploading(true)
        try {
            const token = localStorage.getItem('token')
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            let uploadedUrls: string[] = []

            for (const file of confirmationFiles) {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('folder', 'enquiry_confirmations')
                const res = await fetch(`${API_URL}/api/v1/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                })
                if (res.ok) {
                    const data = await res.json()
                    uploadedUrls.push(data.url)
                }
            }

            const updateRes = await fetch(`${API_URL}/api/v1/enquiries/agent/${selectedEnquiry.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Domain': domain
                },
                body: JSON.stringify({ 
                    status: 'CONFIRMED',
                    confirmation_files: uploadedUrls.length > 0 ? uploadedUrls : undefined
                })
            })

            if (!updateRes.ok) throw new Error('Failed to confirm enquiry')
            
            toast.success('Enquiry Confirmed successfully')
            setIsConfirmModalOpen(false)
            setConfirmationFiles([])
            setMarkConfirmed(false)
            queryClient.invalidateQueries({ queryKey: ['agent-enquiries'] })
            
            // Wait a moment then close details
            setTimeout(() => setIsDetailsOpen(false), 500)
        } catch (error: any) {
            toast.error(error.message || 'An error occurred')
        } finally {
            setIsUploading(false)
        }
    }

    const handlePaymentSubmit = async () => {
        if (!selectedEnquiry) return
        setIsUploading(true)
        try {
            const token = localStorage.getItem('token')
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const updateRes = await fetch(`${API_URL}/api/v1/enquiries/agent/${selectedEnquiry.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Domain': domain
                },
                body: JSON.stringify({ 
                    payment_reference: paymentReference,
                    payment_mode: paymentMode,
                    payment_date: paymentDate || undefined,
                    payment_amount: paymentAmount ? parseFloat(paymentAmount) : undefined
                })
            })

            if (!updateRes.ok) throw new Error('Failed to update payment details')
            
            toast.success('Payment details updated')
            setIsPaymentModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['agent-enquiries'] })
            
            // Update local selected enquiry so UI updates immediately
            setSelectedEnquiry(prev => prev ? {...prev, payment_reference: paymentReference, payment_mode: paymentMode, payment_date: paymentDate, payment_amount: paymentAmount ? parseFloat(paymentAmount) : undefined} : null)
        } catch (error: any) {
            toast.error(error.message || 'An error occurred')
        } finally {
            setIsUploading(false)
        }
    }

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
                                    Try adjusting your date range or search filters to find what you&apos;re looking for.
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
                                            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] break-all" style={{ color: '#000000', fontWeight: '800' }}>
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
                        </div>


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

                                    {(selectedEnquiry?.status || '').toUpperCase() === 'CONFIRMED' && (
                                        <Button
                                            className="h-10 px-5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-bold"
                                            onClick={() => {
                                                setPaymentReference(selectedEnquiry?.payment_reference || '');
                                                setPaymentMode(selectedEnquiry?.payment_mode || '');
                                                setPaymentDate(selectedEnquiry?.payment_date || '');
                                                setPaymentAmount(selectedEnquiry?.payment_amount?.toString() || '');
                                                setIsPaymentModalOpen(true);
                                            }}
                                        >
                                            Payment Details
                                        </Button>
                                    )}

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
                                                onClick={() => setIsConfirmModalOpen(true)}
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


                                </div>
                            </div>

                    </div>
                </DialogContent>
            </Dialog>

            
            {/* Confirm Modal */}
            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent className="sm:max-w-md bg-white backdrop-blur-2xl border-white/40 rounded-[32px] overflow-hidden shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[var(--color-primary-font)]">Confirm Enquiry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <Label className="text-sm font-bold text-[var(--color-primary-font)]/70">Upload Confirmation Documents (Optional)</Label>
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors relative">
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setConfirmationFiles(prev => [...prev, ...Array.from(e.target.files!)])
                                        }
                                    }}
                                />
                                <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                                    <Upload className="h-8 w-8 text-slate-400" />
                                    <p className="text-sm font-bold text-[var(--color-primary-font)]">Click or drag files here</p>
                                    <p className="text-xs font-medium text-slate-400">PDF, Images, Word docs</p>
                                </div>
                            </div>
                            
                            {confirmationFiles.length > 0 && (
                                <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                                    {confirmationFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileIcon className="h-4 w-4 text-[var(--primary)] shrink-0" />
                                                <span className="text-xs font-bold truncate">{file.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => setConfirmationFiles(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <Checkbox 
                                id="mark_confirmed" 
                                checked={markConfirmed}
                                onCheckedChange={(checked) => setMarkConfirmed(checked as boolean)}
                                className="border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white"
                            />
                            <Label htmlFor="mark_confirmed" className="text-sm font-bold text-emerald-800 cursor-pointer leading-snug">
                                I verify that this enquiry has been confirmed. Send the automated confirmation email.
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} className="rounded-full font-bold">Cancel</Button>
                        <Button 
                            className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                            disabled={!markConfirmed || isUploading}
                            onClick={handleConfirmSubmit}
                        >
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            Mark as Confirmed
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Details Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-md bg-white backdrop-blur-2xl border-white/40 rounded-[32px] overflow-hidden shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[var(--color-primary-font)]">Payment Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-[var(--color-primary-font)]/70">Customer Name</Label>
                            <Input className="glass-input font-medium rounded-lg bg-slate-50 cursor-not-allowed" value={selectedEnquiry?.customer_name || ''} readOnly maxLength={50} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-[var(--color-primary-font)]/70">Reference ID / Transaction ID</Label>
                            <Input 
                                placeholder="e.g. TXN12345678" 
                                className="glass-input font-medium rounded-lg" 
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                maxLength={50}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-[var(--color-primary-font)]/70">Mode of Payment</Label>
                                <Select value={paymentMode} onValueChange={setPaymentMode}>
                                    <SelectTrigger className="glass-input font-medium rounded-lg">
                                        <SelectValue placeholder="Select Payment Mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="UPI">UPI</SelectItem>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                                        <SelectItem value="Debit Card">Debit Card</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-[var(--color-primary-font)]/70">Payment Date</Label>
                                <Input 
                                    type="date"
                                    className="glass-input font-medium rounded-lg" 
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-[var(--color-primary-font)]/70">Amount Paid</Label>
                            <Input 
                                type="number"
                                placeholder="0.00" 
                                className="glass-input font-medium rounded-lg [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" 
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                onWheel={(e) => (e.target as HTMLElement).blur()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} className="rounded-full font-bold text-black border-slate-200 hover:bg-slate-100">Cancel</Button>
                        <Button 
                            className="rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold"
                            disabled={isUploading}
                            onClick={handlePaymentSubmit}
                        >
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Details
                        </Button>
                    </DialogFooter>
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
