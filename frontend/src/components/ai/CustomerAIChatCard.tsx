'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Send, Sparkles, MapPin, Clock, ArrowRight, Loader2,
    Bot, User, Users, Baby, Calendar as CalendarIcon,
    Minus, Plus, Plane, X, Minimize2, MessageSquare
} from 'lucide-react'
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
import { cn } from "@/lib/utils"
import { API_URL } from "@/lib/api"

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
}

export default function CustomerAIChatCard() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Create a trip in seconds."
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const cardRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const router = useRouter()

    // Click outside listener
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                cardRef.current && !cardRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Trip Config State (Ported from PackageSearchChat)
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
            const scrollContainer = scrollRef.current.closest('[data-radix-scroll-area-viewport]')
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight
            }
        }
    }, [messages])

    const handleSend = async (manualMessage?: string) => {
        const userMessage = manualMessage || input
        if (!userMessage.trim() || isLoading) return

        if (!manualMessage) setInput('')

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
                const friendlyMessage = "Currently I am not available, please try again."
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
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`

            const payload = {
                package_id: selectedPackage.id,
                destination: selectedPackage.destination,
                duration_days: parseInt(selectedPackage.duration.split(' ')[0]) || 5,
                start_date: format(date, 'yyyy-MM-dd'),
                travelers: guests,
                preferences: { source: 'ai_chat' }
            }

            const response = await fetch(`${API_URL}/api/v1/trip-planner/create-session`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (response.ok && data.session_id) {
                router.push(`/plan-trip/build?session=${data.session_id}`)
            } else {
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

    const suggestions = ["Japan 7 Days", "Maldives"]

    return (
        <div className="font-sans">
            {/* The Chatbot GIF Button - Fixed permanently */}
            <div className="fixed z-[1050]" style={{ bottom: '24px', right: '24px' }}>
                <button
                    ref={buttonRef}
                    onClick={() => setIsOpen(prev => !prev)}
                    aria-label={isOpen ? "Close AI Chat" : "Open AI Chat"}
                    className="cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none group"
                >
                    <img
                        src="/images/Chatbot-1.gif"
                        alt="Chat with us"
                        width={120}
                        height={120}
                        style={{
                            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
                            mixBlendMode: 'multiply'
                        }}
                        className="group-hover:-translate-y-1 transition-transform duration-200 ease-in-out"
                    />
                </button>
            </div>

            {/* Chat Card Panel */}
            <div className="fixed z-[1000] pointer-events-none flex flex-col items-end" style={{ bottom: '90px', right: '24px' }}>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            key="card"
                            ref={cardRef}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-[340px] h-[520px] max-h-[80vh] flex flex-col rounded-[20px] overflow-hidden relative shadow-2xl pointer-events-auto"
                            style={{
                                background: 'rgba(255, 255, 255, 0.12)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                boxShadow: '0 10px 40px rgba(255, 122, 69, 0.25)'
                            }}
                        >
                            {/* Radial Glow Background */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--primary)] opacity-10 blur-[80px] pointer-events-none" />
                            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#FFB38A] opacity-10 blur-[80px] pointer-events-none" />

                            {/* Header */}
                            <div className="h-12 flex items-center justify-between px-4 shrink-0 border-b border-white/20 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#FFB38A] flex items-center justify-center shadow-sm">
                                        <Sparkles className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="font-bold text-sm text-slate-900 drop-shadow-sm">AI Assistant</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setIsOpen(false)
                                    }}
                                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors group"
                                    aria-label="Close Chat"
                                >
                                    <X className="w-4 h-4 text-slate-700 group-hover:text-slate-900 transition-colors" />
                                </button>
                            </div>

                            {/* Chat Messages Area */}
                            <ScrollArea className="flex-1 p-4 relative z-10">
                                <div className="flex flex-col gap-4">
                                    {messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={cn(
                                                    "max-w-[85%] p-3 rounded-[16px] text-sm shadow-sm",
                                                    msg.role === 'user'
                                                        ? "bg-gradient-to-br from-[var(--primary)] to-[#FFB38A] text-white rounded-tr-none shadow-[var(--primary)]/20"
                                                        : "bg-white/40 backdrop-blur-md border border-white/30 text-slate-800 rounded-tl-none"
                                                )}
                                            >
                                                <div className="prose prose-sm max-w-none">
                                                    <ReactMarkdown>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>

                                                {/* Specialized Tool Rendering (Ported from PackageSearchChat) */}
                                                {(msg.tool_used === 'search_packages' || msg.tool_used === 'search_package') && msg.tool_result && Array.isArray(msg.tool_result) && (
                                                    <div className="mt-3 grid grid-cols-1 gap-3">
                                                        {msg.tool_result.map((pkg: PackageSearchResult) => (
                                                            <Card key={pkg.id} className="overflow-hidden border-0 bg-white/60 backdrop-blur-sm shadow-sm group">
                                                                <div className="h-24 relative">
                                                                    <img
                                                                        src={`https://source.unsplash.com/400x300/?${pkg.destination},travel`}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/20" />
                                                                    <div className="absolute bottom-2 left-2 text-white">
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider">{pkg.destination}</p>
                                                                        <p className="font-bold text-xs truncate w-[200px]">{pkg.title}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="p-3 flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-[10px] text-slate-500">Starting from</p>
                                                                        <p className="font-bold text-sm text-[var(--primary)]">₹{pkg.price.toLocaleString()}</p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleSelectPackage(pkg)}
                                                                        className="bg-[var(--primary)] hover:bg-[var(--primary)] text-white h-8 px-4 rounded-lg text-xs font-bold transition-all"
                                                                    >
                                                                        View Trip
                                                                    </Button>
                                                                </div>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white/40 backdrop-blur-md border border-white/30 p-3 rounded-[16px] rounded-tl-none flex gap-1 items-center">
                                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full" />
                                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full" />
                                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full" />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>

                            {/* Suggestions and Input Area */}
                            <div className="p-4 pt-0 shrink-0 relative z-20">
                                {/* Suggested Chips */}
                                {!isLoading && messages.length === 1 && (
                                    <div className="flex gap-2 mb-3">
                                        {suggestions.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => handleSend(s)}
                                                className="px-3 py-1.5 rounded-full border border-[var(--primary)]/30 text-[var(--primary)] text-[11px] font-bold hover:bg-[var(--primary)] hover:text-white transition-all backdrop-blur-sm"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Pill Input */}
                                <div className="relative group">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Tell me your destination..."
                                        className="w-full bg-white/40 backdrop-blur-md border-white/30 focus:border-[var(--primary)]/50 focus:ring-4 focus:ring-[var(--primary)]/10 pr-12 rounded-full h-11 text-sm shadow-inner transition-all placeholder:text-slate-400"
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={isLoading || !input.trim()}
                                        className="absolute right-1.5 top-1.5 h-8 w-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#FFB38A] text-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 shadow-sm"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Trip Config Modal (Ported logic) */}
            <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
                <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-[24px]">
                    <div className="bg-gradient-to-br from-[var(--primary)] to-[#FFB38A] p-6 text-white text-center">
                        <DialogTitle className="text-xl font-bold">Trip Details</DialogTitle>
                        <DialogDescription className="text-white/80 text-xs mt-1">
                            Configure your stay at {selectedPackage?.title}
                        </DialogDescription>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Travel Date</Label>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start h-12 rounded-xl border-slate-100 hover:border-[var(--primary)]/30 group transition-all">
                                        <CalendarIcon className="w-4 h-4 mr-2 text-[var(--primary)]" />
                                        {date ? format(date, "PPP") : <span>Select date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-0 shadow-xl" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(d) => { setDate(d); setIsCalendarOpen(false); }}
                                        disabled={(d) => d < new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Travelers</Label>
                            {(Object.keys(guests) as Array<keyof typeof guests>).map((type) => (
                                <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <span className="text-sm font-bold text-slate-700 capitalize">{type}</span>
                                    <div className="flex items-center gap-3">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full border border-slate-200" onClick={() => updateGuest(type, -1)} disabled={type === 'adults' ? guests.adults <= 1 : guests[type] <= 0}><Minus className="h-3 w-3" /></Button>
                                        <span className="w-4 text-center text-sm font-bold">{guests[type]}</span>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full border border-slate-200" onClick={() => updateGuest(type, 1)}><Plus className="h-3 w-3" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={handleCreateSession}
                            disabled={!date || isCreatingSession}
                            className="w-full h-12 bg-[var(--primary)] hover:bg-[var(--primary)] text-white rounded-xl font-bold shadow-lg shadow-[var(--primary)]/20"
                        >
                            {isCreatingSession ? <Loader2 className="animate-spin" /> : "Start Planning Journey"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
