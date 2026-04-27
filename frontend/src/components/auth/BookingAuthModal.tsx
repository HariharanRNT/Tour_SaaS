'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, Eye, EyeOff, Loader2, Check, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authAPI } from '@/lib/api'
import { useGoogleLogin } from '@react-oauth/google'
import { cn, formatError } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

interface BookingAuthModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    initialTab?: Tab
}

type Tab = 'login' | 'register' | 'forgot'

export function BookingAuthModal({ isOpen, onClose, onSuccess, initialTab = 'login' }: BookingAuthModalProps) {
    const { login: authLogin } = useAuth()
    const [activeTab, setActiveTab] = useState<Tab>(initialTab)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Form states
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')

    // New OTP states
    const [requireOtp, setRequireOtp] = useState(false)
    const [otp, setOtp] = useState('')
    const [otpError, setOtpError] = useState('')
    const [resendCooldown, setResendCooldown] = useState(0)
    const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null)
    const [registrationSuccess, setRegistrationSuccess] = useState(false)
    const [forgotSuccess, setForgotSuccess] = useState(false)
    const [requireResetOtp, setRequireResetOtp] = useState(false)
    const [requireNewPassword, setRequireNewPassword] = useState(false)
    const [resetToken, setResetToken] = useState('')
    const [resetPassword, setResetPassword] = useState('')
    const [confirmResetPassword, setConfirmResetPassword] = useState('')

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab)
        }
        if (!isOpen) {
            setError('')
            setOtpError('')
            setLoading(false)
            setRequireOtp(false)
            setOtp('')
            setOtpExpiresAt(null)
            setResendCooldown(0)
            setFirstName('')
            setLastName('')
            setRegistrationSuccess(false)
            setForgotSuccess(false)
            setRequireResetOtp(false)
            setRequireNewPassword(false)
            setResetToken('')
            setResetPassword('')
            setConfirmResetPassword('')
            // Optional: reset fields if desired
        }
    }, [isOpen])

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

    // Close on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!validateEmail(email)) return setError('Please enter a valid email')
        if (!password) return setError('Please enter your password')

        setLoading(true)
        try {
            const response = await authAPI.login(email, password)
            if (response.require_otp) {
                setRequireOtp(true)
                if (response.email) setEmail(response.email)
                setOtpExpiresAt(Date.now() + (response.expires_in || 300) * 1000)
                setResendCooldown(60)
            } else {
                authLogin(response.access_token, response.user)
                onClose()
                
                // Handle success actions
                if (onSuccess) onSuccess()
                
                // Handle redirection
                const redirect = sessionStorage.getItem('redirectAfterLogin')
                if (redirect) {
                    sessionStorage.removeItem('redirectAfterLogin')
                    window.location.href = redirect
                }
            }
        } catch (err: any) {
            setError(formatError(err))
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        setOtpError('')
        if (otp.length !== 6) return setOtpError('Please enter a 6-digit OTP')
        
        setLoading(true)
        try {
            const data = await authAPI.verifyLoginOTP(email, otp)
            authLogin(data.access_token, data.user)
            onClose()
            if (onSuccess) onSuccess()
        } catch (err: any) {
            setOtpError(formatError(err))
        } finally {
            setLoading(false)
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
        } catch (err: any) {
            setOtpError(formatError(err))
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!validateEmail(email)) return setError('Invalid email address')
        if (!firstName.trim()) return setError('First name is required')
        if (!lastName.trim()) return setError('Last name is required')
        if (password.length < 8) return setError('Password must be at least 8 characters')
        if (password !== confirmPassword) return setError('Passwords do not match')

        setLoading(true)
        try {
            const data = await authAPI.register({
                email,
                password,
                first_name: firstName,
                last_name: lastName
            })
            
            setRegistrationSuccess(true)
            
            // Allow user to see the success message before proceeding
            setTimeout(() => {
                authLogin(data.access_token, data.user)
                if (onSuccess) onSuccess()
            }, 1500)
        } catch (err: any) {
            setError(formatError(err))
            setLoading(false)
        }
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!validateEmail(email)) return setError('Please enter a valid email')

        setLoading(true)
        try {
            await authAPI.forgotPassword(email)
            setRequireResetOtp(true)
            setOtp('')
        } catch (err: any) {
            setError(formatError(err))
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyResetOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (otp.length !== 6) return setError('Please enter a 6-digit OTP')

        setLoading(true)
        try {
            const data = await authAPI.verifyOTP(email, otp)
            setResetToken(data.token)
            setRequireNewPassword(true)
            setRequireResetOtp(false)
        } catch (err: any) {
            setError(formatError(err))
        } finally {
            setLoading(false)
        }
    }

    const handleResetPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (resetPassword.length < 8) return setError('Password must be at least 8 characters')
        if (resetPassword !== confirmResetPassword) return setError('Passwords do not match')

        setLoading(true)
        try {
            await authAPI.resetPassword({
                token: resetToken,
                email,
                new_password: resetPassword,
                confirm_password: confirmResetPassword
            })
            setForgotSuccess(true)
            setRequireNewPassword(false)
        } catch (err: any) {
            setError(formatError(err))
        } finally {
            setLoading(false)
        }
    }

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true)
            try {
                const data = await authAPI.googleLogin(tokenResponse.access_token)
                authLogin(data.access_token, data.user)
                if (onSuccess) onSuccess()
            } catch (err: any) {
                setError(formatError(err))
            } finally {
                setLoading(false)
            }
        },
        onError: () => setError('Google login failed')
    })

    const getPasswordRequirements = () => [
        { label: '8+ chars', valid: password.length >= 8 },
        { label: 'Match', valid: password === confirmPassword && password.length > 0 }
    ]

    const getTimeRemaining = () => {
        if (!otpExpiresAt) return '5:00'
        const remaining = Math.max(0, otpExpiresAt - Date.now())
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with Peach/Orange Blur */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary-light)]/30 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-[420px] max-h-[90vh] bg-white/10 backdrop-blur-[24px] rounded-[24px] border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-y-auto scrollbar-none"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-black/10 hover:bg-black/20 text-black transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 md:p-8">
                    <div className="text-center mb-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] text-white shadow-lg shadow-[var(--primary)]/30 mb-2 ring-4 ring-white/10">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h2 className="text-[18px] font-bold text-black tracking-tight">Complete Booking</h2>
                        <p className="text-black/70 text-[13px] mt-0.5">Sign in to secure your adventure</p>
                    </div>

                    {/* Tabs */}
                    {!requireOtp && activeTab !== 'forgot' && (
                        <div className="flex p-1 bg-white/10 rounded-2xl mb-4 border border-white/10">
                            {(['login', 'register'] as Tab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setError(''); }}
                                    className={cn(
                                        "flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-300",
                                        activeTab === tab
                                            ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white shadow-md"
                                            : "text-black/60 hover:text-black hover:bg-white/5"
                                    )}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {registrationSuccess ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-12 text-center space-y-4"
                            >
                                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-black">Welcome Aboard!</h3>
                                <p className="text-black/70 text-sm">Account created! Now continue to book.</p>
                                <div className="pt-4 flex justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                                </div>
                            </motion.div>
                        ) : forgotSuccess ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-8 text-center space-y-4"
                            >
                                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-black">Password Reset!</h3>
                                <p className="text-black/70 text-sm px-6">Your password has been successfully reset. You can now login with your new password.</p>
                                <Button 
                                    onClick={() => { 
                                        setForgotSuccess(false); 
                                        setActiveTab('login'); 
                                        setPassword('');
                                    }}
                                    className="mt-4 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white border-0 rounded-xl px-8"
                                >
                                    Login Now
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={requireOtp || requireResetOtp || requireNewPassword ? 'form-special' : activeTab}
                                initial={{ opacity: 0, x: activeTab === 'login' && !requireOtp ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: activeTab === 'login' && !requireOtp ? 20 : -20 }}
                                transition={{ duration: 0.2 }}
                            >
                            {(error || otpError) && (
                                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-800 text-xs animate-shake">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error || otpError}</span>
                                </div>
                            )}

                            {requireOtp ? (
                                <form onSubmit={handleVerifyOTP} className="space-y-4">
                                    <div className="text-center mb-6">
                                        <p className="text-sm text-black/80">Enter the verification code sent to <strong className="text-black">{email}</strong></p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">6-Digit Code</label>
                                        <div className="relative group">
                                            <Input
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                className="bg-white/10 border-white/20 text-black rounded-xl h-12 pl-10 text-center text-xl tracking-[0.5em] font-bold focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                                placeholder="••••••"
                                                required
                                            />
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30 group-focus-within:text-black" />
                                        </div>
                                    </div>
                                    
                                    <Button
                                        type="submit"
                                        disabled={loading || otp.length !== 6}
                                        className="w-full h-12 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
                                    </Button>

                                    <div className="text-center mt-6 flex flex-col items-center gap-2">
                                        <p className="text-sm text-black/70">
                                            Didn&apos;t receive code?
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleResendOTP}
                                            disabled={resendCooldown > 0 || loading}
                                            className="text-black font-bold text-sm hover:underline disabled:opacity-50 disabled:hover:no-underline flex items-center justify-center gap-2"
                                        >
                                            {resendCooldown > 0 ? (
                                                `Resend in ${resendCooldown}s`
                                            ) : (
                                                'Resend OTP'
                                            )}
                                        </button>
                                        <div className="text-[10px] text-black/40 font-mono tracking-wider mt-2 bg-black/5 px-3 py-1 rounded-full">
                                            Code valid for: {getTimeRemaining()}
                                        </div>
                                    </div>
                                </form>
                            ) : activeTab === 'forgot' ? (
                                <>
                                    {requireResetOtp ? (
                                        <form onSubmit={handleVerifyResetOTP} className="space-y-4">
                                            <div className="text-center mb-6">
                                                <p className="text-sm text-black/80">Enter the reset code sent to <strong className="text-black">{email}</strong></p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">6-Digit Code</label>
                                                <div className="relative group">
                                                    <Input
                                                        value={otp}
                                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                        className="bg-white/10 border-white/20 text-black rounded-xl h-12 pl-10 text-center text-xl tracking-[0.5em] font-bold focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                                        placeholder="••••••"
                                                        required
                                                    />
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30 group-focus-within:text-black" />
                                                </div>
                                            </div>
                                            
                                            <Button
                                                type="submit"
                                                disabled={loading || otp.length !== 6}
                                                className="w-full h-12 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Reset Code'}
                                            </Button>

                                            <div className="text-center mt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setRequireResetOtp(false)}
                                                    className="text-black font-bold text-xs hover:underline flex items-center justify-center gap-1 mx-auto"
                                                >
                                                    Change Email
                                                </button>
                                            </div>
                                        </form>
                                    ) : requireNewPassword ? (
                                        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                                            <div className="text-center mb-4">
                                                <p className="text-sm text-black/80 font-medium">Create New Password</p>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">New Password</label>
                                                    <div className="relative group">
                                                        <Input
                                                            type="password"
                                                            value={resetPassword}
                                                            onChange={(e) => setResetPassword(e.target.value)}
                                                            className="bg-white/10 border-white/20 text-black rounded-xl h-11 pl-10 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                                            placeholder="••••••••"
                                                            required
                                                        />
                                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 group-focus-within:text-black" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">Confirm New Password</label>
                                                    <div className="relative group">
                                                        <Input
                                                            type="password"
                                                            value={confirmResetPassword}
                                                            onChange={(e) => setConfirmResetPassword(e.target.value)}
                                                            className="bg-white/10 border-white/20 text-black rounded-xl h-11 pl-10 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                                            placeholder="••••••••"
                                                            required
                                                        />
                                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 group-focus-within:text-black" />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <Button
                                                type="submit"
                                                disabled={loading || resetPassword.length < 8}
                                                className="w-full h-12 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 mt-2"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                                            </Button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleForgotPassword} className="space-y-4">
                                            <div className="text-center mb-6 px-4">
                                                <p className="text-sm text-black/80 font-medium">Reset your password</p>
                                                <p className="text-xs text-black/50 mt-1">Enter your email and we'll send you an OTP to reset your password.</p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">Email ID</label>
                                                <div className="relative group">
                                                    <Input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="bg-white/10 border-white/20 text-black rounded-xl h-12 pl-10 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                                        placeholder="traveler@example.com"
                                                        required
                                                    />
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 group-focus-within:text-black" />
                                                </div>
                                            </div>
                                            
                                            <Button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full h-12 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                                            </Button>

                                            <div className="text-center mt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('login')}
                                                    className="text-black font-bold text-xs hover:underline flex items-center justify-center gap-1 mx-auto"
                                                >
                                                    <ArrowLeft className="w-3 h-3" /> Back to Login
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </>
                            ) : (
                                <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="space-y-3">
                                    {activeTab === 'register' && (
                                        <div className="grid grid-cols-2 gap-3 mb-1">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">First Name</label>
                                                <div className="relative group">
                                                    <Input
                                                        value={firstName}
                                                        onChange={(e) => setFirstName(e.target.value)}
                                                        className="bg-white/10 border-white/20 text-black rounded-xl h-10 pl-3 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                                        placeholder="John"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">Last Name</label>
                                                <div className="relative group">
                                                    <Input
                                                        value={lastName}
                                                        onChange={(e) => setLastName(e.target.value)}
                                                        className="bg-white/10 border-white/20 text-black rounded-xl h-10 pl-3 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                                        placeholder="Doe"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">Email ID</label>
                                    <div className="relative group">
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-white/10 border-white/20 text-black rounded-xl h-10 pl-10 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                            placeholder="traveler@example.com"
                                        />
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 group-focus-within:text-black" />
                                    </div>
                                </div>

                                <div className="space-y-1 text-black">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Password</label>
                                        {activeTab === 'login' && (
                                            <button 
                                                type="button" 
                                                onClick={() => { setActiveTab('forgot'); setError(''); }}
                                                className="text-[10px] font-bold text-black hover:underline uppercase tracking-tight cursor-pointer relative z-10"
                                            >
                                                Forgot?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="bg-white/10 border-white/20 text-black rounded-xl h-10 pl-10 pr-10 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                            placeholder="••••••••"
                                        />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 group-focus-within:text-black" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {activeTab === 'register' && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">Confirm Password</label>
                                            <div className="relative group">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="bg-white/10 border-white/20 text-black rounded-xl h-10 pl-10 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                                    placeholder="••••••••"
                                                />
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 group-focus-within:text-black" />
                                            </div>
                                        </div>

                                        {/* Password Strength Bar */}
                                        <div className="flex gap-1 h-1.5 mt-2 px-1">
                                            {[1, 2, 3, 4].map((level) => {
                                                const strength =
                                                    (password.length >= 8 ? 1 : 0) +
                                                    (/[A-Z]/.test(password) ? 1 : 0) +
                                                    (/[0-9]/.test(password) ? 1 : 0) +
                                                    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
                                                return (
                                                    <div
                                                        key={level}
                                                        className={cn(
                                                            "h-full flex-1 rounded-full transition-all duration-500",
                                                            strength >= level ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]" : "bg-white/5"
                                                        )}
                                                    />
                                                );
                                            })}
                                        </div>

                                        <div className="flex flex-wrap gap-2 px-1 pt-1 opacity-80 mb-2">
                                            {getPasswordRequirements().map((req, i) => (
                                                <div key={i} className={cn("flex items-center gap-1 text-[11px] font-bold tracking-tight", req.valid ? "text-green-600" : "text-black/40")}>
                                                    {req.valid ? <Check className="w-3 h-3" /> : <div className="w-1 h-1 rounded-full bg-black/20" />}
                                                    {req.label}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-11 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white font-bold rounded-2xl shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 border border-white/10"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        activeTab === 'login' ? 'Login to Continue' : 'Create Account'
                                    )}
                                </Button>
                            </form>
                        )}
                        </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold text-black/30"><span className="bg-transparent px-3">secure social sign-in</span></div>
                    </div>

                    <Button
                        onClick={() => googleLogin()}
                        disabled={loading}
                        variant="outline"
                        className="w-full h-10 bg-black/5 border-black/10 text-black hover:bg-black/10 rounded-2xl transition-all font-bold flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M12 5.04c1.86 0 3.53.64 4.84 1.89l3.63-3.63C18.23 1.23 15.35 0 12 0 7.31 0 3.32 2.69 1.41 6.63l4.24 3.29C6.65 7.15 9.1 5.04 12 5.04z" />
                            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.21-2.35H12v4.45h6.44c-.28 1.51-1.12 2.78-2.4 3.63l3.72 2.88c2.18-2 3.44-4.94 3.44-8.31z" />
                            <path fill="#FBBC05" d="M5.65 14.61c-.24-.72-.38-1.48-.38-2.28s.14-1.56.38-2.28L1.41 6.63c-.92 1.89-1.41 4.02-1.41 6.2s.49 4.31 1.41 6.2l4.24-3.29z" />
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.72-2.88c-1.1.74-2.51 1.18-4.22 1.18-3.23 0-5.97-2.18-6.95-5.12L.84 17.56C2.75 21.31 6.54 24 12 24z" />
                        </svg>
                        Continue with Google
                    </Button>
                </div>

                {/* Footer Section */}
                <div className="bg-white/5 border-t border-white/10 px-6 py-4 text-center">
                    <p className="text-[10px] text-black/40 font-bold uppercase tracking-wider">
                        {activeTab === 'forgot' 
                            ? "Remember your password? " 
                            : activeTab === 'login' 
                                ? "New around here? " 
                                : "Already have an account? "}
                        <button
                            onClick={() => { 
                                setActiveTab(activeTab === 'register' ? 'login' : activeTab === 'forgot' ? 'login' : 'register'); 
                                setError(''); 
                            }}
                            className="text-black hover:underline"
                        >
                            {activeTab === 'forgot' 
                                ? "Back to Login" 
                                : activeTab === 'login' 
                                     ? "Join the adventure" 
                                     : "Welcome back"}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
