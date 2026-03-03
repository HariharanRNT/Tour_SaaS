'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { authAPI } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowLeft, Clock, MapPin, Compass, Globe, Wind } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoogleLogin } from '@react-oauth/google'

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        <path fill="none" d="M0 0h48v48H0z" />
    </svg>
)

// Floating destination badge
const DestinationBadge = ({ name, emoji, style, delay }: { name: string; emoji: string; style: React.CSSProperties; delay: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay, duration: 0.6, ease: 'easeOut' }}
        style={style}
        className="absolute flex items-center gap-1.5 bg-white/90 backdrop-blur-md shadow-lg shadow-black/10 rounded-full px-3 py-1.5 border border-white/60 select-none pointer-events-none z-20"
    >
        <span className="text-base">{emoji}</span>
        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{name}</span>
    </motion.div>
)

// Animated plane path SVG
const PlanePath = () => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 700" fill="none" preserveAspectRatio="xMidYMid slice">
        <path
            d="M50 600 Q150 400 300 350 Q450 300 550 100"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="6 8"
            opacity="0.15"
            fill="none"
        />
        <circle cx="50" cy="600" r="4" fill="white" opacity="0.3" />
        <circle cx="550" cy="100" r="4" fill="white" opacity="0.3" />
    </svg>
)

