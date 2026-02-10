'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { authAPI } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Plane, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowLeft, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const nextUrl = searchParams.get('next')

    // Step 1: Email & Password
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [agentInfo, setAgentInfo] = useState<{ agency_name: string | null; agent_name: string | null } | null>(null)

    // Step 2: OTP
    const [otpSent, setOtpSent] = useState(false)
    const [otp, setOtp] = useState('')
    const [otpError, setOtpError] = useState('')
    const [otpLoading, setOtpLoading] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null)

    // UI States
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
                if (info && info.agency_name) {
                    setAgentInfo(info)
                }
            } catch (error) {
                console.error("Failed to load agent info", error)
            }
        }
        fetchAgentInfo()
    }, [])

    // Countdown timers
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    useEffect(() => {
        if (otpExpiresAt) {
            const timer = setInterval(() => {
                const remaining = Math.max(0, otpExpiresAt - Date.now())
                if (remaining === 0) {
                    clearInterval(timer)
                }
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [otpExpiresAt])

    // Email validation
    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setEmail(val)
        if (emailTouched) {
            setEmailValid(validateEmail(val))
        }
    }

    const handleEmailBlur = () => {
        setEmailTouched(true)
        setEmailValid(validateEmail(email))
    }

    // Unified Login Handler
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setOtpError('')

        if (!validateEmail(email)) {
            setEmailTouched(true)
            setEmailValid(false)
            setIsShaking(true)
            setTimeout(() => setIsShaking(false), 500)
            return
        }

        setLoading(true)
        console.log("DEBUG: Starting login for", email)

        try {
            // Unified login call
            const response = await authAPI.login(email, password)
            console.log("DEBUG: Login response received", response)

            if (response.require_otp) {
                console.log("DEBUG: OTP required, switching to Step 2")
                setOtpExpiresAt(Date.now() + (response.expires_in || 300) * 1000)
                setResendCooldown(60)
                setOtpSent(true)
                setLoading(false)
            } else {
                console.log("DEBUG: Direct login successful, storage and redirecting")
                localStorage.setItem('token', response.access_token)
                localStorage.setItem('user', JSON.stringify(response.user))

                setIsSuccess(true)

                setTimeout(() => {
                    const user = response.user
                    if (nextUrl) {
                        router.push(nextUrl)
                    } else if (user?.role === 'admin') {
                        localStorage.setItem('isAdmin', 'true')
                        router.push('/admin/dashboard')
                    } else if (user?.role === 'agent') {
                        router.push('/agent/dashboard')
                    } else {
                        router.push('/')
                    }
                }, 800)
            }
        } catch (err: any) {
            console.error("DEBUG: Login error", err)
            setError(err.response?.data?.detail || err.message || 'Invalid email or password')
            setIsShaking(true)
            setTimeout(() => setIsShaking(false), 500)
            setLoading(false)
        } finally {
            // Safety net: ensure loading is false if not handled above
            // But we only want to set it to false if we're not success or otpSent
            setTimeout(() => {
                setLoading(prev => {
                    if (prev) console.log("DEBUG: Resetting loading state in finally")
                    return false
                })
            }, 5000) // 5s timeout safety
        }
    }

    // Step 2: Verify OTP
    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        setOtpError('')

        if (otp.length !== 6) {
            setOtpError('Please enter a 6-digit OTP')
            setIsShaking(true)
            setTimeout(() => setIsShaking(false), 500)
            return
        }

        setOtpLoading(true)

        try {
            const data = await authAPI.verifyLoginOTP(email, otp)
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify(data.user))

            setIsSuccess(true)

            // Delay redirect slightly to show success animation
            setTimeout(() => {
                if (nextUrl) {
                    router.push(nextUrl)
                } else if (data.user.role === 'admin') {
                    localStorage.setItem('isAdmin', 'true')
                    router.push('/admin/dashboard')
                } else if (data.user.role === 'agent') {
                    router.push('/agent/dashboard')
                } else {
                    router.push('/')
                }
            }, 800)

        } catch (err: any) {
            setOtpError(err.response?.data?.detail || 'Invalid or expired OTP')
            setIsShaking(true)
            setTimeout(() => setIsShaking(false), 500)
            setOtpLoading(false)
        }
    }

    // Resend OTP
    const handleResendOTP = async () => {
        if (resendCooldown > 0) return

        setOtpError('')
        setLoading(true)

        try {
            const response = await authAPI.sendLoginOTP(email, password)
            setOtpExpiresAt(Date.now() + response.expires_in * 1000)
            setResendCooldown(60)
            setOtp('') // Clear OTP input
            setLoading(false)
        } catch (err: any) {
            setOtpError(err.response?.data?.detail || 'Failed to resend OTP')
            setLoading(false)
        }
    }

    // Back to Step 1
    const handleBackToStep1 = () => {
        setOtpSent(false)
        setOtp('')
        setOtpError('')
        setOtpExpiresAt(null)
        setResendCooldown(0)
    }

    // Calculate time remaining
    const getTimeRemaining = () => {
        if (!otpExpiresAt) return '5:00'
        const remaining = Math.max(0, otpExpiresAt - Date.now())
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/30 blur-3xl" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-100/30 blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full space-y-8 relative"
            >
                <motion.div
                    animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                >
                    <Card className="shadow-xl shadow-blue-500/5 rounded-2xl border-0 overflow-hidden ring-1 ring-gray-100">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white relative">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mx-auto bg-white/20 backdrop-blur-sm p-3 rounded-full w-fit mb-4 shadow-lg ring-1 ring-white/30"
                            >
                                <Plane className="w-8 h-8 text-white" fill="currentColor" fillOpacity={0.2} />
                            </motion.div>
                            <h2 className="text-3xl font-bold tracking-tight">RNT Tour</h2>
                            <p className="text-blue-100 mt-2 font-medium">
                                {otpSent ? 'Verify Your Identity' : 'Your Travel Companion'}
                            </p>
                        </div>

                        <CardContent className="pt-8 px-8 pb-8">
                            <AnimatePresence mode="wait">
                                {isSuccess ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-10 space-y-4"
                                    >
                                        <div className="p-4 bg-green-100 rounded-full text-green-600">
                                            <CheckCircle className="w-16 h-16" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">Welcome Back!</h3>
                                        <p className="text-gray-500">Redirecting you to dashboard...</p>
                                    </motion.div>
                                ) : !otpSent ? (
                                    // Step 1: Email & Password
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <div className="mb-6 text-center">
                                            <h3 className="text-xl font-semibold text-gray-900">
                                                {agentInfo?.agency_name ? `Welcome to ${agentInfo.agency_name}` : 'Welcome Back'}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Enter your credentials to continue
                                            </p>
                                        </div>

                                        <form onSubmit={handleLogin} className="space-y-5" noValidate>
                                            <AnimatePresence>
                                                {error && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center gap-2 overflow-hidden"
                                                    >
                                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium">{error}</span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="space-y-1.5">
                                                <label htmlFor="email" className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Mail className={cn(
                                                            "h-5 w-5 transition-colors",
                                                            emailValid === false ? "text-red-400" :
                                                                emailValid === true ? "text-green-500" : "text-gray-400 group-focus-within:text-blue-500"
                                                        )} aria-hidden="true" />
                                                    </div>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        value={email}
                                                        onChange={handleEmailChange}
                                                        onBlur={handleEmailBlur}
                                                        placeholder="name@example.com"
                                                        required
                                                        aria-invalid={emailValid === false}
                                                        aria-describedby={emailValid === false ? "email-error" : undefined}
                                                        className={cn(
                                                            "h-12 pl-10 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl",
                                                            emailValid === false && "border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/10",
                                                            emailValid === true && "border-green-300 focus:border-green-500 focus:ring-green-500/20 bg-green-50/10"
                                                        )}
                                                    />
                                                    {emailValid === true && (
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                        </motion.div>
                                                    )}
                                                    {emailValid === false && (
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                                        </motion.div>
                                                    )}
                                                </div>
                                                <AnimatePresence>
                                                    {emailValid === false && (
                                                        <motion.p
                                                            id="email-error"
                                                            initial={{ opacity: 0, y: -5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="text-xs text-red-500 ml-1"
                                                        >
                                                            Please enter a valid email address
                                                        </motion.p>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label htmlFor="password" className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Password</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" aria-hidden="true" />
                                                    </div>
                                                    <Input
                                                        id="password"
                                                        type={showPassword ? "text" : "password"}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        placeholder="••••••••"
                                                        required
                                                        className="h-12 pl-10 pr-10 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-5 w-5" />
                                                        ) : (
                                                            <Eye className="h-5 w-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="remember-me"
                                                        checked={rememberMe}
                                                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                                        className="border-gray-300 text-blue-600 focus:ring-blue-500 rounded-sm data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                    />
                                                    <label
                                                        htmlFor="remember-me"
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-500 cursor-pointer select-none"
                                                    >
                                                        Remember me
                                                    </label>
                                                </div>
                                                <Link
                                                    href="/forgot-password"
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm"
                                                >
                                                    Forgot password?
                                                </Link>
                                            </div>

                                            <Button
                                                type="submit"
                                                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 rounded-xl mt-4"
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <div className="flex items-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <span>Authenticating...</span>
                                                    </div>
                                                ) : 'Sign In'}
                                            </Button>

                                            <div className="text-center text-sm pt-4 border-t">
                                                <span className="text-gray-500">Don't have an account? </span>
                                                <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm">
                                                    Create account
                                                </Link>
                                            </div>
                                        </form>
                                    </motion.div>
                                ) : (
                                    // Step 2: OTP Verification
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <div className="mb-6 text-center">
                                            <h3 className="text-xl font-semibold text-gray-900">Enter OTP</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                We've sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>
                                            </p>
                                        </div>

                                        <form onSubmit={handleVerifyOTP} className="space-y-5">
                                            <AnimatePresence>
                                                {otpError && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center gap-2 overflow-hidden"
                                                    >
                                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium">{otpError}</span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="space-y-3">
                                                <label htmlFor="otp" className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                                                    One-Time Password
                                                </label>
                                                <Input
                                                    id="otp"
                                                    type="text"
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    placeholder="000000"
                                                    maxLength={6}
                                                    className="h-14 text-center text-2xl font-bold tracking-[0.5em] border-gray-200 bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl"
                                                    autoComplete="one-time-code"
                                                />

                                                {/* Timer */}
                                                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                                    <Clock className="w-4 h-4" />
                                                    <span>Expires in {getTimeRemaining()}</span>
                                                </div>
                                            </div>

                                            <Button
                                                type="submit"
                                                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 rounded-xl"
                                                disabled={otpLoading || otp.length !== 6}
                                            >
                                                {otpLoading ? (
                                                    <div className="flex items-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <span>Verifying...</span>
                                                    </div>
                                                ) : 'Verify OTP'}
                                            </Button>

                                            {/* Resend OTP */}
                                            <div className="text-center text-sm">
                                                <span className="text-gray-500">Didn't receive the code? </span>
                                                <button
                                                    type="button"
                                                    onClick={handleResendOTP}
                                                    disabled={resendCooldown > 0 || loading}
                                                    className={cn(
                                                        "font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm",
                                                        resendCooldown > 0 || loading
                                                            ? "text-gray-400 cursor-not-allowed"
                                                            : "text-blue-600 hover:text-blue-700 hover:underline"
                                                    )}
                                                >
                                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                                                </button>
                                            </div>

                                            {/* Back Button */}
                                            <button
                                                type="button"
                                                onClick={handleBackToStep1}
                                                className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors pt-2"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back to login</span>
                                            </button>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Dev Helper - Styled neatly */}
            {!otpSent && (
                <div className="mx-auto max-w-xs text-center">
                    <div className="bg-white/50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 backdrop-blur-sm">
                        <p className="font-semibold text-gray-700 mb-1">Demo Credentials:</p>
                        <div className="font-mono bg-gray-100/50 rounded p-1 inline-block text-left px-3">
                            <div>user: john.doe@example.com</div>
                            <div>pass: password123</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
