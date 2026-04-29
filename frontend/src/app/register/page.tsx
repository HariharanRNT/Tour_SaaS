'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { authAPI } from '@/lib/api'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import {
    User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle2, XCircle,
    ShieldCheck, ArrowRight, Plane, AlertCircle, Check, X,
    ChevronRight, Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatError } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'

export default function RegisterPage() {
    const router = useRouter()
    const { login: authLogin } = useAuth()

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        terms: false
    })

    // Validation State
    const [touched, setTouched] = useState<Record<string, boolean>>({})
    const [emailValid, setEmailValid] = useState<boolean | null>(null)
    const [passwordStrength, setPasswordStrength] = useState(0) // 0-3
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Real-time Validation Logic
    useEffect(() => {
        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (formData.email) {
            setEmailValid(emailRegex.test(formData.email))
        } else {
            setEmailValid(null)
        }

        // Password Strength Calculation
        let strength = 0
        if (formData.password.length >= 8) strength++
        if (/[A-Z]/.test(formData.password)) strength++
        if (/[0-9]/.test(formData.password) || /[^A-Za-z0-9]/.test(formData.password)) strength++
        setPasswordStrength(strength)

    }, [formData.email, formData.password])

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }))
    }

    const getPasswordRequirements = () => {
        return [
            { label: '8+ characters', valid: formData.password.length >= 8 },
            { label: 'Uppercase letter', valid: /[A-Z]/.test(formData.password) },
            { label: 'Number or Symbol', valid: /[0-9]/.test(formData.password) || /[^A-Za-z0-9]/.test(formData.password) },
        ]
    }

    const isFormValid = () => {
        return (
            emailValid &&
            formData.password.length >= 8 &&
            formData.first_name.trim().length > 0 &&
            formData.last_name.trim().length > 0 &&
            formData.terms
        )
    }

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true)
            setError('')
            try {
                // For customer registration via Google, we explicitly pass 'CUSTOMER' role
                const data = await authAPI.googleLogin(tokenResponse.access_token, 'CUSTOMER')
                authLogin(data.access_token, data.user)
                router.push('/')
            } catch (err: any) {
                setError(formatError(err))
            } finally {
                setLoading(false)
            }
        },
        onError: () => {
            setError('Google Login failed. Please try again.')
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!isFormValid()) {
            setError('Please correct the errors and accept terms before continuing.')
            return
        }

        setLoading(true)

        try {
            const data = await authAPI.register({
                email: formData.email,
                password: formData.password,
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone: formData.phone
            })
            authLogin(data.access_token, data.user)
            router.push('/')
        } catch (err: any) {
            setError(formatError(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--primary-soft)] flex w-full relative overflow-x-hidden noise-overlay">
            {/* Ambient Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--primary-soft)]/60 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--primary-soft)]/50 blur-[150px] pointer-events-none" />
            <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-[var(--primary-soft)]/40 blur-[100px] pointer-events-none" />

            {/* Mesh Gradient Overlay */}
            <div className="absolute inset-0 opacity-80 mix-blend-overlay" style={{
                backgroundImage: 'radial-gradient(at 0% 0%, var(--primary-soft) 0, transparent 50%), radial-gradient(at 100% 100%, var(--primary-soft) 0, transparent 60%), radial-gradient(at 50% 50%, var(--primary-soft) 0, transparent 100%), radial-gradient(circle, transparent 40%, rgba(255,179,138,0.2) 100%)'
            }} />

            {/* Split Screen Layout Container */}
            <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row relative z-10 min-h-screen">
                {/* Mobile Header Logo */}
                <div className="lg:hidden flex justify-center pt-6 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/40 p-2 rounded-xl backdrop-blur-md border border-white/50 shadow-sm flex items-center justify-center">
                            <Plane className="h-5 w-5 text-[var(--primary)]" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-black">TourSaaS</span>
                    </div>
                </div>

                {/* Left Side: Brand Message (45%) */}
                <div className="hidden lg:flex w-full lg:w-[45%] flex-col justify-center p-8 lg:p-12 animate-in fade-in slide-in-from-left-8 duration-700 relative overflow-hidden">
                    {/* World Map Overlay */}
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-multiply" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Cpath stroke='%23FF7A45' stroke-width='1' fill='none' d='M100 100c50 20 100-20 150 0M300 300c40-30 80 10 120-20M500 100c60 50 120 0 180 30M600 350c-40-20-80 30-120 10M50 250c30-10 60 40 90 20'/%3E%3C/svg%3E")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }} />

                    <div className="space-y-6 max-w-lg relative z-20">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/40 p-2.5 rounded-xl backdrop-blur-md border border-white/50 shadow-sm flex items-center justify-center">
                                    <Plane className="h-6 w-6 text-[var(--primary)]" />
                                </div>
                                <span className="font-bold text-2xl tracking-tight text-black">TourSaaS</span>
                            </div>

                            <div className="space-y-3">
                                <h1 className="text-3xl lg:text-4xl font-extrabold text-[#010203] leading-tight">
                                    Join Thousands of<br />
                                    <span className="text-black">Dream Travelers.</span>
                                </h1>

                                <p className="text-[15px] text-black font-medium leading-relaxed max-w-sm opacity-90">
                                    Create your account to start planning, booking, and managing your global travel adventures with ease.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            {[
                                { icon: '✈️', text: 'Real-time Bookings' },
                                { icon: '📊', text: 'Revenue Tracking' },
                                { icon: '👥', text: 'Agent Management' }
                            ].map((pill, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-white/40 backdrop-blur-md border border-white/50 h-8 px-3 rounded-full shadow-sm">
                                    <span className="text-xs">{pill.icon}</span>
                                    <span className="text-[12px] font-bold text-black whitespace-nowrap">{pill.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Register Card (55%) */}
                <div className="w-full lg:w-[55%] flex items-center justify-center p-4 lg:p-8 py-12 sm:py-20 lg:py-16">
                    <Card className={`glass-panel w-full max-w-[480px] shadow-[0_20px_60px_rgba(255,122,69,0.2)] bg-white/25 backdrop-blur-[20px] border border-white/35 rounded-[32px] p-0 relative z-10 animate-in fade-in slide-in-from-right-8 duration-800 overflow-hidden`}>
                        <CardHeader className="space-y-2 pb-2 pt-6 px-6 sm:px-8 text-center">
                            <div className="flex flex-col items-center justify-center space-y-3 mb-0">
                                {/* Compact Glass Plane Circle */}
                                <div className="relative w-[52px] h-[52px] flex items-center justify-center animate-pulse-slow group">
                                    <div className="absolute inset-0 bg-[var(--primary)] rounded-full blur-[8px] opacity-30 group-hover:blur-[10px] transition-all" />
                                    <div className="relative bg-gradient-to-br from-[var(--primary)] to-[#FFA06A] p-2.5 rounded-full shadow-lg shadow-orange-500/20 border border-white/40 transform group-hover:scale-110 transition-transform duration-500">
                                        <Plane className="h-6 w-6 text-white rotate-[-45deg]" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-[11px] text-center font-bold text-black tracking-[0.2em] uppercase">
                                        Join TourSaaS Today
                                    </CardTitle>
                                    <CardDescription className="text-center font-medium text-black text-[13px] leading-snug">
                                        Create your account to start your journey
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="px-6 sm:px-8 pb-6 pt-2">
                            <AnimatePresence mode="wait">
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-red-50 text-red-600 p-2.5 rounded-xl text-xs border border-red-100 flex items-start gap-2 mb-2"
                                        >
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}

                                    {/* Social Signup - Only Google for consistency */}
                                    <div className="pb-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleGoogleLogin()}
                                            disabled={loading}
                                            className="w-full h-10 rounded-xl bg-white/40 backdrop-blur-md border-white/50 hover:bg-white/60 hover:border-black/30 text-black font-bold text-xs transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            <svg className="h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                                            Continue with Google
                                        </Button>
                                    </div>

                                    <div className="relative my-2">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#FFCBA4]/20" /></div>
                                        <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-black text-black bg-transparent"><span className="px-2">or join with email</span></div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* First Name */}
                                            <div className="relative group/input">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 group-focus-within/input:text-black transition-colors" />
                                                <Input
                                                    value={formData.first_name}
                                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                                    placeholder="First Name"
                                                    className="h-10 pl-10 bg-orange-50/30 border-orange-100/50 rounded-xl focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 transition-all text-sm font-medium placeholder:text-black/60"
                                                />
                                            </div>
                                            {/* Last Name */}
                                            <div className="relative group/input">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 group-focus-within/input:text-black transition-colors" />
                                                <Input
                                                    value={formData.last_name}
                                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                                    placeholder="Last Name"
                                                    className="h-10 pl-10 bg-orange-50/30 border-orange-100/50 rounded-xl focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 transition-all text-sm font-medium placeholder:text-black/60"
                                                />
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="relative group/input">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 group-focus-within/input:text-black transition-colors" />
                                            <Input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="Email Address"
                                                className="h-10 pl-10 bg-orange-50/30 border-orange-100/50 rounded-xl focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-sm font-medium placeholder:text-black/60"
                                            />
                                        </div>

                                        {/* Phone */}
                                        <div className="relative">
                                            <PhoneInput
                                                country={'in'}
                                                value={formData.phone}
                                                onChange={phone => setFormData({ ...formData, phone })}
                                                containerClass="!w-full !rounded-xl"
                                                inputClass="!w-full !h-10 !pl-12 !bg-white/20 !backdrop-blur-md !border-white/30 !rounded-xl focus:!bg-white/40 focus:!border-black !transition-all !text-sm !font-medium !placeholder-black/70"
                                                buttonClass="!bg-white/10 !border-none !rounded-l-xl !pl-2 hover:!bg-white/20 !transition-colors"
                                                dropdownClass="glass-phone-dropdown"
                                            />

                                        </div>

                                        {/* Password */}
                                        <div className="space-y-2">
                                            <div className="relative group/input">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 group-focus-within/input:text-black transition-colors" />
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.password}
                                                    maxLength={50}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    placeholder="Security Password"
                                                    className="h-10 pl-10 pr-10 bg-orange-50/30 border-orange-100/50 rounded-xl focus:bg-white focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-sm font-medium placeholder:text-black/60"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/20 hover:text-black transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>

                                            {/* Password Strength Pills */}
                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                {getPasswordRequirements().map((req, i) => (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1",
                                                            req.valid
                                                                ? "bg-green-50 text-green-600 border-green-200"
                                                                : "bg-orange-50/30 text-black/40 border-orange-100/50"
                                                        )}
                                                    >
                                                        {req.valid && <Check className="w-2.5 h-2.5" />}
                                                        {req.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Terms Checkbox */}
                                    <div className="flex items-center gap-2.5 py-1 px-1">
                                        <input
                                            type="checkbox"
                                            id="terms"
                                            checked={formData.terms}
                                            onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                                            className="w-4 h-4 rounded border-black text-black focus:ring-black/20 transition-all cursor-pointer"
                                        />
                                        <label htmlFor="terms" className="text-[11px] font-medium text-black/70 cursor-pointer">
                                            I agree to the <Link href="/terms" className="text-black font-bold hover:underline">Terms</Link> & <Link href="/privacy" className="text-black font-bold hover:underline">Privacy Policy</Link>
                                        </label>
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            type="submit"
                                            className={cn(
                                                "w-full h-11 rounded-2xl text-sm font-bold shadow-[0_8px_20px_rgba(255,122,69,0.25)] hover:shadow-[0_12px_28px_rgba(255,122,69,0.35)] transition-all duration-300 bg-gradient-to-r from-[var(--primary)] to-[#FFA06A] text-white border-none group relative overflow-hidden",
                                                loading && "opacity-80"
                                            )}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <span className="flex items-center gap-2">Get Started <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>
                                            )}
                                        </Button>

                                        {/* Security Badge */}
                                        <div className="flex items-center justify-center gap-1.5 mt-2.5 opacity-80">
                                            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                                            <span className="text-[10px] font-bold text-green-700 uppercase tracking-tighter">Your data is secure and encrypted</span>
                                        </div>
                                    </div>

                                    <div className="text-center pt-3 mt-1 border-t border-[#FFCBA4]/10">
                                        <p className="text-[13px] font-bold text-black/60">
                                            Already a member?{' '}
                                            <Link href="/login" className="text-black font-black hover:underline">Sign in here</Link>
                                        </p>
                                    </div>
                                </form>
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