function LoginContent() {
    const router = useRouter()
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

    useEffect(() => {
        const fetchAgentInfo = async () => {
            try {
                const info = await authAPI.getPublicAgentInfo()
                if (info && info.agency_name) setAgentInfo(info)
            } catch (e) { }
        }
        fetchAgentInfo()
    }, [])

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
                setOtpExpiresAt(Date.now() + (response.expires_in || 300) * 1000)
                setResendCooldown(60)
                setOtpSent(true)
                setLoading(false)
            } else {
                localStorage.setItem('token', response.access_token)
                localStorage.setItem('user', JSON.stringify(response.user))
                setIsSuccess(true)
                setTimeout(() => {
                    const user = response.user
                    if (nextUrl) router.push(nextUrl)
                    else if (user?.role === 'admin') { localStorage.setItem('isAdmin', 'true'); router.push('/admin/dashboard') }
                    else if (user?.role?.toLowerCase() === 'agent') {
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
            setError(err.response?.data?.detail || err.message || 'Invalid email or password')
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
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify(data.user))
            setIsSuccess(true)
            setTimeout(() => {
                if (nextUrl) router.push(nextUrl)
                else if (data.user.role === 'admin') { localStorage.setItem('isAdmin', 'true'); router.push('/admin/dashboard') }
                else if (data.user.role?.toLowerCase() === 'agent') {
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
            setOtpError(err.response?.data?.detail || 'Invalid or expired OTP')
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
                localStorage.setItem('token', data.access_token)
                localStorage.setItem('user', JSON.stringify(data.user))
                setIsSuccess(true)
                setTimeout(() => {
                    const user = data.user
                    if (nextUrl) router.push(nextUrl)
                    else if (user?.role === 'admin') { localStorage.setItem('isAdmin', 'true'); router.push('/admin/dashboard') }
                    else if (user?.role?.toLowerCase() === 'agent') {
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
                setError(err.response?.data?.detail || 'Google Login failed')
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

    const destinations = [
        { name: 'Santorini', emoji: '🏛️', style: { top: '12%', left: '6%' }, delay: 0.8 },
        { name: 'Bali', emoji: '🌴', style: { top: '28%', right: '4%' }, delay: 1.0 },
        { name: 'Maldives', emoji: '🏝️', style: { bottom: '32%', left: '3%' }, delay: 1.2 },
        { name: 'Paris', emoji: '🗼', style: { bottom: '18%', right: '5%' }, delay: 1.4 },
        { name: 'Tokyo', emoji: '🗾', style: { top: '55%', left: '5%' }, delay: 1.6 },
    ]

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ fontFamily: "'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif" }}>

            {/* ── Immersive Background ── */}
            <div className="absolute inset-0 z-0">
                {/* Sky gradient */}
                <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(160deg, #0f2c5e 0%, #1a4a8a 30%, #2d6cc4 55%, #e87d3e 80%, #f5a623 100%)' }} />

                {/* Ocean/horizon band */}
                <div className="absolute bottom-0 left-0 right-0 h-[38%]"
                    style={{ background: 'linear-gradient(to top, #0a1628 0%, #0d2347 40%, transparent 100%)' }} />

                {/* Animated clouds */}
                {[
                    { w: 220, h: 60, top: '8%', left: '-5%', delay: 0, dur: 28 },
                    { w: 160, h: 45, top: '16%', left: '30%', delay: 4, dur: 34 },
                    { w: 260, h: 70, top: '6%', right: '-8%', delay: 8, dur: 40 },
                    { w: 130, h: 38, top: '22%', right: '20%', delay: 12, dur: 30 },
                ].map((cloud, i) => (
                    <motion.div
                        key={i}
                        style={{
                            position: 'absolute',
                            top: cloud.top,
                            left: cloud.left,
                            right: cloud.right,
                            width: cloud.w,
                            height: cloud.h,
                            background: 'radial-gradient(ellipse, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)',
                            borderRadius: '50%',
                            filter: 'blur(8px)',
                        }}
                        animate={{ x: [0, 30, 0] }}
                        transition={{ duration: cloud.dur, repeat: Infinity, delay: cloud.delay, ease: 'easeInOut' }}
                    />
                ))}

                {/* Sun / golden orb */}
                <div className="absolute"
                    style={{
                        bottom: '33%', left: '50%', transform: 'translateX(-50%)',
                        width: 160, height: 160,
                        background: 'radial-gradient(circle, rgba(255,200,80,0.6) 0%, rgba(255,140,30,0.3) 40%, transparent 70%)',
                        borderRadius: '50%',
                        filter: 'blur(2px)',
                    }} />

                {/* Water shimmer */}
                <div className="absolute bottom-0 left-0 right-0 h-[36%] overflow-hidden">
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            style={{
                                position: 'absolute',
                                top: `${i * 14}%`,
                                left: '-10%',
                                width: '120%',
                                height: 2,
                                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.12) 70%, transparent 100%)',
                                borderRadius: 2,
                            }}
                            animate={{ x: ['-5%', '5%', '-5%'], opacity: [0.4, 0.8, 0.4] }}
                            transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                        />
                    ))}
                </div>

                {/* Stars (upper sky) */}
                {[...Array(30)].map((_, i) => (
                    <motion.div
                        key={`star-${i}`}
                        style={{
                            position: 'absolute',
                            top: `${Math.abs(Math.sin(i * 123.45)) * 45}%`,
                            left: `${Math.abs(Math.cos(i * 321.65)) * 100}%`,
                            width: Math.abs(Math.sin(i * 111)) * 2 + 1,
                            height: Math.abs(Math.cos(i * 222)) * 2 + 1,
                            background: 'white',
                            borderRadius: '50%',
                        }}
                        animate={{ opacity: [0.2, 0.9, 0.2] }}
                        transition={{ duration: 2 + Math.abs(Math.sin(i * 333)) * 3, repeat: Infinity, delay: Math.abs(Math.cos(i * 444)) * 4 }}
                    />
                ))}


                {/* Silhouette skyline */}
                <svg className="absolute bottom-[34%] left-0 w-full" viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none">
                    <path
                        d="M0 90 L0 60 L40 60 L40 40 L60 40 L60 20 L70 20 L70 10 L80 10 L80 20 L90 20 L90 40 L120 40 L120 55 L160 55 L160 30 L175 30 L175 15 L185 15 L185 30 L220 30 L220 55 L260 55 L260 45 L290 45 L290 25 L310 25 L310 10 L320 10 L320 5 L330 5 L330 10 L340 10 L340 25 L380 25 L380 50 L420 50 L420 35 L450 35 L450 50 L500 50 L500 40 L520 40 L520 20 L535 20 L535 8 L545 8 L545 20 L560 20 L560 40 L600 40 L600 55 L650 55 L650 35 L675 35 L675 15 L690 15 L690 35 L730 35 L730 55 L780 55 L780 42 L810 42 L810 28 L830 28 L830 42 L870 42 L870 58 L920 58 L920 38 L950 38 L950 22 L965 22 L965 38 L1000 38 L1000 58 L1050 58 L1050 45 L1080 45 L1080 30 L1100 30 L1100 45 L1140 45 L1140 60 L1200 60 L1200 42 L1230 42 L1230 55 L1280 55 L1280 40 L1310 40 L1310 20 L1325 20 L1325 40 L1360 40 L1360 60 L1440 60 L1440 90 Z"
                        fill="rgba(10,22,40,0.85)"
                    />
                </svg>

                {/* Subtle texture overlay */}
                <div className="absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px 200px' }} />
            </div>

            {/* ── Floating destination badges ── */}
            {destinations.map((d, i) => (
                <DestinationBadge key={i} name={d.name} emoji={d.emoji} style={d.style} delay={d.delay} />
            ))}

            {/* ── Animated Plane ── */}
            <motion.div
                className="absolute z-10 pointer-events-none"
                initial={{ x: -80, y: 80, opacity: 0 }}
                animate={{ x: ['-5vw', '108vw'], y: ['-2vh', '-18vh'], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 18, delay: 1.5, repeat: Infinity, repeatDelay: 12, ease: 'linear' }}
            >
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M44 20L8 4 10 22 28 24 10 26 8 44z" fill="white" opacity="0.9" />
                    <path d="M14 16L4 20 6 24 14 22z" fill="white" opacity="0.6" />
                    <path d="M14 32L4 28 6 24 14 26z" fill="white" opacity="0.6" />
                </svg>
            </motion.div>

            {/* ── Login Card ── */}
            <div className="relative z-30 w-full max-w-md px-4">

                {/* Brand above card */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-6"
                >
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #f5a623, #e87d3e)' }}>
                            <Compass className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight"
                            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                            RNT Tour
                        </span>
                    </div>
                    <p className="text-white/60 text-sm tracking-wide" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                        Your gateway to extraordinary journeys
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isShaking ? { x: [-8, 8, -8, 8, 0] } : { opacity: 1, y: 0, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                >
                    {/* Card */}
                    <div style={{
                        background: 'rgba(255,255,255,0.96)',
                        backdropFilter: 'blur(24px)',
                        borderRadius: 24,
                        boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.6)',
                        overflow: 'hidden',
                    }}>
                        {/* Thin color bar at top */}
                        <div style={{ height: 4, background: 'linear-gradient(90deg, #1a4a8a, #2d6cc4, #e87d3e, #f5a623)' }} />

                        <div className="px-8 py-8">
                            <AnimatePresence mode="wait">
                                {isSuccess ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-10 space-y-4"
                                    >
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: [0, 1.2, 1] }}
                                            transition={{ duration: 0.5, ease: 'easeOut' }}
                                            className="w-20 h-20 rounded-full flex items-center justify-center"
                                            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                                        >
                                            <CheckCircle className="w-10 h-10 text-white" />
                                        </motion.div>
                                        <h3 className="text-2xl font-bold text-gray-900">Welcome Back!</h3>
                                        <p className="text-gray-400 text-sm">Boarding your dashboard... ✈️</p>
                                        <div className="flex gap-1 pt-2">
                                            {[0, 0.15, 0.3].map((d, i) => (
                                                <motion.div key={i} className="w-2 h-2 rounded-full bg-blue-500"
                                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: d }} />
                                            ))}
                                        </div>
                                    </motion.div>
                                ) : !otpSent ? (
                                    <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
                                        <div className="mb-7">
                                            <h3 className="text-[22px] font-bold text-gray-900 tracking-tight">
                                                {agentInfo?.agency_name ? `Welcome to ${agentInfo.agency_name}` : 'Sign In'}
                                            </h3>
                                            <p className="text-sm text-gray-400 mt-1">Plan your next adventure</p>
                                        </div>

                                        <form onSubmit={handleLogin} className="space-y-5" noValidate>
                                            <AnimatePresence>
                                                {error && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 flex items-center gap-2"
                                                    >
                                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium">{error}</span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Email */}
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-0.5">Email Address</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <Mail className={cn("h-4.5 w-4.5 transition-colors",
                                                            emailValid === false ? "text-red-400" :
                                                                emailValid === true ? "text-emerald-500" : "text-gray-300 group-focus-within:text-blue-500"
                                                        )} />
                                                    </div>
                                                    <Input
                                                        id="email" type="email" value={email}
                                                        onChange={handleEmailChange} onBlur={handleEmailBlur}
                                                        placeholder="you@example.com" required
                                                        className={cn(
                                                            "glass-input h-12 pl-10 pr-10 rounded-xl border-white/20 bg-white/40 text-gray-800 placeholder:text-gray-500 focus:bg-white/60 focus:ring-2 text-sm transition-all",
                                                            emailValid === false && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/60",
                                                            emailValid === true && "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                                                        )}
                                                    />
                                                    {emailValid === true && (
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                        </motion.div>
                                                    )}
                                                </div>
                                                <AnimatePresence>
                                                    {emailValid === false && (
                                                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                                            className="text-xs text-red-500 ml-0.5">
                                                            Please enter a valid email address
                                                        </motion.p>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Password */}
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-0.5">Password</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <Lock className="h-4.5 w-4.5 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                                                    </div>
                                                    <Input
                                                        id="password" type={showPassword ? "text" : "password"}
                                                        value={password} onChange={(e) => setPassword(e.target.value)}
                                                        placeholder="••••••••" required
                                                        className="glass-input h-12 pl-10 pr-10 rounded-xl border-white/20 bg-white/40 text-gray-800 placeholder:text-gray-500 focus:bg-white/60 focus:ring-2 focus:ring-blue-100 text-sm transition-all"
                                                    />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-300 hover:text-gray-500 transition-colors focus:outline-none">
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Remember / Forgot */}
                                            <div className="flex items-center justify-between pt-0.5">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox id="remember-me" checked={rememberMe}
                                                        onCheckedChange={(c) => setRememberMe(c as boolean)}
                                                        className="border-gray-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                                                    <label htmlFor="remember-me" className="text-sm text-gray-500 cursor-pointer select-none">Remember me</label>
                                                </div>
                                                <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                                                    Forgot password?
                                                </Link>
                                            </div>

                                            {/* Sign In button */}
                                            <Button type="submit" disabled={loading}
                                                className="w-full h-12 text-sm font-bold rounded-xl shadow-lg transition-all duration-200 mt-1"
                                                style={{ background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1a4a8a, #2d6cc4)', boxShadow: loading ? 'none' : '0 8px 24px rgba(45,108,196,0.35)' }}>
                                                {loading ? (
                                                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Authenticating...</span>
                                                ) : (
                                                    <span className="flex items-center gap-2">Sign In <span className="text-base">→</span></span>
                                                )}
                                            </Button>

                                            {/* Divider */}
                                            <div className="relative my-5">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-gray-100" />
                                                </div>
                                                <div className="relative flex justify-center">
                                                    <span className="bg-white px-3 text-[11px] text-gray-400 uppercase tracking-widest font-semibold">or</span>
                                                </div>
                                            </div>

                                            {/* Google */}
                                            <Button type="button" variant="outline" onClick={() => googleLogin()} disabled={loading}
                                                className="glass-button w-full h-12 text-sm font-semibold hover:bg-white/50 text-gray-700 border-white/30 rounded-xl flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all">
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-5 w-5" />}
                                                Continue with Google
                                            </Button>

                                            {/* Register link */}
                                            <div className="text-center text-sm text-gray-400 pt-2 border-t border-gray-100 mt-2">
                                                New traveler?{' '}
                                                <Link href="/register" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                                    Create account
                                                </Link>
                                                <div className="mt-2 text-xs">
                                                    Are you an agent?{' '}
                                                    <Link href="/register/agent" className="font-bold text-slate-600 hover:text-slate-800 transition-colors">
                                                        Register as Agent
                                                    </Link>
                                                </div>
                                            </div>
                                        </form>
                                    </motion.div>
                                ) : (
                                    <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                        <div className="mb-7">
                                            <div className="flex items-center gap-3 mb-1">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                    style={{ background: 'linear-gradient(135deg, #1a4a8a, #2d6cc4)' }}>
                                                    <Lock className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-[20px] font-bold text-gray-900 tracking-tight">Verify Identity</h3>
                                                    <p className="text-xs text-gray-400">Almost there — final security check</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-3 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                                                Code sent to <span className="font-semibold text-gray-700">{email}</span>
                                            </p>
                                        </div>

                                        <form onSubmit={handleVerifyOTP} className="space-y-5">
                                            <AnimatePresence>
                                                {otpError && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                        className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium">{otpError}</span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-0.5">One-Time Password</label>
                                                <Input
                                                    id="otp" type="text" value={otp}
                                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    placeholder="000000" maxLength={6}
                                                    className="glass-input h-16 text-center text-3xl font-bold tracking-[0.6em] border-white/20 bg-white/40 text-gray-800 focus:bg-white/60 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all"
                                                    autoComplete="one-time-code"
                                                />
                                                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>Expires in <span className="font-semibold text-gray-600">{getTimeRemaining()}</span></span>
                                                </div>
                                                {/* OTP progress dots */}
                                                <div className="flex justify-center gap-2 pt-1">
                                                    {[...Array(6)].map((_, i) => (
                                                        <div key={i} className={cn(
                                                            "w-2 h-2 rounded-full transition-all duration-200",
                                                            i < otp.length ? "bg-blue-600 scale-110" : "bg-gray-200"
                                                        )} />
                                                    ))}
                                                </div>
                                            </div>

                                            <Button type="submit"
                                                disabled={otpLoading || otp.length !== 6}
                                                className="w-full h-12 text-sm font-bold rounded-xl"
                                                style={{ background: otp.length === 6 ? 'linear-gradient(135deg, #1a4a8a, #2d6cc4)' : '#e5e7eb', color: otp.length === 6 ? 'white' : '#9ca3af', boxShadow: otp.length === 6 ? '0 8px 24px rgba(45,108,196,0.35)' : 'none' }}>
                                                {otpLoading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Verifying...</span> : 'Verify & Board'}
                                            </Button>

                                            <div className="text-center text-sm">
                                                <span className="text-gray-400">Didn't receive it? </span>
                                                <button type="button" onClick={handleResendOTP}
                                                    disabled={resendCooldown > 0 || loading}
                                                    className={cn("font-semibold transition-colors",
                                                        resendCooldown > 0 || loading ? "text-gray-300 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 hover:underline"
                                                    )}>
                                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                                </button>
                                            </div>

                                            <button type="button" onClick={handleBackToStep1}
                                                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors pt-1">
                                                <ArrowLeft className="w-4 h-4" />
                                                Back to login
                                            </button>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                {/* Bottom trust bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="flex items-center justify-center gap-5 mt-5"
                >
                    {[
                        { icon: Globe, label: '50+ Destinations' },
                        { icon: MapPin, label: 'Live Support' },
                        { icon: Wind, label: 'Best Fares' },
                    ].map(({ icon: Icon, label }, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-white/50" />
                            <span className="text-[11px] text-white/50 font-medium">{label}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
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