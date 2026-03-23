'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger } from '@/components/ui/accordion'
import { Shield, UserPlus, Eye, EyeOff, CheckCircle2, ChevronRight, ChevronDown, Globe, MapPin, Mail, Phone, Facebook, Twitter, Instagram, Linkedin, LogOut, Check, ArrowRight, Youtube, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Country, State, City } from 'country-state-city'
import { ICountry, IState, ICity } from 'country-state-city'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue } from "@/components/ui/select"

const registrationSchema = z.object({
    agency_name: z.string().min(2, 'Agency name is required'),
    company_legal_name: z.string().min(2, 'Legal entity name is required'),
    domain: z.string().url('Invalid business domain URL (e.g., https://agency.com)'),
    business_address: z.string().min(10, 'Full office address is required'),
    country: z.string().min(1, 'Country is required'),
    state: z.string().min(1, 'State is required'),
    city: z.string().min(1, 'City is required'),
    first_name: z.string().min(2, 'First name is required'),
    last_name: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid work email'),
    phone: z.string().min(8, 'Valid mobile number is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
    captcha: z.string().min(1, 'Solve the puzzle')
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"] })

type RegistrationFormValues = z.infer<typeof registrationSchema>

export default function AgentRegisterPage() {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState(0)
    const [activeStep, setActiveStep] = useState(2) // Defaults to Step 2 (Agency Profile) as per design

    const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<RegistrationFormValues>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            country: 'IN',
            state: '',
            city: '',
            phone: '',
            password: '',
            confirm_password: '',
            captcha: ''
        }
    })

    const formValues = watch()

    // Geographic state
    const [allCountries] = useState<ICountry[]>(Country.getAllCountries())
    const [countryStates, setCountryStates] = useState<IState[]>(State.getStatesOfCountry('IN'))
    const [stateCities, setStateCities] = useState<ICity[]>([])

    // Simple CAPTCHA question
    const [captchaQuest, setCaptchaQuest] = useState({ num1: 0, num2: 0, answer: 0 })

    useEffect(() => {
        const n1 = Math.floor(Math.random() * 10) + 1
        const n2 = Math.floor(Math.random() * 10) + 1
        setCaptchaQuest({ num1: n1, num2: n2, answer: n1 + n2 })
    }, [])

    // Password strength calculator
    const password = watch('password')
    useEffect(() => {
        if (!password) {
            setPasswordStrength(0)
            return
        }
        let strength = 0
        if (password.length >= 8) strength++
        if (password.length >= 12) strength++
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
        if (/\d/.test(password)) strength++
        if (/[^a-zA-Z0-9]/.test(password)) strength++
        setPasswordStrength(strength)
    }, [password])

    const handleRegister = async (data: RegistrationFormValues) => {
        setSubmitting(true)
        try {
            const payload = {
                ...data,
                country: Country.getCountryByCode(data.country)?.name || data.country,
                state: State.getStateByCodeAndCountry(data.state, data.country)?.name || data.state }
            delete (payload as any).captcha

            const response = await fetch('http://localhost:8000/api/v1/auth/register/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || 'Registration failed')
            }

            setSubmitted(true)
            toast.success('Registration request submitted successfully')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#FFF5ED] flex flex-col relative overflow-hidden font-body text-slate-800">
                {/* Admin-style Mesh Gradient Background */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full opacity-40" 
                        style={{
                            backgroundImage: `
                                radial-gradient(at 0% 0%, var(--primary) 0, transparent 60%), 
                                radial-gradient(at 100% 100%, var(--primary-light) 0, transparent 60%),
                                radial-gradient(at 50% 50%, var(--primary-soft) 0, transparent 100%)
                            `
                        }} 
                    />
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/20 rounded-full blur-[120px] animate-blob" />
                    <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-amber-100/30 rounded-full blur-[100px] animate-blob [animation-delay:2s]" />
                    <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-orange-50/40 rounded-full blur-[130px] animate-blob [animation-delay:4s]" />
                </div>

                {/* Navbar */}
                <nav className="glass-navbar sticky top-0 z-50 px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Globe className="h-6 w-6 text-[var(--primary)] group-hover:rotate-12 transition-transform" />
                        <span className="text-xl font-bold text-slate-900 font-display tracking-tight">TourSaaS</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-[10px] sm:flex items-center gap-1.5 font-black uppercase tracking-widest">
                            Official Partner Portal
                        </span>
                        <div className="h-4 w-[1px] bg-slate-200 mx-2" />
                        <button 
                            onClick={() => router.push('/login')} 
                            className="bg-white/60 hover:bg-white px-5 py-2 rounded-full font-bold text-slate-700 transition-all border border-white/80 text-[11px] uppercase tracking-widest shadow-sm hover:shadow-md active:scale-95"
                        >
                            Sign In
                        </button>
                    </div>
                </nav>

                <div className="flex-grow flex items-center justify-center p-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 120 }}
                        className="max-w-md w-full"
                    >
                        <Card className="bg-white/40 backdrop-blur-[24px] border border-white/60 rounded-[32px] overflow-hidden shadow-2xl shadow-orange-500/5">
                            <CardContent className="text-center space-y-8 p-12">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/20"
                                >
                                    <CheckCircle2 className="h-12 w-12 text-white" />
                                </motion.div>
                                <div className="space-y-4">
                                    <h3 className="text-4xl font-[1000] text-slate-900 font-display tracking-tight">Request Sent!</h3>
                                    <p className="text-slate-500 text-lg leading-relaxed font-bold px-4">
                                        Your registration is being reviewed. Check your email for activation details.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => router.push('/login')}
                                    className="w-full h-14 bg-gradient-to-r from-[var(--primary)] to-orange-400 text-white hover:scale-[1.02] active:scale-95 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 transition-all"
                                >
                                    Back to Login
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FFF5ED] flex flex-col relative overflow-hidden font-body text-slate-800">
            {/* Admin-style Mesh Gradient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full opacity-40" 
                    style={{
                        backgroundImage: `
                            radial-gradient(at 0% 0%, var(--primary) 0, transparent 60%), 
                            radial-gradient(at 100% 100%, var(--primary-light) 0, transparent 60%),
                            radial-gradient(at 50% 50%, var(--primary-soft) 0, transparent 100%)
                        `
                    }} 
                />
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/20 rounded-full blur-[120px] animate-blob" />
                <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-amber-100/30 rounded-full blur-[100px] animate-blob [animation-delay:2s]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-orange-50/40 rounded-full blur-[130px] animate-blob [animation-delay:4s]" />
            </div>

            {/* Navbar */}
            <nav className="glass-navbar sticky top-0 z-[100] px-8 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <Globe className="h-6 w-6 text-[var(--primary)] group-hover:rotate-12 transition-transform" />
                    <span className="text-xl font-bold text-slate-900 font-display tracking-tight">TourSaaS</span>
                </Link>
                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[10px] hidden sm:flex items-center gap-1.5 font-black uppercase tracking-widest">
                        Official Partner Portal
                    </span>
                    <div className="h-4 w-[1px] bg-slate-200 mx-2 hidden sm:block" />
                    <button 
                        onClick={() => router.push('/login')} 
                        className="bg-white/60 hover:bg-white px-5 py-2 rounded-full font-bold text-slate-700 transition-all border border-white/80 text-[11px] uppercase tracking-widest shadow-sm hover:shadow-md active:scale-95"
                    >
                        Sign In
                    </button>
                </div>
            </nav>

            <div className="flex-grow pt-16 pb-20 px-6 relative z-10 overflow-y-auto">
                {/* Hero Section */}
                <div className="max-w-4xl mx-auto text-center mb-16 px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 bg-white/40 backdrop-blur-[25px] rounded-full px-5 py-2 border border-white/60 mb-8 shadow-xl shadow-orange-500/5"
                    >
                        <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[var(--primary)]">✦ Enterprise Partner Program</span>
                    </motion.div>

                    <h1 className="text-6xl md:text-7xl font-[1000] text-slate-900 font-playfair tracking-tight mb-8 leading-[1.05]" style={{ fontFamily: 'var(--font-playfair)' }}>
                        Empower Your <span className="text-orange-600/30">Travel</span> Vision
                    </h1>

                    <p className="text-slate-600 text-lg font-bold max-w-xl mx-auto leading-relaxed font-body">
                        Join the next generation of travel agencies using AI to craft perfect journeys. Seamlessly manage fleet, operations, and global inventory.
                    </p>
                </div>

                {/* Step Progress Bar */}
                <div className="max-w-2xl mx-auto mb-20 px-4">
                    <div className="relative flex justify-between items-center">
                        {/* Connecting Lines */}
                        <div className="absolute top-[16px] left-[20px] right-[20px] h-[2px] bg-slate-200 -z-10">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: activeStep >= 2 ? (activeStep === 2 ? '33%' : activeStep === 3 ? '66%' : '100%') : '0%' }}
                                className="h-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary-glow)]"
                            />
                        </div>

                        {[
                            { step: 1, label: 'Account' },
                            { step: 2, label: 'Agency Profile' },
                            { step: 3, label: 'Contact' },
                            { step: 4, label: 'Verification' }
                        ].map((item) => (
                            <div key={item.step} className="flex flex-col items-center gap-3">
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black transition-all duration-500 shadow-xl ${item.step < activeStep
                                        ? 'bg-[var(--primary)] text-white shadow-orange-500/20'
                                        : item.step === activeStep
                                            ? 'bg-white text-[var(--primary)] ring-4 ring-orange-500/10 border border-orange-100 shadow-orange-500/10'
                                            : 'bg-white/40 text-slate-400 border border-white/60'
                                        }`}
                                >
                                    {item.step < activeStep ? <Check size={18} strokeWidth={3} /> : item.step}
                                </motion.div>
                                <span className={`text-[11px] font-[1000] uppercase tracking-[0.15em] ${item.step === activeStep ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="max-w-[800px] mx-auto">
                    <form onSubmit={handleSubmit(handleRegister)} className="space-y-6">
                        <Accordion type="multiple" defaultValue={['agency', 'contact', 'credentials']} className="space-y-8">
                            {/* Agency Details */}
                            <AccordionItem value="agency" className="border-none mb-6">
                                <div className="bg-white/40 backdrop-blur-[24px] border border-white/60 rounded-[32px] overflow-hidden shadow-2xl shadow-orange-500/5 hover:-translate-y-1 transition-all duration-500 group/card">
                                    <AccordionTrigger className="hover:no-underline px-8 py-7 group">
                                        <div className="flex items-center gap-5">
                                            <div className="p-3.5 bg-gradient-to-br from-[var(--primary)] to-orange-400 rounded-2xl text-white shadow-lg shadow-orange-500/20 group-hover:rotate-6 transition-transform">
                                                <Shield className="h-6 w-6" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-[1000] text-2xl tracking-tight text-slate-900 font-display">Agency Profile</h3>
                                                <p className="text-[12.5px] text-slate-500 font-bold mt-0.5">Primary business & legal information</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-8 pb-10 pt-2">
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Agency Name</Label>
                                                    <Input
                                                        {...register('agency_name')}
                                                        placeholder="e.g., Wanderlust Travels"
                                                        className={`h-14 bg-white/40 border-white/60 rounded-2xl px-5 font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm ${errors.agency_name ? 'border-red-400 ring-1 ring-red-400/20' : ''}`}
                                                    />
                                                    {errors.agency_name && <p className="text-[11px] font-bold text-red-500 mt-1 ml-1">{errors.agency_name.message}</p>}
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Legal Entity Name</Label>
                                                    <Input
                                                        {...register('company_legal_name')}
                                                        placeholder="Full legal entity name"
                                                        className={`h-14 bg-white/40 border-white/60 rounded-2xl px-5 font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm ${errors.company_legal_name ? 'border-red-400 ring-1 ring-red-400/20' : ''}`}
                                                    />
                                                    {errors.company_legal_name && <p className="text-[11px] font-bold text-red-500 mt-1 ml-1">{errors.company_legal_name.message}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Business Domain</Label>
                                                    <Input
                                                        {...register('domain')}
                                                        placeholder="https://wanderlust.com"
                                                        className={`h-14 bg-white/40 border-white/60 rounded-2xl px-5 font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm ${errors.domain ? 'border-red-400 ring-1 ring-red-400/20' : ''}`}
                                                    />
                                                    {errors.domain && <p className="text-[11px] font-bold text-red-500 mt-1 ml-1">{errors.domain.message}</p>}
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Headquarters Address</Label>
                                                    <Input
                                                        {...register('business_address')}
                                                        placeholder="Full office address"
                                                        className={`h-14 bg-white/40 border-white/60 rounded-2xl px-5 font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm ${errors.business_address ? 'border-red-400 ring-1 ring-red-400/20' : ''}`}
                                                    />
                                                    {errors.business_address && <p className="text-[11px] font-bold text-red-500 mt-1 ml-1">{errors.business_address.message}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Country</Label>
                                                    <Controller
                                                        name="country"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Select 
                                                                onValueChange={(value) => {
                                                                    field.onChange(value);
                                                                    setValue('state', '');
                                                                    setValue('city', '');
                                                                    setCountryStates(State.getStatesOfCountry(value));
                                                                    setStateCities([]);
                                                                }} 
                                                                value={field.value}
                                                            >
                                                                <SelectTrigger className="h-14 w-full bg-white/40 border border-white/60 rounded-2xl px-5 font-bold text-slate-900 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm">
                                                                    <SelectValue placeholder="Select Country" />
                                                                </SelectTrigger>
                                                                <SelectContent className="glass-select-content">
                                                                    {allCountries.map(c => (
                                                                        <SelectItem key={c.isoCode} value={c.isoCode} className="text-slate-900 font-bold glass-select-item">
                                                                            {c.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">State</Label>
                                                    <Controller
                                                        name="state"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Select 
                                                                onValueChange={(value) => {
                                                                    field.onChange(value);
                                                                    setValue('city', '');
                                                                    setStateCities(City.getCitiesOfState(formValues.country, value));
                                                                }} 
                                                                value={field.value}
                                                                disabled={!formValues.country}
                                                            >
                                                                <SelectTrigger className="h-14 w-full bg-white/40 border border-white/60 rounded-2xl px-5 font-bold text-slate-900 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm">
                                                                    <SelectValue placeholder="Select State" />
                                                                </SelectTrigger>
                                                                <SelectContent className="glass-select-content">
                                                                    {countryStates.map(s => (
                                                                        <SelectItem key={s.isoCode} value={s.isoCode} className="text-slate-900 font-bold glass-select-item">
                                                                            {s.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">City</Label>
                                                    <Controller
                                                        name="city"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Select 
                                                                onValueChange={field.onChange} 
                                                                value={field.value}
                                                                disabled={!formValues.state}
                                                            >
                                                                <SelectTrigger className="h-14 w-full bg-white/40 border border-white/60 rounded-2xl px-5 font-bold text-slate-900 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm">
                                                                    <SelectValue placeholder="Select City" />
                                                                </SelectTrigger>
                                                                <SelectContent className="glass-select-content">
                                                                    {stateCities.map(c => (
                                                                        <SelectItem key={c.name} value={c.name} className="text-slate-900 font-bold glass-select-item">
                                                                            {c.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </div>
                            </AccordionItem>

                            {/* Contact Details */}
                            <AccordionItem value="contact" className="border-none mb-6">
                                <div className="bg-white/40 backdrop-blur-[24px] border border-white/60 rounded-[32px] overflow-hidden shadow-2xl shadow-orange-500/5 hover:-translate-y-1 transition-all duration-500 group/card">
                                    <AccordionTrigger className="hover:no-underline px-8 py-7 group">
                                        <div className="flex items-center gap-5">
                                            <div className="p-3.5 bg-gradient-to-br from-[var(--primary)] to-orange-400 rounded-2xl text-white shadow-lg shadow-orange-500/20 group-hover:rotate-6 transition-transform">
                                                <UserPlus className="h-6 w-6" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-[1000] text-2xl tracking-tight text-slate-900 font-display">Primary Contact</h3>
                                                <p className="text-[12.5px] text-slate-500 font-bold mt-0.5">Authorised representative details</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-8 pb-10 pt-2">
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">First Name</Label>
                                                    <Input
                                                        {...register('first_name')}
                                                        placeholder="e.g., John"
                                                        className={`h-14 bg-white/40 border-white/60 rounded-2xl px-5 font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm ${errors.first_name ? 'border-red-400 ring-1 ring-red-400/20' : ''}`}
                                                    />
                                                    {errors.first_name && <p className="text-[11px] font-bold text-red-500 mt-1 ml-1">{errors.first_name.message}</p>}
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Last Name</Label>
                                                    <Input
                                                        {...register('last_name')}
                                                        placeholder="e.g., Doe"
                                                        className={`h-14 bg-white/40 border-white/60 rounded-2xl px-5 font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm ${errors.last_name ? 'border-red-400 ring-1 ring-red-400/20' : ''}`}
                                                    />
                                                    {errors.last_name && <p className="text-[11px] font-bold text-red-500 mt-1 ml-1">{errors.last_name.message}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Work Email</Label>
                                                    <Input
                                                        {...register('email')}
                                                        type="email"
                                                        placeholder="contact@agency.com"
                                                        className={`h-14 bg-white/40 border-white/60 rounded-2xl px-5 font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm ${errors.email ? 'border-red-400 ring-1 ring-red-400/20' : ''}`}
                                                    />
                                                    {errors.email && <p className="text-[11px] font-bold text-red-500 mt-1 ml-1">{errors.email.message}</p>}
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mobile Number</Label>
                                                    <PhoneInput
                                                        country={'in'}
                                                        value={formValues.phone}
                                                        onChange={phone => setValue('phone', phone)}
                                                        containerClass="!w-full !rounded-2xl shadow-sm"
                                                        inputClass={`!w-full !h-14 !pl-16 !bg-white/40 !border-white/60 !rounded-2xl !transition-all !text-[15px] !font-bold !text-slate-900 placeholder:!text-slate-300 focus:!bg-white focus:!border-[var(--primary)] focus:!ring-4 focus:!ring-orange-500/5 ${errors.phone ? '!border-red-400 !ring-1 !ring-red-400/20' : ''}`}
                                                        buttonClass="!bg-transparent !border-white/20 !rounded-l-2xl !pl-4 hover:!bg-white/10 !transition-colors"
                                                        dropdownClass="glass-phone-dropdown"
                                                    />
                                                    {errors.phone && <p className="text-[11px] font-bold text-red-500 mt-1 ml-1">{errors.phone.message}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </div>
                            </AccordionItem>

                            {/* Credentials */}
                            <AccordionItem value="credentials" className="border-none mb-6">
                                <div className="bg-white/40 backdrop-blur-[24px] border border-white/60 rounded-[32px] overflow-hidden shadow-2xl shadow-orange-500/5 hover:-translate-y-1 transition-all duration-500 group/card">
                                    <AccordionTrigger className="hover:no-underline px-8 py-7 group">
                                        <div className="flex items-center gap-5">
                                            <div className="p-3.5 bg-gradient-to-br from-[var(--primary)] to-orange-400 rounded-2xl text-white shadow-lg shadow-orange-500/20 group-hover:rotate-6 transition-transform">
                                                <Shield className="h-6 w-6" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-[1000] text-2xl tracking-tight text-slate-900 font-display">Security</h3>
                                                <p className="text-[12.5px] text-slate-500 font-bold mt-0.5">Secure your agency account</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-8 pb-10 pt-2">
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Enter Password</Label>
                                                    <div className="relative">
                                                        <Input
                                                            {...register('password')}
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="••••••••"
                                                            className={`h-14 bg-white/40 border border-white/60 rounded-2xl px-5 font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all pr-12 shadow-sm ${errors.password ? 'border-red-400 ring-1 ring-red-400/20' : ''}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--primary)] transition-colors"
                                                        >
                                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                    {formValues.password && (
                                                        <div className="flex gap-1.5 mt-3 px-1">
                                                            {[1, 2, 3, 4, 5].map((i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`h-1.5 w-full rounded-full transition-all duration-500 ${i <= passwordStrength ? (passwordStrength <= 2 ? 'bg-red-400' : passwordStrength <= 4 ? 'bg-amber-400' : 'bg-green-400') : 'bg-white/10'}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {errors.password && <p className="text-[11px] font-bold text-red-500 mt-1 ml-1">{errors.password.message}</p>}
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Confirm Password</Label>
                                                    <div className="relative">
                                                        <Input
                                                            {...register('confirm_password')}
                                                            type={showConfirmPassword ? "text" : "password"}
                                                            placeholder="••••••••"
                                                            className={`h-14 bg-white/40 border border-white/60 rounded-2xl px-5 font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 transition-all pr-12 shadow-sm ${errors.confirm_password ? 'border-red-400 ring-1 ring-red-400/20' : ''}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--primary)] transition-colors"
                                                        >
                                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                    {errors.confirm_password && <p className="text-[11px] font-bold text-red-500 mt-1 ml-1">{errors.confirm_password.message}</p>}
                                                </div>
                                            </div>

                                            <div className="p-8 bg-white/40 rounded-[32px] border border-white/60 backdrop-blur-md space-y-6 shadow-sm">
                                                <Label className="text-[14px] font-[1000] text-slate-900 flex items-center gap-3">
                                                    <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                                                    Intelligence Check: What is {captchaQuest.num1} + {captchaQuest.num2}?
                                                </Label>
                                                <Input
                                                    {...register('captcha')}
                                                    placeholder="Solve"
                                                    className={`h-20 bg-white shadow-inner border border-slate-100 rounded-3xl transition-all font-[1000] text-5xl text-center tracking-[0.3em] text-slate-900 placeholder:text-slate-100 focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/5 ${errors.captcha ? 'border-red-400 ring-1 ring-red-400/20' : ''}`}
                                                />
                                                {errors.captcha && <p className="text-[11px] font-bold text-red-500 mt-1 text-center">{errors.captcha.message}</p>}
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </div>
                            </AccordionItem>
                        </Accordion>

                        <div className="flex flex-col gap-8 pt-10">
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-20 bg-gradient-to-r from-[var(--primary)] to-orange-400 text-white hover:scale-[1.02] active:scale-95 font-[1000] text-xl rounded-[28px] shadow-2xl shadow-orange-500/30 transition-all relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                {submitting ? (
                                    <span className="flex items-center gap-3 justify-center">
                                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                        Initializing Agency...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2 justify-center">
                                        Complete Enterprise Registration <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                            <p className="text-center text-slate-500 font-bold text-sm uppercase tracking-widest">
                                Already a partner? <Link href="/login" className="text-[var(--primary)] hover:underline underline-offset-4 font-black transition-all ml-1">Log in to Portal</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
