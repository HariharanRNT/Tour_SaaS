'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { authAPI } from '@/lib/api'
import { cn, formatError } from '@/lib/utils'
import { Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowLeft, Clock, MapPin, Compass, Globe, Wind, Check, Copy, Key, ChevronRight, ShieldCheck, Plane } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        <path fill="none" d="M0 0h48v48H0z" />
    </svg>
)

// Google Icon remains for social login

function LoginContent() {
    const router = useRouter()
    const { login: authLogin } = useAuth()
    const searchParams = useSearchParams()
    const nextUrl = searchParams.get('next')

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [agentInfo, setAgentInfo] = useState<{ agency_name: string | null; agent_name: string | null } | null>(null)

    const [otpSent, setOtpSent] = useState(false)
    const [otp, setOtp] = useState('')
    const [otpError, setOtpError] = useState('')
    const [otpLoading, setOtpLoading] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null)

    const [showPassword, setShowPassword] = useState(false)
    const [emailValid, setEmailValid] = useState<boolean | null>(null)
    const [emailTouched, setEmailTouched] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [isShaking, setIsShaking] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    // New focus/validation states for Admin-style UI
    const [emailFocused, setEmailFocused] = useState(false)
    const [passwordFocused, setPasswordFocused] = useState(false)
    const [otpFocused, setOtpFocused] = useState(false)


    useEffect(() => {
        const fetchAgentInfo = async () => {
            try {
                const info = await authAPI.getPublicAgentInfo()
                if (info && info.agency_name) setAgentInfo(info)
            } catch (e) { }
        }
        fetchAgentInfo()
    }, [])

    // Route guard: Redirect customers to home if they access /login while logged in
    useEffect(() => {
        const userStr = localStorage.getItem('user')
        if (userStr) {
            try {
                const user = JSON.parse(userStr)
                if (user.role?.toLowerCase() === 'customer') {
                    router.push('/')
                }
            } catch (e) {
                console.error('Error checking user role for redirect:', e)
            }
        }
    }, [router])

    useEffect(() => {
        if (resendCooldown > 0) {
            const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
            return () => clearTimeout(t)
        }
    }, [resendCooldown])

    useEffect(() => {
        if (otpExpiresAt) {
            const t = setInterval(() => {
                if (Math.max(0, otpExpiresAt - Date.now()) === 0) clearInterval(t)
            }, 1000)
            return () => clearInterval(t)
        }
    }, [otpExpiresAt])

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setEmail(val)
        if (emailTouched) setEmailValid(validateEmail(val))
    }

    const handleEmailBlur = () => {
        setEmailTouched(true)
        setEmailValid(validateEmail(email))
    }

    const shake = () => { setIsShaking(true); setTimeout(() => setIsShaking(false), 500) }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setOtpError('')
        if (!validateEmail(email)) { setEmailTouched(true); setEmailValid(false); shake(); return }
        setLoading(true)
        try {
            const response = await authAPI.login(email, password)
            if (response.require_otp) {
                // Block customers immediately — even before showing OTP screen
                if (response.role?.toUpperCase() === 'CUSTOMER') {
                    setError('This portal is for travel agents only. Are you a traveler? Use the booking page.')
                    shake()
                    setLoading(false)
                    return
                }
                setOtpExpiresAt(Date.now() + (response.expires_in || 300) * 1000)
                setResendCooldown(60)
                setOtpSent(true)
                setLoading(false)
            } else {
                const user = response.user
                const role = user?.role?.toUpperCase()

                // Block customers from the Agent Portal
                if (role === 'CUSTOMER') {
                    setError('This portal is for travel agents only. Are you a traveler? Use the booking page.')
                    shake()
                    setLoading(false)
                    return
                }

                authLogin(response.access_token, response.user)
                setIsSuccess(true)
                setTimeout(() => {
                    if (nextUrl) router.push(nextUrl)
                    if (role === 'ADMIN') { localStorage.setItem('isAdmin', 'true'); router.push('/admin/dashboard') }
                    else if (role === 'AGENT' || role === 'SUB_USER') {
                        const hasActiveSub = user?.has_active_subscription || user?.subscription_status === 'active';
                        if (hasActiveSub) {
                            router.push('/agent/dashboard')
                        } else {
                            router.push('/agent/subscription')
                        }
                    }
                    else router.push('/')
                }, 900)
            }
        } catch (err: any) {
            setError(formatError(err))
            shake()
            setLoading(false)
        }
    }

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        setOtpError('')
        if (otp.length !== 6) { setOtpError('Please enter a 6-digit OTP'); shake(); return }
        setOtpLoading(true)
        try {
            const data = await authAPI.verifyLoginOTP(email, otp)
            const role = data.user.role?.toUpperCase()

            // Block customers from the Agent Portal
            if (role === 'CUSTOMER') {
                setOtpError('This portal is for travel agents only. Are you a traveler? Use the booking page.')
                shake()
                setOtpLoading(false)
                return
            }

            authLogin(data.access_token, data.user)
            setIsSuccess(true)
            setTimeout(() => {
                if (nextUrl) router.push(nextUrl)
                else if (role === 'ADMIN') { localStorage.setItem('isAdmin', 'true'); router.push('/admin/dashboard') }
                else if (role === 'AGENT' || role === 'SUB_USER') {
                    const hasActiveSub = data.user.has_active_subscription || data.user.subscription_status === 'active';
                    if (hasActiveSub) {
                        router.push('/agent/dashboard')
                    } else {
                        router.push('/agent/subscription')
                    }
                }
                else router.push('/')
            }, 900)
        } catch (err: any) {
            setOtpError(formatError(err))
            shake()
            setOtpLoading(false)
        }
    }

    const handleResendOTP = async () => {
        if (resendCooldown > 0) return
        setOtpError('')
        setLoading(true)
        try {
            const response = await authAPI.sendLoginOTP(email, password)
            setOtpExpiresAt(Date.now() + response.expires_in * 1000)
            setResendCooldown(60)
            setOtp('')
            setLoading(false)
        } catch (err: any) {
            setOtpError(err.response?.data?.detail || 'Failed to resend OTP')
            setLoading(false)
        }
    }

    const handleBackToStep1 = () => { setOtpSent(false); setOtp(''); setOtpError(''); setOtpExpiresAt(null); setResendCooldown(0) }

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true)
            setError('')
            try {
                const data = await authAPI.googleLogin(tokenResponse.access_token)
                const role = data.user?.role?.toUpperCase()

                // Block customers from the Agent Portal
                if (role === 'CUSTOMER') {
                    setError('This portal is for travel agents only. Are you a traveler? Use the booking page.')
                    shake()
                    setLoading(false)
                    return
                }

                authLogin(data.access_token, data.user)
                setIsSuccess(true)
                setTimeout(() => {
                    const user = data.user
                    if (nextUrl) router.push(nextUrl)
                    else if (role === 'ADMIN') { localStorage.setItem('isAdmin', 'true'); router.push('/admin/dashboard') }
                    else if (role === 'AGENT' || role === 'SUB_USER') {
                        const hasActiveSub = user.has_active_subscription || user.subscription_status === 'active';
                        if (hasActiveSub) {
                            router.push('/agent/dashboard')
                        } else {
                            router.push('/agent/subscription')
                        }
                    }
                    else router.push('/')
                }, 900)
            } catch (err: any) {
                setError(formatError(err))
                shake()
                setLoading(false)
            }
        },
        onError: () => { setError('Google Login failed. Please try again.'); shake() }
    })

    const getTimeRemaining = () => {
        if (!otpExpiresAt) return '5:00'
        const remaining = Math.max(0, otpExpiresAt - Date.now())
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    return (
        <div className="min-h-screen bg-[var(--primary-soft)] flex w-full relative overflow-x-hidden noise-overlay">
            {/* Ambient Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--primary-soft)]/60 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--primary-light)]/50 blur-[150px] pointer-events-none" />
            <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-[var(--primary-soft)]/40 blur-[100px] pointer-events-none" />

            {/* Mesh Gradient Overlay */}
            <div className="absolute inset-0 opacity-80 mix-blend-overlay" style={{
                backgroundImage: 'radial-gradient(at 0% 0%, var(--primary-soft) 0, transparent 50%), radial-gradient(at 100% 100%, var(--primary-soft) 0, transparent 60%), radial-gradient(at 50% 50%, var(--primary-light) 0, transparent 100%), radial-gradient(circle, transparent 40%, rgba(255,179,138,0.2) 100%)'
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
                    {/* World Map Overlay - Refined Version without rectangles */}
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
                                <h1 className="text-3xl lg:text-4xl font-extrabold text-black leading-tight">
                                    Your Global<br />
                                    <span className="text-black">Command Center.</span>
                                </h1>

                                <p className="text-[15px] text-black font-medium leading-relaxed max-w-sm opacity-90">
                                    Monitor bookings, manage multi-destination packages, and scale your travel empire from one unified portal.
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

                {/* Right Side: Login Card (55%) */}
                <div className="w-full lg:w-[55%] flex items-center justify-center p-4 lg:p-8 py-12 sm:py-20 lg:py-16">
                    <Card className={`glass-panel w-full max-w-[420px] shadow-[0_20px_60px_rgba(255,122,69,0.2)] bg-white/25 backdrop-blur-[20px] border border-white/35 rounded-[24px] p-0 relative z-10 animate-in fade-in slide-in-from-right-8 duration-800 ${isShaking ? 'animate-shake' : ''}`}>
                        <CardHeader className="space-y-2 pb-2 pt-5 px-4 sm:px-6">
                            <div className="flex flex-col items-center justify-center space-y-2 mb-0">
                                {/* 52px Compact Glass Lock Circle */}
                                <div className="relative w-[52px] h-[52px] flex items-center justify-center animate-pulse-slow group">
                                    <div className="absolute inset-0 bg-[var(--primary)] rounded-full blur-[8px] opacity-30 group-hover:blur-[10px] transition-all" />
                                    <div className="w-full h-full bg-white/25 backdrop-blur-md rounded-full border border-white/40 shadow-[0_4px_16px_rgba(255,122,69,0.15)] flex items-center justify-center relative z-10 overflow-hidden">
                                        <div className="absolute inset-x-0 bottom-0 top-[20%] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] opacity-70 rounded-full blur-sm mix-blend-overlay" />
                                        <Plane className="h-6 w-6 text-[var(--primary)] relative z-20 drop-shadow-md rotate-[-45deg]" />
                                    </div>
                                </div>

                                <div className="text-center space-y-2 w-full">
                                    <CardTitle className="text-[11px] text-center font-bold text-black tracking-[0.2em] uppercase">
                                        {agentInfo?.agency_name ? `${agentInfo.agency_name} — Agent Portal` : 'TourSaaS — Agent Portal'}
                                    </CardTitle>
                                    <CardDescription className="text-center font-medium text-black text-[13px] leading-snug">
                                        {otpSent ? 'Enter security code' : 'This login is for registered travel agents only.'}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="px-4 sm:px-6 pb-5 pt-1">
                            <AnimatePresence mode="wait">
                                {isSuccess ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-6 space-y-3"
                                    >
                                        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 shadow-[0_8px_32px_rgba(34,197,94,0.3)]">
                                            <CheckCircle className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-[#1a1a2e]">Welcome</h3>
                                        <p className="text-black text-sm font-medium">Boarding your dashboard... ✈️</p>
                                    </motion.div>
                                ) : !otpSent ? (
                                    <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
                                        <form onSubmit={handleLogin} className="space-y-4">
                                            {error && (
                                                <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-xl flex items-center gap-2 text-xs">
                                                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                                    <span>{error}</span>
                                                </div>
                                            )}

                                            <div className="space-y-2.5">
                                                {/* Email Field with Floating Label */}
                                                <div className="relative group/input">
                                                    <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 z-10 ${emailFocused || email ? 'text-black' : 'text-black/30'}`} />
                                                    <Input
                                                        id="email" type="email" value={email}
                                                        onChange={handleEmailChange} onBlur={handleEmailBlur}
                                                        onFocus={() => setEmailFocused(true)}
                                                        className={`
                                                            pl-11 pr-10 h-12 bg-white/30 backdrop-blur-[8px] border border-white/40 rounded-[14px] 
                                                            transition-all duration-300 text-black font-medium text-sm
                                                            focus-visible:ring-0 focus-visible:ring-offset-0 
                                                            ${emailFocused ? 'border-black shadow-[0_0_8px_rgba(0,0,0,0.1)] bg-white/40' : ''}
                                                            ${emailValid === false ? 'border-red-300' : ''}
                                                        `}
                                                        required
                                                    />
                                                    <label
                                                        htmlFor="email"
                                                        className={`absolute left-11 transition-all duration-300 pointer-events-none origin-left
                                                            ${emailFocused || email
                                                                ? '-top-2 text-[10px] font-bold text-black uppercase tracking-wider bg-white px-1.5 rounded-full'
                                                                : 'top-1/2 -translate-y-1/2 text-[14px] text-[#888]'
                                                            }`}
                                                    >
                                                        Email address
                                                    </label>
                                                </div>

                                                {/* Password Field with Floating Label */}
                                                <div className="relative group/input">
                                                    <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 z-10 ${passwordFocused || password ? 'text-black' : 'text-black/30'}`} />
                                                    <Input
                                                        id="password" type={showPassword ? 'text' : 'password'}
                                                        value={password} onChange={(e) => setPassword(e.target.value)}
                                                        onFocus={() => setPasswordFocused(true)}
                                                        onBlur={() => setPasswordFocused(false)}
                                                        className={`
                                                            pl-11 pr-11 h-12 bg-white/30 backdrop-blur-[8px] border border-white/40 rounded-[14px] 
                                                            transition-all duration-300 text-black font-medium text-sm
                                                            focus-visible:ring-0 focus-visible:ring-offset-0 
                                                            ${passwordFocused ? 'border-black shadow-[0_0_8px_rgba(0,0,0,0.1)] bg-white/40' : ''}
                                                        `}
                                                        required
                                                    />
                                                    <button
                                                        type="button" onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black/50 hover:text-black transition-colors focus:outline-none"
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                    <label
                                                        htmlFor="password"
                                                        className={`absolute left-11 transition-all duration-300 pointer-events-none origin-left
                                                            ${passwordFocused || password
                                                                ? '-top-2 text-[10px] font-bold text-black uppercase tracking-wider bg-white px-1.5 rounded-full'
                                                                : 'top-1/2 -translate-y-1/2 text-[14px] text-[#888]'
                                                            }`}
                                                    >
                                                        Password
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(c) => setRememberMe(c as boolean)} className="w-4 h-4 border-black data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                                    <label htmlFor="remember-me" className="text-[13px] font-bold text-black/70 cursor-pointer">Remember me</label>
                                                </div>
                                                <Link href="/forgot-password" core-link="true" className="text-[13px] font-bold text-black hover:underline transition-all">
                                                    Forgot?
                                                </Link>
                                            </div>

                                            <div className="mt-2">
                                                <Button
                                                    type="submit" disabled={loading}
                                                    className="w-full h-11 rounded-[14px] text-sm font-bold shadow-[0_4px_16px_rgba(255,122,69,0.2)] hover:shadow-[0_8px_24px_rgba(255,122,69,0.3)] transition-all duration-300 bg-gradient-to-r from-[var(--primary)] to-[#FFA06A] text-white border-none group relative overflow-hidden"
                                                >
                                                    {loading ? (
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <span className="flex items-center gap-2">Sign In <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>
                                                    )}
                                                </Button>

                                                <div className="flex items-center justify-center gap-1.5 mt-2 opacity-80">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                                                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-tighter">SECURE LOGIN · SSL ENCRYPTED</span>
                                                </div>
                                            </div>

                                            <div className="relative my-3">
                                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#FFCBA4]/20" /></div>
                                                <div className="relative flex justify-center"><span className="bg-transparent px-3 text-[10px] text-black uppercase tracking-widest font-black">or</span></div>
                                            </div>

                                            <Button
                                                type="button" variant="outline" onClick={() => googleLogin()} disabled={loading}
                                                className="w-full h-12 bg-white/20 border border-gray-200/50 rounded-[14px] text-sm font-bold hover:bg-white/40 transition-all flex items-center justify-center gap-2"
                                            >
                                                <GoogleIcon className="h-5 w-5" />
                                                Google Login
                                            </Button>

                                            <div className="text-center pt-2.5 border-t border-[#FFCBA4]/10 mt-2.5">
                                                <p className="text-[13px] font-bold text-black/60">
                                                    Are you a traveler?{' '}
                                                    <Link href="/" className="text-black hover:underline">Book your trip here</Link>
                                                </p>

                                                <div className="mt-2.5 pt-2.5 border-t border-[#FFCBA4]/10 relative">
                                                    <div className="bg-white/5 backdrop-blur-sm p-2 rounded-[14px] border border-white/10 flex flex-col gap-1.5">
                                                        <Link href="/register/agent" className="w-full h-9 flex items-center justify-center text-black hover:text-white font-bold text-[12px] bg-white/30 rounded-lg border border-black/20 hover:bg-black transition-all group/agent">
                                                            Register as Agent
                                                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    </motion.div>
                                ) : (
                                    <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                                            {otpError && (
                                                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                    <span className="text-sm">{otpError}</span>
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <div className="relative group animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
                                                    <Input
                                                        id="otp" type="text" value={otp}
                                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                        onFocus={() => setOtpFocused(true)}
                                                        onBlur={() => setOtpFocused(false)}
                                                        placeholder="000000" maxLength={6}
                                                        className={`
                                                            h-16 text-center text-3xl font-bold tracking-[0.5em] 
                                                            bg-white/35 backdrop-blur-[10px] border border-white/40 rounded-[18px] 
                                                            transition-all duration-300 text-black
                                                            focus-visible:ring-0 focus-visible:ring-offset-0 
                                                            ${otpFocused ? 'border-black shadow-[0_0_12px_rgba(0,0,0,0.2)] bg-white/50' : ''}
                                                        `}
                                                        autoComplete="one-time-code"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-center gap-2 text-xs font-bold text-black/60">
                                                    <Clock className="w-4 h-4" />
                                                    <span>Expires in <span className="text-black">{getTimeRemaining()}</span></span>
                                                </div>

                                                <div className="flex justify-center gap-3">
                                                    {[...Array(6)].map((_, i) => (
                                                        <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i < otp.length ? 'bg-black scale-125' : 'border border-black/20'}`} />
                                                    ))}
                                                </div>
                                            </div>

                                            <Button
                                                type="submit" disabled={otpLoading || otp.length !== 6}
                                                className="w-full h-14 rounded-[30px] font-bold transition-all duration-300 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] disabled:opacity-50 text-white"
                                            >
                                                {otpLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Onboard'}
                                            </Button>

                                            <div className="flex flex-col gap-4 text-center mt-6">
                                                <button type="button" onClick={handleResendOTP}
                                                    disabled={resendCooldown > 0 || loading}
                                                    className={`text-sm font-bold transition-colors ${resendCooldown > 0 ? 'text-black/30 cursor-not-allowed' : 'text-black hover:text-gray-700'}`}
                                                >
                                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                                </button>

                                                <button type="button" onClick={handleBackToStep1}
                                                    className="w-full flex items-center justify-center gap-2 text-sm font-bold text-black/60 hover:text-black transition-colors"
                                                >
                                                    <ArrowLeft className="w-4 h-4" />
                                                    Back to login
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>

                    </Card>
                </div>
            </div>

            <style jsx global>{`
                .noise-overlay {
                    position: relative;
                }
                .noise-overlay::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    opacity: 0.04;
                    z-index: 1;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%) skewX(12deg); }
                    100% { transform: translateX(200%) skewX(12deg); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
                @keyframes pulse-slow {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LoginContent />
        </Suspense>
    )
}