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
import { Card, CardContent } from '@/components/ui/card'
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
        setSelectedPackages(prev => prev.map(p => {
            if (p.packageId === pkgId) {
                return { 
                    ...p, 
                    quotedPrice: parseFloat(price) || 0,
                    isCustomPrice: parseFloat(price) !== p._pkg.price_per_person
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
        // Multi-level filtering
        
        // 1. Manual search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim()
            const matchesSearch = p.title.toLowerCase().includes(q) || 
                                 p.destination.toLowerCase().includes(q)
            if (!matchesSearch) return false
        }

        // 2. AI Extraction filters (only if aiData is present)
        if (aiData) {
            // Destination filter — case insensitive partial match
            // ONLY filter if destinations list is non-empty
            if (aiData.destinations && aiData.destinations.length > 0) {
                const destMatch = aiData.destinations.some((dest: string) => {
                    if (!dest) return false
                    const d = dest.toLowerCase().trim()
                    return p.destination.toLowerCase().includes(d) ||
                           p.title.toLowerCase().includes(d) ||
                           (p.country && p.country.toLowerCase().includes(d))
                })
                if (!destMatch) return false
            }

            // Days filter — ±1 day tolerance (Only if days > 0)
            if (aiData.days && aiData.days > 0) {
                if (Math.abs(p.duration_days - aiData.days) > 1) return false
            }

            // Budget filter — Parse numeric hints and allow 10% buffer
            if (aiData.budgetHint) {
                const budget = parseFloat(aiData.budgetHint.replace(/[^0-9.]/g, ''))
                if (!isNaN(budget) && budget > 0) {
                    if (p.price_per_person > (budget * 1.1)) return false
                }
            }
        }

        return true
    })

    const hasFiltersApplied = !!aiData && (
        (Array.isArray(aiData.destinations) && aiData.destinations.length > 0 && !!aiData.destinations[0]) || 
        (typeof aiData.days === 'number' && aiData.days > 0) || 
        (typeof aiData.guests === 'number' && aiData.guests > 0) || 
        !!aiData.tripStyle ||
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
            <DrawerContent className="h-[96vh] bg-white/95 backdrop-blur-3xl border-none p-0">
                <div className="mx-auto w-full max-w-5xl h-full flex flex-col">
                    <DrawerHeader className="px-8 pt-8 pb-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <DrawerTitle className="text-2xl font-bold">AI Quote Builder</DrawerTitle>
                                <p className="text-slate-500 text-sm font-medium">Create a professional quote for {enquiry?.customer_name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Step Indicator */}
                            {['Selection', 'Customize', 'Preview', 'Send'].map((s, idx) => {
                                const stepOrder = ['SELECTION', 'CUSTOMIZATION', 'PREVIEW', 'SENDING']
                                const currentIdx = stepOrder.indexOf(step)
                                return (
                                    <div key={s} className="flex items-center">
                                        <div className={`h-1.5 w-8 rounded-full transition-all ${idx <= currentIdx ? 'bg-blue-600' : 'bg-slate-200'}`} />
                                        {idx < 3 && <ChevronRight className="h-3 w-3 text-slate-300 mx-1" />}
                                    </div>
                                )
                            })}
                            <DrawerClose asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 ml-4 rounded-full border border-slate-200">
                                    <X className="h-5 w-5" />
                                </Button>
                            </DrawerClose>
                        </div>
                    </DrawerHeader>

                    {/* Step Content */}
                    <div className="flex-1 overflow-hidden px-8 py-4">
                        {step === 'ANALYSIS' && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                <div className="relative">
                                    <div className="h-24 w-24 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
                                    <Sparkles className="absolute inset-0 m-auto h-10 w-10 text-blue-600 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">AI is Analyzing Enquiry</h3>
                                    <p className="text-slate-500 max-w-sm mt-2">Extracting destinations, trip duration, and guest details to filter matching packages...</p>
                                </div>
                            </div>
                        )}

                        {step === 'SELECTION' && (
                            <div className="h-full flex flex-col gap-6">
                                {/* AI Insights Bar */}
                                {aiData && (
                                    <div className={`p-4 rounded-2xl flex flex-wrap items-center gap-6 shadow-lg transition-all border-l-4 ${hasFiltersApplied ? 'bg-blue-600 border-blue-400 text-white shadow-blue-600/20' : 'bg-amber-50 border-amber-400 text-amber-900 shadow-amber-600/10'}`}>
                                        <div className="flex items-center gap-2">
                                            <Badge className={`${hasFiltersApplied ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'} border-none font-bold`}>
                                                {hasFiltersApplied ? 'AI Insight applied' : 'Extraction limited'}
                                            </Badge>
                                        </div>
                                        
                                        {hasFiltersApplied ? (
                                            <>
                                                <div className="flex items-center gap-2 text-sm font-bold">
                                                    <Globe className="h-4 w-4 opacity-70" />
                                                    {aiData.destinations?.join(', ') || 'Any Destination'}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-bold">
                                                    <Calendar className="h-4 w-4 opacity-70" />
                                                    {aiData.days || '?'} Days / {aiData.nights || '?'} Nights
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-bold">
                                                    <Users className="h-4 w-4 opacity-70" />
                                                    {aiData.guests || enquiry?.travellers} Guests
                                                </div>
                                                {aiData.tripStyle && (
                                                    <div className="flex items-center gap-2 text-sm font-bold capitalize">
                                                        <Sparkles className="h-4 w-4 opacity-70" />
                                                        {aiData.tripStyle}
                                                    </div>
                                                )}
                                                {aiData.budgetHint && (
                                                    <div className="flex items-center gap-2 text-sm font-bold">
                                                        <IndianRupee className="h-4 w-4 opacity-70" />
                                                        Budget: {aiData.budgetHint}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex-1">
                                                <p className="text-sm font-bold italic opacity-70 leading-tight">
                                                    Giving you a hand... extraction failed, showing all packages. Try searching below.
                                                </p>
                                                {aiData?.internal_error && (
                                                    <p className="text-[10px] font-mono opacity-40 mt-1 truncate">
                                                        Error: {aiData.internal_error}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        
                                        {hasFiltersApplied && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setAiData(null)}
                                                className="ml-auto text-xs font-black uppercase tracking-widest hover:bg-white/10 text-white"
                                            >
                                                Clear AI Filters
                                            </Button>
                                        )}
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
                                            className="h-14 pl-12 pr-6 bg-white border-2 border-slate-100 focus:border-blue-600 focus:ring-0 rounded-2xl font-bold transition-all"
                                        />
                                    </div>
                                    {searchQuery && (
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setSearchQuery('')}
                                            className="h-14 px-6 rounded-2xl font-bold text-slate-500"
                                        >
                                            Show All
                                        </Button>
                                    )}
                                </div>

                                <ScrollArea className="flex-1 -mx-2 px-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                                        {isLoadingPackages ? (
                                            Array(6).fill(0).map((_, i) => (
                                                <div key={i} className="h-[280px] rounded-[24px] bg-slate-100 animate-pulse" />
                                            ))
                                        ) : filteredPackages.map(pkg => (
                                            <Card 
                                                key={pkg.id} 
                                                className={`group overflow-hidden rounded-[24px] border-2 transition-all cursor-pointer ${
                                                    selectedPackages.some(p => p.packageId === pkg.id) 
                                                    ? 'border-blue-600 bg-blue-50/50' 
                                                    : 'border-slate-100 hover:border-blue-200'
                                                }`}
                                                onClick={() => togglePackage(pkg)}
                                            >
                                                <div className="relative h-44">
                                                    <img 
                                                        src={resolveImageUrl(pkg.feature_image_url)} 
                                                        alt={pkg.title} 
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                    />
                                                    <div className="absolute top-4 right-4 h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-md">
                                                        {selectedPackages.some(p => p.packageId === pkg.id) ? (
                                                            <Check className="h-5 w-5 text-blue-600" />
                                                        ) : (
                                                            <Plus className="h-5 w-5 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="absolute bottom-4 left-4">
                                                        <Badge className="bg-black/60 backdrop-blur-md border-none px-3 py-1 font-bold">
                                                            {pkg.duration_days}D/{pkg.duration_nights}N
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <CardContent className="p-5">
                                                    <h4 className="font-bold text-lg leading-tight mb-1">{pkg.title}</h4>
                                                    <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5 mb-3">
                                                        <Globe className="h-3.5 w-3.5" /> {pkg.destination}
                                                    </p>
                                                    <div className="flex justify-between items-end">
                                                        {pkg.booking_type === 'INSTANT' ? (
                                                            <div>
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Price Per Person</span>
                                                                <p className="text-xl font-bold text-blue-600">INR {pkg.price_per_person.toLocaleString()}</p>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-amber-600 border-amber-200 bg-amber-50 rounded-full py-0.5 px-3">
                                                                    Price on Enquiry
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
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
                                                                    type="number" 
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

                    {/* Footer Actions */}
                    <DrawerFooter className="px-8 pt-4 pb-8 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                {step !== 'SELECTION' && step !== 'ANALYSIS' && (
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => {
                                            if (step === 'CUSTOMIZATION') setStep('SELECTION')
                                            if (step === 'PREVIEW') setStep('CUSTOMIZATION')
                                            if (step === 'SENDING') setStep('PREVIEW')
                                        }}
                                        className="h-12 px-6 rounded-xl font-bold text-slate-500"
                                    >
                                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                {step === 'SELECTION' && (
                                    <Button 
                                        disabled={selectedPackages.length === 0}
                                        onClick={() => setStep('CUSTOMIZATION')}
                                        className="h-14 px-10 rounded-full bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30"
                                    >
                                        Next: Customize Prices ({selectedPackages.length}) <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                )}
                                {step === 'CUSTOMIZATION' && (
                                    <Button 
                                        disabled={isGenerating}
                                        onClick={handleGenerateQuote}
                                        className="h-14 px-10 rounded-full bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating PDF...</>
                                        ) : (
                                            <><Sparkles className="h-4 w-4 mr-2" /> Generate Branded PDF</>
                                        )}
                                    </Button>
                                )}
                                {step === 'PREVIEW' && (
                                    <Button 
                                        onClick={() => setStep('SENDING')}
                                        className="h-14 px-10 rounded-full bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30"
                                    >
                                        Proceed to Email <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                )}
                                {step === 'SENDING' && (
                                    <Button 
                                        disabled={isSending}
                                        onClick={handleSendQuote}
                                        className="h-14 px-12 rounded-full bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30"
                                    >
                                        {isSending ? (
                                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending Email...</>
                                        ) : (
                                            <><Mail className="h-4 w-4 mr-2" /> Send Quote to Customer</>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
