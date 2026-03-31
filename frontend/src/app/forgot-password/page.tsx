'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { authAPI } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Plane, Mail, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [emailValid, setEmailValid] = useState<boolean | null>(null)
    const [emailTouched, setEmailTouched] = useState(false)

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!validateEmail(email)) {
            setEmailValid(false)
            setEmailTouched(true)
            return
        }

        setLoading(true)
        try {
            await authAPI.forgotPassword(email)
            // Redirect to OTP verification page with email as query param
            router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--primary-soft)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden noise-overlay">
            {/* Ambient Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--primary-soft)]/60 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--primary-light)]/50 blur-[150px] pointer-events-none" />
            <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-[var(--primary-soft)]/40 blur-[100px] pointer-events-none" />

            {/* Mesh Gradient Overlay */}
            <div className="absolute inset-0 opacity-80 mix-blend-overlay" style={{
                backgroundImage: 'radial-gradient(at 0% 0%, var(--primary-soft) 0, transparent 50%), radial-gradient(at 100% 100%, var(--primary-soft) 0, transparent 60%), radial-gradient(at 50% 50%, var(--primary-light) 0, transparent 100%)'
            }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full relative z-10"
            >
                <Card className="glass-panel w-full shadow-[0_20px_60px_rgba(255,122,69,0.2)] bg-white/25 backdrop-blur-[20px] border border-white/35 rounded-[32px] overflow-hidden p-0">
                    <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] p-8 text-center text-white relative">
                        <Link
                            href="/login"
                            className="absolute left-6 top-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mx-auto bg-white/25 backdrop-blur-md p-4 rounded-3xl w-fit mb-4 border border-white/30 shadow-lg relative"
                        >
                            <Plane className="w-8 h-8 text-white relative z-10 drop-shadow-md rotate-[-45deg]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold tracking-tight">Forgot Password?</h2>
                        <p className="text-white/80 mt-2 text-sm font-medium">Enter your email to receive a reset code</p>
                    </div>

                    <CardContent className="pt-8 px-8 pb-10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-red-50/50 backdrop-blur-sm text-red-600 p-3 rounded-xl text-sm border border-red-100/50 flex items-center gap-2 overflow-hidden shadow-sm"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span className="font-semibold text-xs">{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-[0.15em] ml-1 opacity-80">Email Address</label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                        <Mail className={cn(
                                            "h-5 w-5 transition-colors duration-300",
                                            emailValid === false ? "text-red-400" : "text-[var(--primary)]/40 group-focus-within/input:text-[var(--primary)]"
                                        )} />
                                    </div>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        onBlur={() => {
                                            setEmailTouched(true)
                                            setEmailValid(validateEmail(email))
                                        }}
                                        placeholder="name@example.com"
                                        className={cn(
                                            "h-14 pl-12 bg-white/40 backdrop-blur-md border border-white/50 focus:border-[var(--primary)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:shadow-[0_8px_24px_var(--primary-glow)] text-slate-700 font-medium transition-all duration-300 rounded-2xl",
                                            emailValid === false && "border-red-300 bg-red-50/20 shadow-red-100"
                                        )}
                                        required
                                    />
                                </div>
                                {emailValid === false && (
                                    <p className="text-[11px] font-bold text-red-500 ml-2 mt-1">Please enter a valid email address</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 text-base font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] hover:shadow-[0_12px_24px_var(--primary-glow)] rounded-2xl transition-all shadow-[0_8px_20px_rgba(255,122,69,0.2)] text-white border-0 group relative overflow-hidden"
                                disabled={loading}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[25deg]" />
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Sending Code...</span>
                                    </div>
                                ) : (
                                    <span className="relative z-10">Send Reset Code</span>
                                )}
                            </Button>

                            <div className="text-center pt-6 border-t border-[#FFCBA4]/20 mt-4">
                                <Link href="/login" className="text-sm font-bold text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors inline-flex items-center gap-2 group">
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    Return to Sign In
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>

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
            `}</style>
        </div>
    )
}
