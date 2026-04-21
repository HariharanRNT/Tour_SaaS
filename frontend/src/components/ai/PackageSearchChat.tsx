'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, MapPin, Clock, IndianRupee, ArrowRight, Loader2, Bot, User, Users, Baby, Calendar as CalendarIcon, Minus, Plus, Plane } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from "date-fns"
import { cn, formatCurrency, formatDuration } from "@/lib/utils"
import { API_URL } from '@/lib/api'

interface Message {
    role: 'user' | 'assistant'
    content: string
    tool_used?: string
    tool_result?: any
}

interface PackageSearchResult {
    id: string
    title: string
    destination: string
    price: number
    duration: string
    highlights: string[]
    booking_type?: string
    price_label?: string
}

export default function PackageSearchChat() {
    // ... existing state ...
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hi! I'm your AI Travel Assistant. I can help you find the perfect holiday package. Where would you like to go?"
        }
    ])
    // Debug logging
    console.log("Current messages state:", messages)

    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Trip Config State
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [selectedPackage, setSelectedPackage] = useState<PackageSearchResult | null>(null)
    const [date, setDate] = useState<Date>()
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [guests, setGuests] = useState({
        adults: 2,
        children: 0,
        infants: 0
    })
    const [isCreatingSession, setIsCreatingSession] = useState(false)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const handleSend = async () => {
        // ... existing handleSend logic ...
        if (!input.trim() || isLoading) return

        const userMessage = input
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsLoading(true)

        try {
            const conversationId = localStorage.getItem('ai_package_search_id')
            const token = localStorage.getItem('token')

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await fetch(`${API_URL}/api/v1/ai-assistant/chat`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    message: userMessage,
                    conversation_id: conversationId,
                    mode: 'package_search'
                })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                if (data.conversation_id) {
                    localStorage.setItem('ai_package_search_id', data.conversation_id)
                }

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.message,
                    tool_used: data.tool_used,
                    tool_result: data.tool_result
                }])
            } else {
                console.error("AI Error Response:", data)
                const isQuota = data.quota_exceeded || (data.status === 429) || (data.error && (data.error.includes('429') || data.error.includes('RESOURCE_EXHAUSTED')))

                const friendlyMessage = isQuota
                    ? "Currently I am not available, please try again."
                    : (data.message || "I apologize, but I encountered an error. Please try again.")

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: friendlyMessage
                }])
            }

        } catch (error) {
            console.error("Failed to send message:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSelectPackage = (pkg: PackageSearchResult) => {
        setSelectedPackage(pkg)
        setShowConfigModal(true)
    }

    const handleCreateSession = async () => {
        if (!selectedPackage || !date) return

        setIsCreatingSession(true)
        try {
            const token = localStorage.getItem('token')
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const payload = {
                package_id: selectedPackage.id,
                destination: selectedPackage.destination,
                duration_days: parseInt(selectedPackage.duration.split(' ')[0]) || 5, // Extract days from "5 Days / 4 Nights"
                start_date: format(date, 'yyyy-MM-dd'),
                travelers: guests,
                preferences: {
                    source: 'ai_chat'
                }
            }

            console.log("Creating session with payload:", payload)

            const response = await fetch(`${API_URL}/api/v1/trip-planner/create-session`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (response.ok && data.session_id) {
                console.log("Session created:", data.session_id)
                router.push(`/plan-trip/build?session=${data.session_id}`)
            } else {
                console.error("Failed to create session:", data)
                alert("Failed to create trip session. Please try again.")
            }
        } catch (error) {
            console.error("Error creating session:", error)
            alert("An error occurred. Please try again.")
        } finally {
            setIsCreatingSession(false)
        }
    }

    const updateGuest = (type: keyof typeof guests, delta: number) => {
        setGuests(prev => ({
            ...prev,
            [type]: Math.max(0, prev[type] + delta)
        }))
    }



    return (
        <div className="flex flex-col h-[600px] max-w-[440px] mx-auto bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/40 font-sans relative">

            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-30 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-200/40 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-200/40 via-transparent to-transparent" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            {/* Header - Compact */}
            <div className="relative bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-3 text-white flex items-center gap-3 shadow-lg z-10 shrink-0 h-[56px]">
                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md shadow-inner border border-white/10">
                    <Sparkles className="w-4 h-4 text-yellow-300 drop-shadow-md" />
                </div>
                <div>
                    <h3 className="font-bold text-base leading-tight tracking-tight">AI Travel Assistant</h3>
                    <p className="text-[10px] text-indigo-100 font-medium tracking-wide opacity-90">Discover your perfect trip</p>
                </div>
                {/* Decorative sheen */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white opacity-10 blur-2xl rounded-full" />
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 bg-transparent relative z-10 p-3">
                <div className="flex flex-col gap-4 pb-4">
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start max-w-[95%]'}`}
                        >
                            {msg.role === 'assistant' && (
                                <Avatar className="w-7 h-7 flex-shrink-0 mt-1 shadow-sm ring-2 ring-white">
                                    <AvatarImage src="/bot-avatar.png" />
                                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white"><Bot size={14} /></AvatarFallback>
                                </Avatar>
                            )}

                            <div className={`flex flex-col gap-2 ${msg.tool_result ? 'w-full' : 'max-w-[85%]'}`}>
                                <div
                                    className={`p-3 rounded-xl shadow-sm text-[13px] leading-relaxed tracking-wide backdrop-blur-sm break-words hyphens-auto ${msg.tool_result ? 'max-w-full bg-transparent shadow-none p-0' : ''} ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-none ml-auto shadow-indigo-200 text-left'
                                        : msg.tool_result ? '' : 'bg-white text-slate-800 border-2 border-lime-400/50 rounded-tl-none shadow-sm text-left relative'
                                        }`}
                                >
                                    {msg.role === 'assistant' && !msg.tool_result && (
                                        <div className="absolute -top-5 left-0 flex items-center gap-2">
                                            <img src="/trippy-logo.png" alt="Trippie" className="w-4 h-4 object-contain hidden" /> {/* Placeholder if logo exists */}
                                            <span className="text-[9px] font-bold text-slate-500 tracking-wider">TRIPPIE</span>
                                        </div>
                                    )}
                                    {msg.role === 'user' ? (
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                    ) : (
                                        !msg.tool_result && (
                                            idx === 0 ? (
                                                <p className="mb-1 last:mb-0 break-words"><Typewriter text={msg.content} /></p>
                                            ) : (
                                                <div className="prose prose-sm max-w-none text-slate-800 break-words">
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ node, ...props }) => <p className="mb-1 last:mb-0 leading-relaxed" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-1 space-y-0.5" {...props} />,
                                                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                            strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )
                                        )
                                    )}
                                </div>

                                {/* Render Package Cards (Search Results) */}
                                {(msg.tool_used === 'search_packages' || msg.tool_used === 'search_package') && msg.tool_result && Array.isArray(msg.tool_result) && (
                                    <div className="flex flex-col gap-2 mt-2">
                                        {msg.content && (
                                            <div className="p-3 rounded-lg shadow-sm text-[13px] leading-relaxed bg-white text-slate-800 border-2 border-lime-400/50 rounded-tl-none backdrop-blur-sm text-left break-words max-w-[90%] hyphens-auto prose prose-sm max-w-none relative mt-5">
                                                <div className="absolute -top-5 left-0 flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-slate-500 tracking-wider">TTRIP PLANNER</span>
                                                </div>
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-1 last:mb-0 leading-relaxed" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-1 space-y-0.5" {...props} />,
                                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2 pb-2 pt-2 w-full">
                                            {msg.tool_result.map((pkg: PackageSearchResult) => (
                                                <motion.div
                                                    key={pkg.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                                    className="h-full"
                                                >
                                                    <Card className="h-full w-full flex flex-col border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white/50 backdrop-blur-sm group">
                                                        {/* Image Section - Reduced Height */}
                                                        <div className="h-[110px] w-full relative overflow-hidden bg-slate-100 flex-shrink-0">
                                                            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors z-10" />
                                                            <img
                                                                src={`https://source.unsplash.com/800x600/?${pkg.destination},travel`}
                                                                alt={pkg.title}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                                            />
                                                        </div>

                                                        {/* Content Section - Compact Padding */}
                                                        <CardContent className="flex flex-col flex-1 p-2.5 gap-2">

                                                            {/* Title - Smaller Font */}
                                                            <h4 className="font-bold text-slate-800 text-[13px] leading-tight line-clamp-2 h-[34px]" title={pkg.title}>
                                                                {pkg.title}
                                                            </h4>

                                                            {/* Details Stack - Compact Text */}
                                                            <div className="flex flex-col gap-1 text-[11px] text-slate-600 flex-1">
                                                                <div className="flex items-start gap-1.5">
                                                                    <MapPin className="w-3 h-3 text-violet-500 shrink-0 mt-0.5" />
                                                                    <span className="line-clamp-1">{pkg.destination}</span>
                                                                </div>
                                                                <div className="flex items-start gap-1.5">
                                                                    <Clock className="w-3 h-3 text-violet-500 shrink-0 mt-0.5" />
                                                                    <span className="line-clamp-1">{pkg.duration}</span>
                                                                </div>
                                                            </div>

                                                            {/* Price & Action - Compact */}
                                                            <div className="pt-2 mt-auto border-t border-slate-100 flex flex-col gap-2">
                                                                <div className="flex items-baseline justify-between">
                                                                    <span className="text-[10px] text-black font-medium">
                                                                        {pkg.booking_type === 'ENQUIRY' ? 'Pricing' : 'Starting from'}
                                                                    </span>
                                                                    <span className="font-bold text-sm text-violet-600">
                                                                        {pkg.booking_type === 'ENQUIRY' 
                                                                            ? (pkg.price_label || 'Price on request') 
                                                                            : `₹${pkg.price.toLocaleString()}`}
                                                                    </span>
                                                                </div>

                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleSelectPackage(pkg)}
                                                                    className="w-full bg-slate-900 hover:bg-violet-600 text-white shadow-sm rounded-md h-7 text-[10px] font-semibold transition-colors"
                                                                >
                                                                    View
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Render Single Package Detail */}
                                {msg.tool_used === 'get_package_details' && msg.tool_result && !msg.tool_result.error && (
                                    <div className="mt-4 text-left w-full">
                                        {!msg.tool_result && msg.content && (
                                            <div className="p-4 rounded-xl shadow-sm leading-relaxed bg-white text-slate-800 border-2 border-lime-400/50 rounded-tl-none backdrop-blur-sm text-left break-words hyphens-auto prose prose-sm max-w-none relative mt-6">
                                                <div className="absolute -top-6 left-0 flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-500 tracking-wider">TRIPPIE</span>
                                                </div>
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                        <Card className="overflow-hidden border-0 shadow-xl shadow-indigo-500/10 rounded-3xl bg-white text-left ring-1 ring-slate-100 max-w-[340px]">
                                            <div className="h-48 relative group">
                                                <img
                                                    src={`https://source.unsplash.com/800x600/?${msg.tool_result.destination},travel`}
                                                    alt={msg.tool_result.title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                <div className="absolute bottom-0 left-0 right-0 p-5 text-white transform transition-transform duration-300">
                                                    <h3 className="font-bold text-xl leading-tight mb-2">{msg.tool_result.title}</h3>
                                                    <div className="flex items-center gap-4 text-xs opacity-90 font-medium">
                                                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {msg.tool_result.destination}</span>
                                                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {msg.tool_result.duration}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <CardContent className="p-5 space-y-5">
                                                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                    <div className="text-center flex-1">
                                                        <span className="block text-[10px] text-black uppercase font-bold tracking-wider mb-1">Duration</span>
                                                        <span className="text-sm font-bold text-slate-700">{formatDuration(msg.tool_result.duration_days)}</span>
                                                    </div>
                                                    <div className="w-px h-8 bg-slate-200" />
                                                    <div className="text-center flex-1">
                                                        <span className="block text-[10px] text-black uppercase font-bold tracking-wider mb-1">Price</span>
                                                        <span className="text-lg font-bold text-violet-600">
                                                            {msg.tool_result.booking_type === 'ENQUIRY' 
                                                                ? (msg.tool_result.price_label || 'Price on request') 
                                                                : `₹${msg.tool_result.price.toLocaleString()}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <Button
                                                    size="lg"
                                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5 transition-all duration-300 font-bold h-12 text-sm"
                                                    onClick={() => handleSelectPackage(msg.tool_result)}
                                                >
                                                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                                                    Book This Trip
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {isLoading && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 pl-1">
                            <Avatar className="w-8 h-8 flex-shrink-0 mt-1 ring-2 ring-indigo-50">
                                <AvatarImage src="/bot-avatar.png" />
                                <AvatarFallback className="bg-white border border-violet-100 text-violet-500"><Bot size={16} /></AvatarFallback>
                            </Avatar>
                            <div className="bg-white p-4 rounded-xl rounded-tl-none border border-slate-100 shadow-sm flex flex-col gap-2 min-w-[120px]">
                                <div className="flex gap-1 mb-1">
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                </div>
                                <div className="space-y-2 w-32">
                                    <div className="h-2 bg-slate-100 rounded-full w-3/4 animate-pulse" />
                                    <div className="h-2 bg-slate-100 rounded-full w-1/2 animate-pulse" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 relative z-20">
                <div className="flex gap-2 relative">
                    <div className="relative flex-1 group">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type your dream trip..."
                            className="bg-white border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 pl-5 py-6 rounded-2xl shadow-sm transition-all duration-300 placeholder:text-slate-400"
                            disabled={isLoading}
                        />
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5 pointer-events-none" />
                    </div>
                    <Button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        size="icon"
                        className="h-[52px] w-[52px] rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-200 flex-shrink-0 hover:scale-105 hover:rotate-3 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:rotate-0"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plane className="w-5 h-5" />}
                    </Button>
                </div>
            </div>

            {/* Trip Config Modal */}
            <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
                <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl font-sans">
                    {/* Gradient Header */}
                    <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 blur-3xl rounded-full" />
                        <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-md shadow-inner border border-white/10 mb-1">
                                <Sparkles className="w-5 h-5 text-yellow-300 drop-shadow-md" />
                            </div>
                            <DialogTitle className="text-xl font-bold tracking-tight">Itinerary Configuration</DialogTitle>
                            <DialogDescription className="text-indigo-100 text-xs font-medium tracking-wide">
                                Customize trip for <span className="font-bold text-white">{selectedPackage?.title}</span>
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="px-6 py-6 space-y-6">
                        {/* Travel Date Section */}
                        <div className="space-y-3">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                                <CalendarIcon className="w-3.5 h-3.5 text-violet-500" /> Travel Date
                            </Label>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-medium h-12 rounded-xl border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all duration-300",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <div className="bg-violet-100/50 p-1.5 rounded-lg mr-3 text-violet-600">
                                            <CalendarIcon className="h-4 w-4" />
                                        </div>
                                        {date ? <span className="text-slate-700">{format(date, "PPP")}</span> : <span className="text-slate-400">Select trip start date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(newDate) => {
                                            setDate(newDate);
                                            setIsCalendarOpen(false);
                                        }}
                                        initialFocus
                                        className="rounded-xl border shadow-lg"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Guests Section */}
                        <div className="space-y-3">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                                <Users className="w-3.5 h-3.5 text-violet-500" /> Guests
                            </Label>
                            <div className="flex flex-col gap-3">
                                {/* Adults */}
                                <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-violet-200 hover:shadow-sm transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 text-violet-600">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700">Adults</span>
                                            <span className="text-[10px] text-slate-400 font-medium">Age 12+</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-slate-200 hover:border-violet-300 hover:text-violet-600 shadow-sm" onClick={() => updateGuest('adults', -1)} disabled={guests.adults <= 1}><Minus className="h-3 w-3" /></Button>
                                        <span className="w-4 text-center text-sm font-bold text-slate-700">{guests.adults}</span>
                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-slate-200 hover:border-violet-300 hover:text-violet-600 shadow-sm" onClick={() => updateGuest('adults', 1)}><Plus className="h-3 w-3" /></Button>
                                    </div>
                                </div>

                                {/* Children */}
                                <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-violet-200 hover:shadow-sm transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 text-indigo-500">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700">Children</span>
                                            <span className="text-[10px] text-slate-400 font-medium">Age 2-12</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-slate-200 hover:border-violet-300 hover:text-violet-600 shadow-sm" onClick={() => updateGuest('children', -1)} disabled={guests.children <= 0}><Minus className="h-3 w-3" /></Button>
                                        <span className="w-4 text-center text-sm font-bold text-slate-700">{guests.children}</span>
                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-slate-200 hover:border-violet-300 hover:text-violet-600 shadow-sm" onClick={() => updateGuest('children', 1)}><Plus className="h-3 w-3" /></Button>
                                    </div>
                                </div>

                                {/* Infants */}
                                <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-violet-200 hover:shadow-sm transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 text-pink-500">
                                            <Baby className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700">Infants</span>
                                            <span className="text-[10px] text-slate-400 font-medium">Under 2</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-slate-200 hover:border-violet-300 hover:text-violet-600 shadow-sm" onClick={() => updateGuest('infants', -1)} disabled={guests.infants <= 0}><Minus className="h-3 w-3" /></Button>
                                        <span className="w-4 text-center text-sm font-bold text-slate-700">{guests.infants}</span>
                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-slate-200 hover:border-violet-300 hover:text-violet-600 shadow-sm" onClick={() => updateGuest('infants', 1)}><Plus className="h-3 w-3" /></Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <Button
                            onClick={handleCreateSession}
                            disabled={!date || isCreatingSession}
                            className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5 transition-all duration-300 font-bold text-sm mt-2"
                        >
                            {isCreatingSession ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Itinerary...
                                </>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Start Planning <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Typewriter({ text, delay = 30 }: { text: string, delay?: number }) {
    const [displayText, setDisplayText] = useState('')

    useEffect(() => {
        let i = 0
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayText(prev => prev + text.charAt(i))
                i++
            } else {
                clearInterval(timer)
            }
        }, delay)

        return () => clearInterval(timer)
    }, [text, delay])

    return <span>{displayText}</span>
}
