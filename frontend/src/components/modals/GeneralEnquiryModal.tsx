'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar as CalendarIcon, Users, MessageSquare, Mail, Phone, User, Send, X, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

interface GeneralEnquiryModalProps {
    isOpen: boolean
    onClose: () => void
    agentId?: string | null
}

export default function GeneralEnquiryModal({ isOpen, onClose, agentId }: GeneralEnquiryModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
        travelDate: undefined as Date | undefined,
        travelers: 1
    })
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.message) {
            toast.error('Please enter your message')
            return
        }

        if (!formData.name || !formData.email || !formData.phone) {
            toast.error('Please fill in all contact details')
            return
        }

        setIsSubmitting(true)
        try {
            const payload = {
                agent_id: agentId,
                customer_name: formData.name,
                email: formData.email,
                phone: formData.phone,
                message: formData.message,
                travel_date: formData.travelDate ? format(formData.travelDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                travellers: formData.travelers
            }

            await api.post('/enquiries', payload)
            
            toast.success('Enquiry Sent!', {
                description: "Our travel experts will get back to you shortly.",
            })
            onClose()
            // Reset form
            setFormData({
                name: '',
                email: '',
                phone: '',
                message: '',
                travelDate: undefined,
                travelers: 1
            })
        } catch (error: any) {
            console.error('Failed to send enquiry:', error)
            toast.error('Failed to send enquiry', {
                description: error.response?.data?.detail || 'Please try again later.'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent hideClose={true} className="sm:max-w-[480px] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl rounded-3xl">
                <div className="relative">
                    {/* Header with Gradient Background */}
                    <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] p-6 text-white relative">
                        <div className="absolute top-4 right-4 focus:outline-none">
                            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <DialogTitle className="text-xl font-black tracking-tight">Plan Your Dream Journey</DialogTitle>
                        </div>
                        <DialogDescription className="text-white/80 font-medium text-sm">
                            Tell us what you're looking for, and we'll craft the perfect itinerary for you.
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Your Name</Label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[var(--primary)] transition-colors" />
                                    <Input
                                        id="name"
                                        placeholder="Full Name"
                                        className="pl-10 h-10 bg-slate-50 border-slate-200 focus:border-[var(--primary)] focus:ring-[var(--primary-glow)] rounded-xl transition-all text-slate-900"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Phone Number</Label>
                                <PhoneInput
                                    country={'in'}
                                    value={formData.phone}
                                    onChange={(val) => setFormData({ ...formData, phone: val })}
                                    placeholder="+91 ..."
                                    inputProps={{
                                        id: 'phone',
                                        name: 'phone',
                                        required: true,
                                    }}
                                    containerClass="!w-full !border-none"
                                    inputClass="!w-full !h-10 !bg-slate-50 !border-slate-200 focus:!border-[var(--primary)] focus:!ring-[var(--primary-glow)] !rounded-xl !transition-all !pl-12 !font-sans !text-sm"
                                    buttonClass="!bg-transparent !border-none !rounded-l-xl hover:!bg-slate-100 !transition-colors"
                                    dropdownClass="!rounded-xl !shadow-2xl !border-none !bg-white/95 !backdrop-blur-xl !py-2"
                                    searchClass="!rounded-lg !border-slate-200 !mx-2 !mb-2"
                                    enableSearch={true}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Email Address</Label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[var(--primary)] transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="email@example.com"
                                    className="pl-10 h-10 bg-slate-50 border-slate-200 focus:border-[var(--primary)] focus:ring-[var(--primary-glow)] rounded-xl transition-all text-slate-900"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="message" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Message (Mandatory)</Label>
                            <div className="relative group">
                                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-[var(--primary)] transition-colors" />
                                <Textarea
                                    id="message"
                                    placeholder="I want to plan a trip to Japan, please share available packages."
                                    className="pl-10 min-h-[80px] bg-slate-50 border-slate-200 focus:border-[var(--primary)] focus:ring-[var(--primary-glow)] rounded-xl transition-all resize-none text-slate-900"
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Travel Date</Label>
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-10 justify-start text-left font-normal bg-slate-50 border-slate-200 hover:bg-slate-100 rounded-xl transition-all",
                                                !formData.travelDate ? "text-slate-400" : "text-slate-900 font-semibold"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-[var(--primary)]" />
                                            {formData.travelDate ? format(formData.travelDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-[120]" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.travelDate}
                                            onSelect={date => {
                                                setFormData({ ...formData, travelDate: date })
                                                setIsCalendarOpen(false)
                                            }}
                                            initialFocus
                                            disabled={(date) => {
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                return date < today;
                                            }}
                                            classNames={{
                                                day: "h-9 w-9 p-0 font-normal text-slate-900 hover:bg-slate-100 rounded-xl transition-all",
                                                day_today: "bg-slate-100 text-[var(--primary)] font-bold rounded-xl",
                                                day_selected: "bg-[var(--primary)] text-white hover:bg-[var(--primary)] hover:text-white focus:bg-[var(--primary)] focus:text-white rounded-xl",
                                                day_outside: "text-slate-300 opacity-50",
                                                day_disabled: "text-slate-200 opacity-50"
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="travelers" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Number of Adults</Label>
                                <div className="relative group">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[var(--primary)] transition-colors" />
                                    <Input
                                        id="travelers"
                                        type="number"
                                        min="1"
                                        className="pl-10 h-10 bg-slate-50 border-slate-200 focus:border-[var(--primary)] focus:ring-[var(--primary-glow)] rounded-xl transition-all text-slate-900 font-medium"
                                        value={formData.travelers}
                                        onChange={e => setFormData({ ...formData, travelers: parseInt(e.target.value) || 1 })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 text-base font-black tracking-wide rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-[var(--primary-glow)]"
                            style={{ background: 'linear-gradient(135deg, var(--button-bg), var(--button-bg-light))' }}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Sparkles className="h-4 w-4" />
                                    </motion.div>
                                    Sending...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 text-white">
                                    Submit Enquiry <Send className="h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
