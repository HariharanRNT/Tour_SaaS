'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { authAPI } from '@/lib/api'
import { cn, formatError } from '@/lib/utils'
import { Plane, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''
    const token = searchParams.get('token') || ''

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (!email || !token) {
            router.push('/forgot-password')
        }
    }, [email, token, router])

    const getPasswordStrength = (pass: string) => {
        if (!pass) return 0
        let score = 0
        if (pass.length >= 8) score++
        if (/[A-Z]/.test(pass)) score++
        if (/[0-9]/.test(pass)) score++
        if (/[^A-Za-z0-9]/.test(pass)) score++
        return score
    }

    const strength = getPasswordStrength(newPassword)
    const strengthColor = strength <= 1 ? 'bg-red-500' : strength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
    const strengthLabel = strength <= 1 ? 'Weak' : strength <= 3 ? 'Medium' : 'Strong'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (strength < 2) {
            setError('Password is too weak')
            return
        }

        setLoading(true)
        try {
            await authAPI.resetPassword({
                email,
                token,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
            setSuccess(true)
            toast.success("Password reset successfully!")
            setTimeout(() => {
                router.push('/login')
            }, 3000)
        } catch (err: any) {
            setError(formatError(err))
            setLoading(false)
        }
    }

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
            >
                <div className="mx-auto bg-green-100 p-4 rounded-full w-fit text-green-600">
                    <CheckCircle className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Success!</h3>
                <p className="text-gray-500">Your password has been reset successfully. Redirecting you to login...</p>
                <Link href="/login" className="inline-block mt-4 text-blue-600 font-bold hover:underline">
                    Go to Login Now
                </Link>
            </motion.div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">New Password</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <Input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        maxLength={50}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="glass-input h-12 pl-10 pr-10 border-white/20 bg-none focus:bg-white/20 rounded-xl"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
                {/* Strength Meter */}
                {newPassword && (
                    <div className="px-1 mt-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Strength: {strengthLabel}</span>
                        </div>
                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                            {[1, 2, 3, 4].map((step) => (
                                <div
                                    key={step}
                                    className={cn(
                                        "h-full flex-1 transition-all duration-500",
                                        strength >= step ? strengthColor : "bg-gray-200"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Confirm New Password</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <Input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        maxLength={50}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(
                            "glass-input h-12 pl-10 border-white/20 bg-none focus:bg-white/20 rounded-xl",
                            confirmPassword && newPassword !== confirmPassword && "border-red-300 bg-red-50/10"
                        )}
                        required
                    />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 ml-1">Passwords do not match</p>
                )}
            </div>

            <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg mt-2"
                disabled={loading || !newPassword || newPassword !== confirmPassword || strength < 2}
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating Password...</span>
                    </div>
                ) : 'Reset Password'}
            </Button>
        </form>
    )
}

export default function ResetPasswordPage() {
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
                    <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-center text-white relative">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mx-auto bg-white/20 backdrop-blur-sm p-3 rounded-full w-fit mb-4"
                        >
                            <ShieldAlert className="w-8 h-8 text-white" />
                        </motion.div>
                        <h2 className="text-2xl font-bold tracking-tight">New Password</h2>
                        <p className="text-blue-100 mt-2 text-sm font-medium">Create a strong, unique password</p>
                    </div>

                    <CardContent className="pt-8 px-8 pb-8">
                        <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>}>
                            <ResetPasswordForm />
                        </Suspense>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
