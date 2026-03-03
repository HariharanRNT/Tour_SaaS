'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { authAPI } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Plane, ShieldCheck, ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'

function OTPVerificationForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''

    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [error, setError] = useState('')
    const [timer, setTimer] = useState(60)

    useEffect(() => {
        if (!email) {
            router.push('/forgot-password')
        }
    }, [email, router])

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(timer - 1), 1000)
            return () => clearInterval(interval)
        }
    }, [timer])

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '')
        if (val.length <= 6) {
            setOtp(val)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (otp.length !== 6) return

        setError('')
        setLoading(true)
        try {
            await authAPI.verifyOTP(email, otp)
            // Success - Redirect to Reset Password page with email and otp as token
            router.push(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(otp)}`)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid or expired OTP')
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (timer > 0) return

        setError('')
        setResending(true)
        try {
            await authAPI.forgotPassword(email)
            setTimer(60)
            toast.success("OTP resent successfully")
        } catch (err: any) {
            setError('Failed to resend OTP')
        } finally {
            setResending(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center gap-2 overflow-hidden"
                    >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium text-xs">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                <p className="text-center text-gray-500 text-sm">
                    Enter the 6-digit code sent to<br />
                    <span className="font-bold text-gray-700">{email}</span>
                </p>

                <div className="flex justify-center">
                    <Input
                        type="text"
                        value={otp}
                        onChange={handleOtpChange}
                        placeholder="000000"
                        className="glass-input h-16 text-center text-3xl font-bold tracking-[0.5em] border-white/20 bg-none focus:bg-white/20 rounded-xl max-w-[240px]"
                        maxLength={6}
                        required
                        autoFocus
                    />
                </div>
            </div>

            <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg"
                disabled={loading || otp.length !== 6}
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying...</span>
                    </div>
                ) : 'Verify Code'}
            </Button>

            <div className="text-center space-y-4">
                <p className="text-sm text-gray-500">
                    Didn't receive the code?{' '}
                    {timer > 0 ? (
                        <span className="text-blue-600 font-medium">Wait {timer}s</span>
                    ) : (
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending}
                            className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                        >
                            {resending && <RefreshCw className="w-3 h-3 animate-spin" />}
                            Resend Now
                        </button>
                    )}
                </p>
                <div className="pt-2 border-t">
                    <Link href="/forgot-password" className="text-sm font-medium text-gray-400 hover:text-blue-600">
                        Try a different email
                    </Link>
                </div>
            </div>
        </form>
    )
}

export default function VerifyOTPPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/30 blur-3xl" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-100/30 blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full"
            >
                <Card className="shadow-xl rounded-2xl border-0 overflow-hidden ring-1 ring-gray-100">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-center text-white relative">
                        <Link
                            href="/forgot-password"
                            className="absolute left-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mx-auto bg-white/20 backdrop-blur-sm p-3 rounded-full w-fit mb-4"
                        >
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </motion.div>
                        <h2 className="text-2xl font-bold tracking-tight">Security Code</h2>
                        <p className="text-emerald-100 mt-2 text-sm font-medium">Verify your identity</p>
                    </div>

                    <CardContent className="pt-8 px-8 pb-8">
                        <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>}>
                            <OTPVerificationForm />
                        </Suspense>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
