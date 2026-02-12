'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, MapPin, Clock, IndianRupee, ArrowRight, Loader2, Bot, User, Calendar as CalendarIcon, Minus, Plus } from 'lucide-react'
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

            const response = await fetch('http://localhost:8000/api/v1/ai-assistant/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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

            const response = await fetch('http://localhost:8000/api/v1/trip-planner/create-session', {
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
        <div className="flex flex-col h-[500px] max-w-lg mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-3 text-white flex items-center gap-3 shadow-md z-10">
                <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                </div>
                <div>
                    <h3 className="font-bold text-base">AI Travel Assistant</h3>
                    <p className="text-[10px] text-blue-100 opactiy-90">Discover your perfect trip</p>
                </div>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-3 bg-slate-50">
                <div className="flex flex-col gap-3">
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <Avatar className="w-7 h-7 border border-indigo-100 shadow-sm">
                                    <AvatarImage src="/bot-avatar.png" />
                                    <AvatarFallback className="bg-indigo-100 text-indigo-600"><Bot size={14} /></AvatarFallback>
                                </Avatar>
                            )}

                            <div className={`flex flex-col gap-2 ${msg.tool_result ? 'w-full' : 'max-w-[85%]'}`}>
                                <div
                                    className={`p-3 rounded-2xl shadow-sm text-xs leading-relaxed ${msg.tool_result ? 'max-w-[95%]' : ''} ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none ml-auto'
                                        : 'bg-white text-slate-800 border border-gray-100 rounded-tl-none'
                                        }`}
                                >
                                    {msg.role === 'user' ? (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    ) : (
                                        <ReactMarkdown
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-1" {...props} />,
                                                li: ({ node, ...props }) => <li className="mb-0.5" {...props} />
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    )}
                                </div>

                                {/* Render Package Cards if tool_result exists */}
                                {(() => {
                                    if (msg.tool_used) console.log("Rendering msg with tool:", msg.tool_used, msg.tool_result);
                                    return null;
                                })()}
                                {/* Render Package Cards (Search Results) */}
                                {(msg.tool_used === 'search_packages' || msg.tool_used === 'search_package') && msg.tool_result && Array.isArray(msg.tool_result) && (
                                    <div className="flex overflow-x-auto gap-3 py-2 px-1 snap-x scrollbar-hide -ml-9 sm:ml-0 w-[calc(100%+2.5rem)] sm:w-full pr-4">
                                        {msg.tool_result.map((pkg: PackageSearchResult) => (
                                            <motion.div
                                                key={pkg.id}
                                                initial={{ scale: 0.95, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="snap-center first:pl-9 sm:first:pl-0"
                                            >
                                                <Card className="w-[220px] sm:w-[240px] flex-shrink-0 cursor-pointer hover:shadow-xl transition-all border-blue-100 overflow-hidden group bg-white">
                                                    <div className="h-24 sm:h-28 bg-gray-200 relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
                                                        <img
                                                            src={`https://source.unsplash.com/800x600/?${pkg.destination},travel`}
                                                            alt={pkg.title}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                        <div className="absolute bottom-2 left-3 right-3 z-20">
                                                            <h4 className="font-bold text-white text-xs line-clamp-1 leading-tight mb-0.5">{pkg.title}</h4>
                                                            <p className="text-white/90 text-[9px] flex items-center gap-1">
                                                                <MapPin className="w-2.5 h-2.5" /> {pkg.destination}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <CardContent className="p-2.5">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <div className="flex items-center gap-1 text-slate-600 text-[9px] sm:text-[10px]">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {pkg.duration}
                                                            </div>
                                                            <div className="flex items-center gap-0.5 font-bold text-indigo-600 text-xs">
                                                                <IndianRupee className="w-3 h-3" />
                                                                {pkg.price.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        {Array.isArray(pkg.highlights) && pkg.highlights.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mb-2 h-8 overflow-hidden">
                                                                {pkg.highlights.slice(0, 2).map((h, i) => (
                                                                    <Badge key={i} variant="secondary" className="text-[8px] sm:text-[9px] px-1 py-0 h-3.5 sm:h-4 bg-blue-50 text-blue-700 border-blue-100">
                                                                        {h}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            className="w-full bg-blue-600 hover:bg-blue-700 text-[10px] h-6 sm:h-7 shadow-sm"
                                                            onClick={() => handleSelectPackage(pkg)}
                                                        >
                                                            View Details <ArrowRight className="w-2.5 h-2.5 ml-1" />
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Render Single Package Detail (Booking Ready) */}
                                {msg.tool_used === 'get_package_details' && msg.tool_result && !msg.tool_result.error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-2 bg-white border border-indigo-100 rounded-lg p-3 shadow-sm w-full max-w-[320px] mr-auto"
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
                                                <img
                                                    src={`https://source.unsplash.com/800x600/?${msg.tool_result.destination},travel`}
                                                    alt={msg.tool_result.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 text-xs line-clamp-1">{msg.tool_result.title}</h4>
                                                <p className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5">
                                                    <MapPin className="w-2.5 h-2.5" /> {msg.tool_result.destination}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge variant="outline" className="bg-slate-50 text-[9px] px-1 h-4">
                                                        {msg.tool_result.duration_days} Days
                                                    </Badge>
                                                    <span className="font-bold text-indigo-600 text-[10px]">
                                                        ₹{msg.tool_result.price.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 shadow-sm"
                                            onClick={() => handleSelectPackage(msg.tool_result)}
                                        >
                                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                            Start Planning Trip
                                        </Button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                            <Avatar className="w-8 h-8 border border-indigo-100">
                                <AvatarFallback className="bg-indigo-50"><Bot size={16} className="text-indigo-400" /></AvatarFallback>
                            </Avatar>
                            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                <span className="text-xs text-slate-500 font-medium">Thinking...</span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Search for trips (e.g., 'Honeymoon in Kerala under 50k')..."
                        className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Trip Config Modal */}
            <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Customize Your Trip</DialogTitle>
                        <DialogDescription>
                            Confirm details for <strong>{selectedPackage?.title}</strong> to start planning.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                        disabled={(date) => date < new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-3">
                            <Label>Travelers</Label>
                            <div className="flex items-center justify-between border rounded-lg p-3">
                                <span className="text-sm">Adults</span>
                                <div className="flex items-center gap-3">
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateGuest('adults', -1)} disabled={guests.adults <= 1}>
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-4 text-center text-sm">{guests.adults}</span>
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateGuest('adults', 1)}>
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between border rounded-lg p-3">
                                <span className="text-sm">Children</span>
                                <div className="flex items-center gap-3">
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateGuest('children', -1)} disabled={guests.children <= 0}>
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-4 text-center text-sm">{guests.children}</span>
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateGuest('children', 1)}>
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between border rounded-lg p-3">
                                <span className="text-sm">Infants</span>
                                <div className="flex items-center gap-3">
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateGuest('infants', -1)} disabled={guests.infants <= 0}>
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-4 text-center text-sm">{guests.infants}</span>
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateGuest('infants', 1)}>
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleCreateSession}
                            disabled={!date || isCreatingSession}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            {isCreatingSession ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Itinerary...
                                </>
                            ) : (
                                "Start Planning"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
