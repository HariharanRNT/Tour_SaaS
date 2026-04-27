'use client'

import { useState, useEffect } from 'react'
import { 
    X, 
    Sparkles, 
    Search, 
    ChevronRight, 
    Plus, 
    Minus, 
    FileText, 
    Mail, 
    Check, 
    Loader2, 
    ArrowLeft,
    Download,
    Eye,
    Globe,
    Calendar,
    Users,
    Mountain,
    IndianRupee
} from 'lucide-react'
import { 
    Drawer, 
    DrawerContent, 
    DrawerHeader, 
    DrawerTitle, 
    DrawerFooter, 
    DrawerClose 
} from '../ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card' // eslint-disable-line @typescript-eslint/no-unused-vars
import { toast } from 'sonner'
import { API_URL } from '@/lib/api'
import { format } from 'date-fns'
import { resolveImageUrl } from '@/lib/utils'

interface Package {
    id: string
    title: string
    destination: string
    country?: string
    price_per_person: number
    duration_days: number
    duration_nights: number
    feature_image_url?: string
    booking_type: 'INSTANT' | 'ENQUIRY'
}

interface QuoteBuilderDrawerProps {
    isOpen: boolean
    onClose: () => void
    enquiry: any
}

type Step = 'ANALYSIS' | 'SELECTION' | 'CUSTOMIZATION' | 'PREVIEW' | 'SENDING'

