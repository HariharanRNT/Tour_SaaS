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
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white relative">
                        <Link
                            href="/login"
                            className="absolute left-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mx-auto bg-white/20 backdrop-blur-sm p-3 rounded-full w-fit mb-4"
                        >
                            <Plane className="w-8 h-8 text-white" fill="currentColor" fillOpacity={0.2} />
                        </motion.div>
                        <h2 className="text-2xl font-bold tracking-tight">Forgot Password?</h2>
                        <p className="text-blue-100 mt-2 text-sm font-medium">Enter your email to receive a reset code</p>
                    </div>

                    <CardContent className="pt-8 px-8 pb-8">
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

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className={cn(
                                            "h-5 w-5 transition-colors",
                                            emailValid === false ? "text-red-400" : "text-gray-400 group-focus-within:text-blue-500"
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
                                            "glass-input h-12 pl-10 border-white/20 bg-none focus:bg-white/20 rounded-xl",
                                            emailValid === false && "border-red-300 bg-red-50/10"
                                        )}
                                        required
                                    />
                                </div>
                                {emailValid === false && (
                                    <p className="text-xs text-red-500 ml-1 mt-1">Please enter a valid email address</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Sending OTP...</span>
                                    </div>
                                ) : 'Send Reset Code'}
                            </Button>

                            <div className="text-center pt-4 border-t">
                                <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                    Return to Sign In
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
