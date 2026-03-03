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
    ShieldCheck, ArrowRight, Plane, AlertCircle, Check, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
    const router = useRouter()

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
            formData.first_name.length > 0 &&
            formData.last_name.length > 0 &&
            formData.terms
        )
    }

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
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify(data.user))
            router.push('/')
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-50/20 to-transparent -z-10" />
            <div className="absolute top-20 right-20 w-64 h-64 bg-purple-100/50 rounded-full blur-[100px] opacity-40 -z-10" />
            <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-100/50 rounded-full blur-[100px] opacity-40 -z-10" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-[480px] w-full"
            >
                <Card className="shadow-2xl shadow-blue-900/5 border-0 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 w-full" />
                    <CardHeader className="space-y-1 text-center pb-6 pt-8">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl w-fit mb-4 border border-blue-100 shadow-sm"
                        >
                            <Plane className="w-8 h-8 text-blue-600 -rotate-45 translate-x-1" />
                        </motion.div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">Create Account</CardTitle>
                        <CardDescription className="text-base text-gray-500 max-w-xs mx-auto">
                            Join thousands of travelers planning their dream trips effortlessly.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-8 pb-8">
                        {/* Social Signup Mock */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <Button variant="outline" className="h-11 rounded-xl border-white/20 hover:bg-white/40 hover:text-gray-900 transition-all text-gray-600 font-medium text-sm glass-button">
                                <svg className="h-4 w-4 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                                Google
                            </Button>
                            <Button variant="outline" className="h-11 rounded-xl border-white/20 hover:bg-white/40 hover:text-gray-900 transition-all text-gray-600 font-medium text-sm glass-button">
                                <svg className="h-4 w-4 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="apple" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"></path></svg>
                                Apple
                            </Button>
                        </div>

                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-200/50" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="glass-panel px-2 py-0.5 rounded-full text-gray-500 font-medium tracking-wider">Or continue with email</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 flex items-start gap-2"
                                    >
                                        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">Email Address</label>
                                <div className="relative group">
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        onBlur={() => handleBlur('email')}
                                        required
                                        placeholder="you@example.com"
                                        className={cn(
                                            "h-12 pl-10 pr-10 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all font-medium",
                                            touched.email && emailValid === false && "border-red-300 focus:border-red-500 focus:ring-red-500/20",
                                            touched.email && emailValid === true && "border-green-300 focus:border-green-500 focus:ring-green-500/20"
                                        )}
                                    />
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <AnimatePresence>
                                        {formData.email && (
                                            <motion.div
                                                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                            >
                                                {emailValid ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    touched.email && <XCircle className="w-5 h-5 text-red-500" />
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">Password</label>
                                <div className="relative group">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        placeholder="Create a strong password"
                                        className="h-12 pl-10 pr-10 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all font-medium"
                                    />
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {/* Strength Meter */}
                                <div className="space-y-2 pt-1">
                                    <div className="flex gap-1 h-1">
                                        {[1, 2, 3].map((level) => (
                                            <div
                                                key={level}
                                                className={cn(
                                                    "h-full flex-1 rounded-full transition-all duration-500",
                                                    passwordStrength >= level
                                                        ? (passwordStrength === 1 ? "bg-red-500" : passwordStrength === 2 ? "bg-yellow-500" : "bg-green-500")
                                                        : "bg-gray-100"
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {getPasswordRequirements().map((req, i) => (
                                            <div key={i} className={cn("text-xs flex items-center gap-1 transition-colors", req.valid ? "text-green-600 font-medium" : "text-gray-400")}>
                                                {req.valid ? <Check className="w-3 h-3" /> : <div className="w-1 h-1 rounded-full bg-gray-300" />}
                                                {req.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Name Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">First Name</label>
                                    <div className="relative group">
                                        <Input
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            required
                                            placeholder="John"
                                            className="h-11 pl-9 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all font-medium"
                                        />
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">Last Name</label>
                                    <div className="relative group">
                                        <Input
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            required
                                            placeholder="Doe"
                                            className="h-11 pl-9 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all font-medium"
                                        />
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">Phone Number</label>
                                    <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">Optional</span>
                                </div>
                                <div className="relative">
                                    <PhoneInput
                                        country={'in'}
                                        value={formData.phone}
                                        onChange={phone => setFormData({ ...formData, phone })}
                                        inputProps={{ name: 'phone', id: 'phone' }}
                                        containerClass="w-full !rounded-xl"
                                        inputClass="!w-full !h-11 !pl-[48px] !text-sm !border-white/20 !bg-white/40 backdrop-blur-md !rounded-xl focus:!border-blue-500 focus:!ring-blue-500/20 !font-medium !transition-all"
                                        buttonClass="!border-white/20 !rounded-l-xl !bg-white/40 hover:!bg-white/60 !transition-colors !px-1 backdrop-blur-md"
                                        dropdownClass="!rounded-xl !shadow-xl !border-gray-100 !mt-2"
                                    />
                                </div>
                            </div>

                            {/* Terms */}
                            <div className="flex items-start gap-3 py-2">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        checked={formData.terms}
                                        onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                <label htmlFor="terms" className="text-sm text-gray-500 cursor-pointer leading-tight">
                                    I agree to the <Link href="#" className="text-blue-600 font-semibold hover:underline">Terms of Service</Link> and <Link href="#" className="text-blue-600 font-semibold hover:underline">Privacy Policy</Link>
                                </label>
                            </div>

                            <Button
                                type="submit"
                                className={cn(
                                    "w-full h-12 text-base font-bold text-white transition-all shadow-lg shadow-blue-500/25 rounded-xl group relative overflow-hidden",
                                    loading ? "bg-blue-700" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.01] active:scale-[0.99]",
                                    !isFormValid() && "opacity-70 cursor-not-allowed hover:none grayscale"
                                )}
                                disabled={loading || !isFormValid()}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating account...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        Get Started
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                )}
                            </Button>

                            <div className="text-center text-sm pt-4">
                                <span className="text-gray-500">Already a member? </span>
                                <Link href="/login" className="font-bold text-blue-600 hover:text-indigo-600 hover:underline transition-colors">
                                    Sign in here
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter className="bg-white/40 backdrop-blur-md border-t border-white/20 py-4 flex justify-center">
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Your data is secure and encrypted</span>
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}