export function QuoteBuilderDrawer({ isOpen, onClose, enquiry }: QuoteBuilderDrawerProps) {
    const [step, setStep] = useState<Step>('ANALYSIS')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [aiData, setAiData] = useState<any>(null)
    const [availablePackages, setAvailablePackages] = useState<Package[]>([])
    const [selectedPackages, setSelectedPackages] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoadingPackages, setIsLoadingPackages] = useState(false)
    const [generatedQuote, setGeneratedQuote] = useState<any>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSending, setIsSending] = useState(false)
    
    const [emailDraft, setEmailDraft] = useState({
        subject: `Travel Quote for your Trip - ${enquiry?.customer_name}`,
        body: `Hi ${enquiry?.customer_name},\n\nThank you for choosing us! Based on your enquiry, I have hand-picked some travel packages that I think you'll love.\n\nPlease find the detailed quote attached as a PDF.\n\nLooking forward to hearing from you.`
    })

    // 1. Reset and Analyze Enquiry on Open / ID Change
    useEffect(() => {
        if (isOpen && enquiry?.id) {
            // Reset states for fresh start
            setAiData(null)
            setSelectedPackages([])
            setStep('ANALYSIS')
            setSearchQuery('')
            
            // Reset email draft with actual enquiry data
            setEmailDraft({
                subject: `Travel Quote for your Trip - ${enquiry.customer_name}`,
                body: `Hi ${enquiry.customer_name},\n\nThank you for choosing us! Based on your enquiry, I have hand-picked some travel packages that I think you'll love.\n\nPlease find the detailed quote attached as a PDF.\n\nLooking forward to hearing from you.`
            })
            
            // Trigger analysis
            handleStartAnalysis()
        }
    }, [isOpen, enquiry?.id])

    const handleStartAnalysis = async () => {
        setIsAnalyzing(true)
        try {
            const token = localStorage.getItem('token')
            // Pass actual enquiry message context implicitly via ID (backend handles it)
            const res = await fetch(`${API_URL}/api/v1/enquiries/agent/${enquiry.id}/analyze`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Analysis failed')
            const data = await res.json()
            setAiData(data)
            setStep('SELECTION')
            // Fetch all published packages to allow robust local filtering
            fetchPackages()
        } catch (err) {
            toast.error("AI Analysis failed. You can still manually select packages.")
            setStep('SELECTION')
            fetchPackages()
        } finally {
            setIsAnalyzing(false)
        }
    }

    const fetchPackages = async () => {
        setIsLoadingPackages(true)
        try {
            const token = localStorage.getItem('token')
            // Fetch all published packages for the agent
            let url = `${API_URL}/api/v1/agent/packages?status_filter=published&limit=100`
            
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setAvailablePackages(data.items || [])
        } catch (err) {
            toast.error("Failed to load packages")
        } finally {
            setIsLoadingPackages(false)
        }
    }

    const togglePackage = (pkg: Package) => {
        const isSelected = selectedPackages.some(p => p.packageId === pkg.id)
        if (isSelected) {
            setSelectedPackages(prev => prev.filter(p => p.packageId !== pkg.id))
        } else {
            setSelectedPackages(prev => [...prev, {
                packageId: pkg.id,
                packageName: pkg.title,
                quotedPrice: pkg.price_per_person,
                isCustomPrice: false,
                _pkg: pkg // temp reference
            }])
        }
    }

    const handlePriceChange = (pkgId: string, price: string) => {
        if (price === '') {
            setSelectedPackages(prev => prev.map(p => p.packageId === pkgId ? { ...p, quotedPrice: 0, isCustomPrice: true } : p))
            return
        }

        // Only allow digits and at most one decimal point
        if (!/^\d*\.?\d*$/.test(price)) return

        const [intPart, decPart] = price.split('.')
        
        // Limit to 8 digits before decimal
        if (intPart.length > 8) {
            toast.error('Maximum price limit reached (8 digits)')
            return
        }
        if (decPart !== undefined && decPart.length > 2) return

        const numVal = parseFloat(price) || 0

        setSelectedPackages(prev => prev.map(p => {
            if (p.packageId === pkgId) {
                return { 
                    ...p, 
                    quotedPrice: numVal,
                    isCustomPrice: numVal !== p._pkg.price_per_person
                }
            }
            return p
        }))
    }

    const handleGenerateQuote = async () => {
        if (selectedPackages.length === 0) {
            toast.error("Please select at least one package")
            return
        }
        setIsGenerating(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/api/v1/enquiries/agent/${enquiry.id}/generate-quote`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    packages: selectedPackages.map(({_pkg, ...rest}) => rest),
                    emailSubject: emailDraft.subject,
                    emailBody: emailDraft.body,
                    aiExtractedData: aiData
                })
            })
            if (!res.ok) throw new Error('Quote generation failed')
            const data = await res.json()
            setGeneratedQuote(data)
            setStep('PREVIEW')
        } catch (err) {
            toast.error("Failed to generate quote PDF")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSendQuote = async () => {
        setIsSending(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/api/v1/enquiries/agent/${enquiry.id}/send-quote/${generatedQuote.id}?email_subject=${encodeURIComponent(emailDraft.subject)}&email_body=${encodeURIComponent(emailDraft.body)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Failed to send email')
            toast.success("Quote sent successfully!")
            onClose()
        } catch (err) {
            toast.error("Failed to send email")
        } finally {
            setIsSending(false)
        }
    }

    const filteredPackages = availablePackages.filter(p => {
        // 1. Manual search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim()
            const matchesSearch = p.title.toLowerCase().includes(q) || 
                                 p.destination.toLowerCase().includes(q)
            if (!matchesSearch) return false
        }

        // 2. AI Extraction filters
        if (aiData) {
            // Destination filter — split multi-word destinations for better matching
            if (aiData.destinations && aiData.destinations.length > 0 && aiData.destinations[0]) {
                const destMatch = aiData.destinations.some((dest: string) => {
                    if (!dest) return false
                    // Try full phrase match first
                    const d = dest.toLowerCase().trim()
                    if (p.destination.toLowerCase().includes(d) ||
                        p.title.toLowerCase().includes(d) ||
                        (p.country && p.country.toLowerCase().includes(d))) return true
                    // Try individual words (handles "Kerala Tour" → "Kerala")
                    const words = d.split(/\s+/).filter((w: string) => w.length > 2)
                    return words.some((w: string) =>
                        p.destination.toLowerCase().includes(w) ||
                        p.title.toLowerCase().includes(w) ||
                        (p.country && p.country.toLowerCase().includes(w))
                    )
                })
                if (!destMatch) return false
            }

            // Days filter — ±2 day tolerance, coerce string to number
            const daysVal = typeof aiData.days === 'string' ? parseInt(aiData.days) : aiData.days
            if (daysVal && daysVal > 0) {
                if (Math.abs(p.duration_days - daysVal) > 2) return false
            }

            // Multi-city filter
            if (aiData.isMultiCity === true) {
                if ((p as any).package_mode && (p as any).package_mode !== 'multi') return false
            }

            // Budget filter — allow 15% buffer
            if (aiData.budgetHint) {
                const budget = parseFloat(String(aiData.budgetHint).replace(/[^0-9.]/g, ''))
                if (!isNaN(budget) && budget > 0 && p.price_per_person > 0) {
                    if (p.price_per_person > budget * 1.15) return false
                }
            }
        }

        return true
    })

    const hasFiltersApplied = !!aiData && (
        (Array.isArray(aiData.destinations) && aiData.destinations.length > 0 && !!aiData.destinations[0]) || 
        (aiData.days && Number(aiData.days) > 0) || 
        (typeof aiData.guests === 'number' && aiData.guests > 0) || 
        !!aiData.tripStyle ||
        !!aiData.isMultiCity ||
        (Array.isArray(aiData.keywords) && aiData.keywords.length > 0 && !!aiData.keywords[0]) ||
        !!aiData.budgetHint
    )

    // Log AI findings for developer debugging
    useEffect(() => {
        if (aiData) {
            console.log("[QuoteBuilder] AI Extraction Data:", aiData)
            console.log("[QuoteBuilder] Filters Applied:", hasFiltersApplied)
            if (aiData.raw_response) {
                console.log("[QuoteBuilder] Raw AI Response:", aiData.raw_response)
            }
        }
    }, [aiData, hasFiltersApplied])

    return (
        <Drawer open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DrawerContent className="h-[96vh] bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 border-t border-white/60 shadow-2xl p-0 flex flex-col">
                <div className="mx-auto w-full max-w-5xl flex-1 flex flex-col min-h-0">
                    <DrawerHeader className="px-8 pt-6 pb-4 flex flex-row items-center justify-between border-b border-white/40 bg-white/30 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <DrawerTitle className="text-2xl font-black bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">AI Quote Builder</DrawerTitle>
                                <p className="text-slate-500 text-sm font-semibold">Creating a quote for <span className="text-blue-600 font-bold">{enquiry?.customer_name}</span></p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Step Indicator */}
                            <div className="hidden md:flex items-center gap-1 bg-white/60 backdrop-blur-sm border border-white/50 rounded-full px-4 py-2">
                                {['Select', 'Customize', 'Preview', 'Send'].map((s, idx) => {
                                    const stepOrder = ['SELECTION', 'CUSTOMIZATION', 'PREVIEW', 'SENDING']
                                    const currentIdx = stepOrder.indexOf(step)
                                    const isActive = idx <= currentIdx
                                    return (
                                        <div key={s} className="flex items-center gap-1">
                                            <div className={`h-6 px-2 rounded-full text-[10px] font-black transition-all flex items-center ${
                                                isActive ? 'bg-blue-600 text-white' : 'text-slate-400'
                                            }`}>{s}</div>
                                            {idx < 3 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Back button for non-selection steps */}
                            {step !== 'SELECTION' && step !== 'ANALYSIS' && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        if (step === 'CUSTOMIZATION') setStep('SELECTION')
                                        if (step === 'PREVIEW') setStep('CUSTOMIZATION')
                                        if (step === 'SENDING') setStep('PREVIEW')
                                    }}
                                    className="h-9 px-4 rounded-full font-bold text-slate-500 bg-white/60 hover:bg-white/80 border border-white/50 text-sm"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                                </Button>
                            )}

                            {/* Primary action button — changes per step */}
                            {step === 'SELECTION' && (
                                <Button
                                    disabled={selectedPackages.length === 0}
                                    onClick={() => setStep('CUSTOMIZATION')}
                                    className="h-9 px-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-600/30 disabled:opacity-40 text-sm"
                                >
                                    Next ({selectedPackages.length}) <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                            )}
                            {step === 'CUSTOMIZATION' && (
                                <Button
                                    disabled={isGenerating}
                                    onClick={handleGenerateQuote}
                                    className="h-9 px-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-600/30 text-sm"
                                >
                                    {isGenerating
                                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Generating...</>
                                        : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Generate PDF</>}
                                </Button>
                            )}
                            {step === 'PREVIEW' && (
                                <Button
                                    onClick={() => setStep('SENDING')}
                                    className="h-9 px-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-600/30 text-sm"
                                >
                                    Send Email <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                            )}
                            {step === 'SENDING' && (
                                <Button
                                    disabled={isSending}
                                    onClick={handleSendQuote}
                                    className="h-9 px-5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-md shadow-emerald-500/30 text-sm"
                                >
                                    {isSending
                                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Sending...</>
                                        : <><Mail className="h-3.5 w-3.5 mr-1" /> Send Quote</>}
                                </Button>
                            )}

                            <DrawerClose asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 hover:bg-white/80">
                                    <X className="h-5 w-5 text-slate-500" />
                                </Button>
                            </DrawerClose>
                        </div>
                    </DrawerHeader>

                    {/* Step Content */}
                    <div className="flex-1 min-h-0 flex flex-col px-8 py-4">
                        {step === 'ANALYSIS' && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                                <div className="relative">
                                    <div className="h-28 w-28 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
                                    <div className="absolute inset-0 m-auto h-16 w-16 bg-blue-600/10 rounded-full flex items-center justify-center">
                                        <Sparkles className="h-8 w-8 text-blue-600 animate-pulse" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-800">Analyzing Enquiry</h3>
                                    <p className="text-slate-500 max-w-sm font-medium">Extracting destinations, trip duration, and guest details to filter matching packages...</p>
                                </div>
                                <div className="flex gap-2">
                                    {['Destination', 'Duration', 'Budget', 'Style'].map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-white/60 backdrop-blur-sm border border-white/50 rounded-full text-xs font-bold text-blue-600 animate-pulse">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 'SELECTION' && (
                            <div className="flex-1 min-h-0 flex flex-col gap-4">
                                {/* AI Insights Bar */}
                                {aiData && (
                                    <div className={`rounded-2xl border backdrop-blur-md transition-all ${
                                        hasFiltersApplied
                                            ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 border-blue-400/40 text-white shadow-lg shadow-blue-600/20'
                                            : 'bg-amber-50/80 border-amber-200 text-amber-900'
                                    }`}>
                                        <div className="p-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                                            <Badge className={`shrink-0 text-[10px] font-black uppercase tracking-wider border-none ${
                                                hasFiltersApplied ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {hasFiltersApplied ? '✦ AI Filters Active' : '⚠ Extraction Limited'}
                                            </Badge>
                                            {hasFiltersApplied ? (
                                                <>
                                                    {aiData.destinations?.length > 0 && (
                                                        <div className="flex items-center gap-1.5 text-sm font-bold">
                                                            <Globe className="h-3.5 w-3.5 opacity-70" />
                                                            {aiData.destinations.join(', ')}
                                                        </div>
                                                    )}
                                                    {aiData.days && Number(aiData.days) > 0 && (
                                                        <div className="flex items-center gap-1.5 text-sm font-bold">
                                                            <Calendar className="h-3.5 w-3.5 opacity-70" />
                                                            {aiData.days}D / {aiData.nights || '?'}N
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5 text-sm font-bold">
                                                        <Users className="h-3.5 w-3.5 opacity-70" />
                                                        {aiData.guests || enquiry?.travellers} Guests
                                                    </div>
                                                    {aiData.isMultiCity && (
                                                        <div className="flex items-center gap-1.5 text-sm font-bold">
                                                            <Mountain className="h-3.5 w-3.5 opacity-70" /> Multi-City
                                                        </div>
                                                    )}
                                                    {aiData.tripStyle && (
                                                        <div className="flex items-center gap-1.5 text-sm font-bold capitalize">
                                                            <Sparkles className="h-3.5 w-3.5 opacity-70" />
                                                            {aiData.tripStyle}
                                                        </div>
                                                    )}
                                                    {aiData.budgetHint && (
                                                        <div className="flex items-center gap-1.5 text-sm font-bold">
                                                            <IndianRupee className="h-3.5 w-3.5 opacity-70" />
                                                            Budget ≤ {aiData.budgetHint}
                                                        </div>
                                                    )}
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        onClick={() => setAiData(null)}
                                                        className="ml-auto text-[11px] font-black uppercase tracking-widest hover:bg-white/15 text-white/80 h-7 px-3 rounded-full"
                                                    >Clear Filters</Button>
                                                </>
                                            ) : (
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold italic opacity-80">Showing all packages. Try searching below.</p>
                                                    {aiData?.internal_error && (
                                                        <p className="text-[10px] font-mono opacity-50 mt-0.5 truncate">Error: {aiData.internal_error}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-4 pb-3 text-[11px] font-bold opacity-70">
                                            {filteredPackages.length} package{filteredPackages.length !== 1 ? 's' : ''} match{filteredPackages.length === 1 ? 'es' : ''} your filters
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1 group">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                        </div>
                                        <Input
                                            placeholder="Search packages by destination or name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-12 pl-12 pr-6 bg-white/70 backdrop-blur-sm border-2 border-white/60 focus:border-blue-500 focus:ring-0 rounded-2xl font-semibold transition-all shadow-sm"
                                        />
                                    </div>
                                    {searchQuery && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => setSearchQuery('')}
                                            className="h-12 px-5 rounded-2xl font-bold text-slate-500 bg-white/60 hover:bg-white/80 border border-white/50"
                                        >
                                            Show All
                                        </Button>
                                    )}
                                </div>

                                <div className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2">
                                    {/* Select All row */}
                                    {!isLoadingPackages && filteredPackages.length > 0 && (() => {
                                        const allSelected = filteredPackages.every(p => selectedPackages.some(s => s.packageId === p.id))
                                        const someSelected = filteredPackages.some(p => selectedPackages.some(s => s.packageId === p.id))
                                        return (
                                            <div className="flex items-center justify-between mb-4 px-1">
                                                <p className="text-sm text-slate-500 font-semibold">
                                                    {filteredPackages.length} package{filteredPackages.length !== 1 ? 's' : ''} shown
                                                    {selectedPackages.length > 0 && <span className="text-blue-600 font-bold ml-1">· {selectedPackages.length} selected</span>}
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (allSelected) {
                                                            const visibleIds = new Set(filteredPackages.map(p => p.id))
                                                            setSelectedPackages(prev => prev.filter(s => !visibleIds.has(s.packageId)))
                                                        } else {
                                                            const existing = new Set(selectedPackages.map(s => s.packageId))
                                                            const toAdd = filteredPackages
                                                                .filter(p => !existing.has(p.id))
                                                                .map(p => ({
                                                                    packageId: p.id,
                                                                    packageName: p.title,
                                                                    quotedPrice: p.price_per_person,
                                                                    isCustomPrice: false,
                                                                }))
                                                            setSelectedPackages(prev => [...prev, ...toAdd])
                                                        }
                                                    }}
                                                    className={`h-8 px-4 rounded-full text-xs font-black uppercase tracking-wider border transition-all ${
                                                        allSelected
                                                            ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                                                            : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300'
                                                    }`}
                                                >
                                                    {allSelected
                                                        ? <><Check className="h-3 w-3 mr-1.5 inline text-blue-600" /> Deselect All</>
                                                        : <><Plus className="h-3 w-3 mr-1.5 inline" /> Select All ({filteredPackages.length})</>
                                                    }
                                                </Button>
                                            </div>
                                        )
                                    })()}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-8">
                                        {isLoadingPackages ? (
                                            Array(6).fill(0).map((_, i) => (
                                                <div key={i} className="h-[280px] rounded-[24px] bg-white/40 animate-pulse border border-white/30" />
                                            ))
                                        ) : filteredPackages.length === 0 ? (
                                            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
                                                <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                                    <Search className="h-8 w-8 text-blue-300" />
                                                </div>
                                                <h4 className="font-bold text-slate-700 mb-1">No matching packages</h4>
                                                <p className="text-slate-400 text-sm mb-4">Try clearing AI filters or use the search box above.</p>
                                                <Button variant="outline" onClick={() => { setAiData(null); setSearchQuery(''); }} className="rounded-full px-6 font-bold text-blue-600 border-blue-200">
                                                    Show All Packages
                                                </Button>
                                            </div>
                                        ) : filteredPackages.map(pkg => {
                                            const isSelected = selectedPackages.some(p => p.packageId === pkg.id)
                                            return (
                                            <div
                                                key={pkg.id}
                                                onClick={() => togglePackage(pkg)}
                                                className={`group relative rounded-[20px] border-2 transition-all duration-300 cursor-pointer bg-white ${
                                                    isSelected
                                                        ? 'border-blue-500 shadow-xl shadow-blue-500/20'
                                                        : 'border-slate-100 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10'
                                                }`}
                                            >
                                                <div className="relative h-40 overflow-hidden rounded-t-[18px]">
                                                    <img
                                                        src={resolveImageUrl(pkg.feature_image_url)}
                                                        alt={pkg.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                                                    <div className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center shadow-lg transition-all ${
                                                        isSelected ? 'bg-blue-600 scale-110' : 'bg-white/80 backdrop-blur-sm'
                                                    }`}>
                                                        {isSelected
                                                            ? <Check className="h-4 w-4 text-white" />
                                                            : <Plus className="h-4 w-4 text-slate-400" />}
                                                    </div>
                                                    <div className="absolute bottom-3 left-3">
                                                        <Badge className="bg-black/50 backdrop-blur-md border-none text-white px-2.5 py-0.5 text-[11px] font-bold">
                                                            {pkg.duration_days}D / {pkg.duration_nights}N
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-white rounded-b-[18px]">
                                                    <h4 className="font-bold text-base leading-tight mb-1 text-slate-800">{pkg.title}</h4>
                                                    <p className="text-slate-500 text-xs font-semibold flex items-center gap-1 mb-3">
                                                        <Globe className="h-3 w-3" /> {pkg.destination}
                                                    </p>
                                                    {pkg.booking_type === 'INSTANT' ? (
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-[10px] font-black uppercase text-slate-400">INR</span>
                                                            <span className="text-lg font-black text-blue-600">{pkg.price_per_person.toLocaleString()}</span>
                                                            <span className="text-[10px] text-slate-400 font-medium">/person</span>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-amber-600 border-amber-200 bg-amber-50 rounded-full py-0.5 px-3">
                                                            Price on Enquiry
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'CUSTOMIZATION' && (
                            <div className="h-full flex flex-col gap-8">
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Set Custom Prices</h3>
                                    <p className="text-slate-500 font-medium">You can override the base package price for this specific quote.</p>
                                </div>

                                <ScrollArea className="flex-1">
                                    <div className="space-y-6 pb-8">
                                        {selectedPackages.map(p => (
                                            <div key={p.packageId} className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                                                <div className="h-20 w-32 rounded-2xl overflow-hidden shadow-sm">
                                                    <img 
                                                        src={resolveImageUrl(p._pkg.feature_image_url)} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-lg">{p.packageName}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-slate-500 text-sm font-bold">Original: INR {p._pkg.price_per_person.toLocaleString()}</p>
                                                        {p._pkg.booking_type === 'INSTANT' && (
                                                            <Badge variant="outline" className="bg-white text-[10px] uppercase font-bold py-0.5 border-slate-200">Instant</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="w-full md:w-64 space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-400">
                                                        {p._pkg.booking_type === 'ENQUIRY' ? 'QUOTE PRICE' : 'PRICE'}
                                                    </label>
                                                    
                                                    {p._pkg.booking_type === 'ENQUIRY' ? (
                                                        <div className="space-y-1">
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">INR</span>
                                                                <Input 
                                                                    type="text"
                                                                    inputMode="numeric" 
                                                                    className="h-12 pl-12 rounded-xl bg-white border-2 border-slate-100 focus:border-blue-600 font-bold"
                                                                    value={p.quotedPrice}
                                                                    onChange={(e) => handlePriceChange(p.packageId, e.target.value)}
                                                                />
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-medium">Customizable for Enquiry packages</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <div className="h-12 px-5 bg-slate-100/50 rounded-xl flex items-center gap-3 border border-slate-100">
                                                                <span className="font-bold text-slate-500">INR</span>
                                                                <span className="font-black text-slate-700">{p._pkg.price_per_person.toLocaleString()}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                                🔒 Fixed price — Instant Booking package
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        {step === 'PREVIEW' && (
                            <div className="h-full flex gap-8">
                                <div className="flex-1 flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold">Review Quote PDF</h3>
                                            <p className="text-slate-500 font-medium">This document will be sent to the customer.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="rounded-xl h-10 px-4 font-bold" asChild>
                                                <a href={resolveImageUrl(generatedQuote.pdf_url)} target="_blank" rel="noopener noreferrer">
                                                    <Eye className="h-4 w-4 mr-2" /> View Full
                                                </a>
                                            </Button>
                                            <Button variant="outline" className="rounded-xl h-10 px-4 font-bold" asChild>
                                                <a href={resolveImageUrl(generatedQuote.pdf_url)} download>
                                                    <Download className="h-4 w-4 mr-2" /> Download
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl relative group">
                                        <iframe 
                                            src={`${resolveImageUrl(generatedQuote.pdf_url)}#toolbar=0`} 
                                            className="w-full h-full border-none"
                                        />
                                        <div className="absolute inset-0 bg-black/5 pointer-events-none group-hover:bg-transparent transition-all" />
                                    </div>
                                </div>
                                <div className="w-80 flex flex-col gap-6">
                                    <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 space-y-4">
                                        <h4 className="font-bold text-blue-900">Summary</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-blue-700 font-medium">Packages</span>
                                                <span className="font-bold text-blue-900">{selectedPackages.length}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-blue-700 font-medium">Total Price (approx)</span>
                                                <span className="font-bold text-blue-900">
                                                    INR {selectedPackages.reduce((acc, p) => acc + (p.quotedPrice * (enquiry?.travellers || 1)), 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100 space-y-2">
                                        <div className="flex items-center gap-2 text-emerald-900 font-bold mb-1">
                                            <Check className="h-4 w-4" /> Ready to Send
                                        </div>
                                        <p className="text-emerald-700 text-xs font-medium">Click next to compose the final email to the customer.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'SENDING' && (
                            <div className="h-full flex flex-col gap-8 max-w-3xl mx-auto">
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Compose Email</h3>
                                    <p className="text-slate-500 font-medium">Personalize the message for {enquiry?.customer_name}.</p>
                                </div>

                                <div className="flex-1 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Recipient</label>
                                        <div className="h-12 px-5 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            <span className="font-bold text-slate-600">{enquiry?.email}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Subject</label>
                                        <Input 
                                            value={emailDraft.subject}
                                            onChange={(e) => setEmailDraft(prev => ({...prev, subject: e.target.value}))}
                                            className="h-12 px-5 bg-white border-2 border-slate-100 focus:border-blue-600 rounded-2xl font-bold"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Message Body</label>
                                        <Textarea 
                                            value={emailDraft.body}
                                            onChange={(e) => setEmailDraft(prev => ({...prev, body: e.target.value}))}
                                            className="min-h-[250px] p-6 bg-white border-2 border-slate-100 focus:border-blue-600 rounded-[32px] font-medium leading-relaxed resize-none"
                                        />
                                    </div>

                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                        <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
                                        <p className="text-xs text-amber-700 font-bold leading-relaxed">
                                            The generated travel quote PDF will be automatically attached as a professional file named "Travel_Quote_{enquiry?.customer_name.replace(' ', '_')}.pdf".
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
