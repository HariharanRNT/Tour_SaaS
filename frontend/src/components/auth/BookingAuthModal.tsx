'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, Eye, EyeOff, Loader2, User, Check, AlertCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authAPI } from '@/lib/api'
import { useGoogleLogin } from '@react-oauth/google'
import { cn } from '@/lib/utils'

interface BookingAuthModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

type Tab = 'login' | 'register'

export function BookingAuthModal({ isOpen, onClose, onSuccess }: BookingAuthModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Form states
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setError('')
            setLoading(false)
            // Optional: reset fields if desired
        }
    }, [isOpen])

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
            localStorage.setItem('token', response.access_token)
            localStorage.setItem('user', JSON.stringify(response.user))
            onSuccess()
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!validateEmail(email)) return setError('Invalid email address')
        if (!firstName || !lastName) return setError('First and last name are required')
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
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify(data.user))
            onSuccess()
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true)
            try {
                const data = await authAPI.googleLogin(tokenResponse.access_token)
                localStorage.setItem('token', data.access_token)
                localStorage.setItem('user', JSON.stringify(data.user))
                onSuccess()
            } catch (err) {
                setError('Google login failed')
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

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with Peach/Orange Blur */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/30 to-[#FFB347]/30 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-[440px] bg-white/10 backdrop-blur-[24px] rounded-[24px] border border-white/30 shadow-[0_20px_50px_rgba(255,107,53,0.15)] overflow-hidden"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 md:p-10">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#FFB347] text-white shadow-lg shadow-orange-500/30 mb-4 ring-4 ring-white/10">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Complete Booking</h2>
                        <p className="text-white/70 text-sm mt-1">Sign in to secure your adventure</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-1 bg-white/10 rounded-2xl mb-8 border border-white/10">
                        {(['login', 'register'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setError(''); }}
                                className={cn(
                                    "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300",
                                    activeTab === tab
                                        ? "bg-gradient-to-r from-[#FF6B35] to-[#FFB347] text-white shadow-md"
                                        : "text-white/60 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: activeTab === 'login' ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: activeTab === 'login' ? 20 : -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {error && (
                                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-100 text-xs animate-shake">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
                                {activeTab === 'register' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5 peer">
                                            <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">First Name</label>
                                            <div className="relative group">
                                                <Input
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="bg-white/10 border-white/20 text-white rounded-xl h-11 pl-10 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all"
                                                    placeholder="John"
                                                />
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#FFB347]" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Last Name</label>
                                            <div className="relative group">
                                                <Input
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="bg-white/10 border-white/20 text-white rounded-xl h-11 pl-10 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all"
                                                    placeholder="Doe"
                                                />
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#FFB347]" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Email ID</label>
                                    <div className="relative group">
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white rounded-xl h-11 pl-10 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all"
                                            placeholder="traveler@example.com"
                                        />
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#FFB347]" />
                                    </div>
                                </div>

                                <div className="space-y-1.5 text-orange-200">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Password</label>
                                        {activeTab === 'login' && (
                                            <button type="button" className="text-[10px] font-bold text-[#FFB347] hover:underline uppercase tracking-tight">Forgot?</button>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white rounded-xl h-11 pl-10 pr-10 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all"
                                            placeholder="••••••••"
                                        />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#FFB347]" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {activeTab === 'register' && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Confirm Password</label>
                                            <div className="relative group">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="bg-white/10 border-white/20 text-white rounded-xl h-11 pl-10 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all"
                                                    placeholder="••••••••"
                                                />
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#FFB347]" />
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
                                                            strength >= level ? "bg-gradient-to-r from-[#FF6B35] to-[#FFB347]" : "bg-white/5"
                                                        )}
                                                    />
                                                );
                                            })}
                                        </div>

                                        <div className="flex flex-wrap gap-3 px-1 pt-1 opacity-80">
                                            {getPasswordRequirements().map((req, i) => (
                                                <div key={i} className={cn("flex items-center gap-1.5 text-[10px] font-bold tracking-tight", req.valid ? "text-green-400" : "text-white/40")}>
                                                    {req.valid ? <Check className="w-3 h-3" /> : <div className="w-1 h-1 rounded-full bg-white/20" />}
                                                    {req.label}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 bg-gradient-to-r from-[#FF6B35] to-[#FFB347] text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 border border-white/10"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        activeTab === 'login' ? 'Login to Continue' : 'Create Account'
                                    )}
                                </Button>
                            </form>
                        </motion.div>
                    </AnimatePresence>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold text-white/30"><span className="bg-transparent px-3">secure social sign-in</span></div>
                    </div>

                    <Button
                        onClick={() => googleLogin()}
                        disabled={loading}
                        variant="outline"
                        className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-2xl transition-all font-bold flex items-center justify-center gap-3"
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
                <div className="bg-white/5 border-t border-white/10 px-8 py-5 text-center">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                        {activeTab === 'login' ? "New around here?" : "Already have an account?"}{' '}
                        <button
                            onClick={() => { setActiveTab(activeTab === 'login' ? 'register' : 'login'); setError(''); }}
                            className="text-[#FFB347] hover:underline"
                        >
                            {activeTab === 'login' ? "Join the adventure" : "Welcome back"}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
