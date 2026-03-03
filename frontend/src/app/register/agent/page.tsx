'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import { Shield, UserPlus, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-toastify'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Country, State, City } from 'country-state-city'
import { ICountry, IState, ICity } from 'country-state-city'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

export default function AgentRegisterPage() {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState(0)

    const [form, setForm] = useState({
        // Agency Details
        agency_name: '',
        company_legal_name: '',
        domain: '',
        business_address: '',
        country: 'IN',
        state: '',
        city: '',

        // Contact Details
        first_name: '',
        last_name: '',
        email: '',
        phone: '',

        // Credentials
        password: '',
        confirm_password: '',

        // Simple CAPTCHA
        captcha: ''
    })

    // Geographic state
    const [allCountries] = useState<ICountry[]>(Country.getAllCountries())
    const [countryStates, setCountryStates] = useState<IState[]>(State.getStatesOfCountry('IN'))
    const [stateCities, setStateCities] = useState<ICity[]>([])

    // Simple CAPTCHA question
    const [captchaQuest, setCaptchaQuest] = useState({ num1: 0, num2: 0, answer: 0 })

    useEffect(() => {
        const n1 = Math.floor(Math.random() * 10) + 1
        const n2 = Math.floor(Math.random() * 10) + 1
        setCaptchaQuest({ num1: n1, num2: n2, answer: n1 + n2 })
    }, [])

    // Password strength calculator
    useEffect(() => {
        const password = form.password
        let strength = 0
        if (password.length >= 8) strength++
        if (password.length >= 12) strength++
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
        if (/\d/.test(password)) strength++
        if (/[^a-zA-Z0-9]/.test(password)) strength++
        setPasswordStrength(strength)
    }, [form.password])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()

        if (form.password !== form.confirm_password) {
            toast.error('Passwords do not match')
            return
        }

        if (parseInt(form.captcha) !== captchaQuest.answer) {
            toast.error('Invalid CAPTCHA answer')
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                ...form,
                country: Country.getCountryByCode(form.country)?.name || form.country,
                state: State.getStateByCodeAndCountry(form.state, form.country)?.name || form.state,
            }
            delete (payload as any).captcha

            const response = await fetch('http://localhost:8000/api/v1/auth/register/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || 'Registration failed')
            }

            setSubmitted(true)
            toast.success('Registration request submitted successfully')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full"
                >
                    <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-[24px] overflow-hidden">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-slate-900">Registration Submitted!</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-6">
                            <p className="text-slate-600 text-lg leading-relaxed">
                                Your registration request has been submitted. The admin will review and approve your account.
                            </p>
                            <p className="text-slate-500 text-sm">
                                You will receive an email once your account is activated.
                            </p>
                            <Button
                                onClick={() => router.push('/login')}
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                            >
                                Return to Login
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFF] py-12 px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <Link href="/">
                        <img src="/logo.png" alt="RNT Tour" className="h-12 mx-auto mb-6" />
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">Partner with RNT Tour</h1>
                    <p className="text-slate-500 text-lg">Register your travel agency and start creating unforgettable experiences.</p>
                </div>

                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-xl rounded-[24px] overflow-hidden">
                    <form onSubmit={handleRegister} className="p-8 space-y-8">
                        <Accordion type="multiple" defaultValue={['agency', 'contact', 'credentials']} className="space-y-6">
                            {/* Agency Details */}
                            <AccordionItem value="agency" className="border rounded-[20px] px-6 bg-purple-50/30 border-purple-100/50">
                                <AccordionTrigger className="hover:no-underline py-6">
                                    <h3 className="font-bold text-xl flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        Agency Details
                                    </h3>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-6 pb-6 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="agency_name" className="text-[14px] font-semibold text-slate-700">Agency Name *</Label>
                                            <Input
                                                id="agency_name"
                                                required
                                                placeholder="e.g., Wanderlust Travels"
                                                value={form.agency_name}
                                                onChange={e => setForm({ ...form, agency_name: e.target.value })}
                                                className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-purple-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="company_legal_name" className="text-[14px] font-semibold text-slate-700">Company Legal Name *</Label>
                                            <Input
                                                id="company_legal_name"
                                                required
                                                placeholder="Full legal entity name"
                                                value={form.company_legal_name}
                                                onChange={e => setForm({ ...form, company_legal_name: e.target.value })}
                                                className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="domain" className="text-[14px] font-semibold text-slate-700">Website / Domain Name *</Label>
                                        <Input
                                            id="domain"
                                            required
                                            placeholder="e.g., wanderlust.com"
                                            value={form.domain}
                                            onChange={e => setForm({ ...form, domain: e.target.value })}
                                            className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="business_address" className="text-[14px] font-semibold text-slate-700">Business Address *</Label>
                                        <Input
                                            id="business_address"
                                            required
                                            placeholder="Full office address"
                                            value={form.business_address}
                                            onChange={e => setForm({ ...form, business_address: e.target.value })}
                                            className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="country" className="text-[14px] font-semibold text-slate-700">Country *</Label>
                                            <select
                                                id="country"
                                                required
                                                className="flex h-12 w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                value={form.country}
                                                onChange={e => {
                                                    const countryCode = e.target.value;
                                                    setForm({ ...form, country: countryCode, state: '', city: '' });
                                                    setCountryStates(State.getStatesOfCountry(countryCode));
                                                    setStateCities([]);
                                                }}
                                            >
                                                {allCountries.map(c => (
                                                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="state" className="text-[14px] font-semibold text-slate-700">State *</Label>
                                            <select
                                                id="state"
                                                required
                                                className="flex h-12 w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                value={form.state}
                                                onChange={e => {
                                                    const stateCode = e.target.value;
                                                    setForm({ ...form, state: stateCode, city: '' });
                                                    setStateCities(City.getCitiesOfState(form.country, stateCode));
                                                }}
                                            >
                                                <option value="">Select State</option>
                                                {countryStates.map(s => (
                                                    <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="city" className="text-[14px] font-semibold text-slate-700">City *</Label>
                                            <select
                                                id="city"
                                                required
                                                className="flex h-12 w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                value={form.city}
                                                onChange={e => setForm({ ...form, city: e.target.value })}
                                            >
                                                <option value="">Select City</option>
                                                {stateCities.map(c => (
                                                    <option key={c.name} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Contact Details */}
                            <AccordionItem value="contact" className="border rounded-[20px] px-6 bg-indigo-50/30 border-indigo-100/50">
                                <AccordionTrigger className="hover:no-underline py-6">
                                    <h3 className="font-bold text-xl flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                            <UserPlus className="h-5 w-5" />
                                        </div>
                                        Contact Details
                                    </h3>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-6 pb-6 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="first_name" className="text-[14px] font-semibold text-slate-700">First Name *</Label>
                                            <Input
                                                id="first_name"
                                                required
                                                placeholder="Primary contact first name"
                                                value={form.first_name}
                                                onChange={e => setForm({ ...form, first_name: e.target.value })}
                                                className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="last_name" className="text-[14px] font-semibold text-slate-700">Last Name *</Label>
                                            <Input
                                                id="last_name"
                                                required
                                                placeholder="Primary contact last name"
                                                value={form.last_name}
                                                onChange={e => setForm({ ...form, last_name: e.target.value })}
                                                className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-[14px] font-semibold text-slate-700">Email Address *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                placeholder="contact@agency.com"
                                                value={form.email}
                                                onChange={e => setForm({ ...form, email: e.target.value })}
                                                className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="text-[14px] font-semibold text-slate-700">Phone Number *</Label>
                                            <PhoneInput
                                                country={'in'}
                                                value={form.phone}
                                                onChange={phone => setForm({ ...form, phone })}
                                                inputStyle={{
                                                    width: '100%',
                                                    height: '48px',
                                                    borderRadius: '12px',
                                                    border: '1px solid #e2e8f0',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.5)'
                                                }}
                                                containerStyle={{
                                                    width: '100%'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Credentials */}
                            <AccordionItem value="credentials" className="border rounded-[20px] px-6 bg-slate-50/50 border-slate-100">
                                <AccordionTrigger className="hover:no-underline py-6">
                                    <h3 className="font-bold text-xl flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-slate-200 rounded-lg text-slate-600">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        Login Credentials
                                    </h3>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-6 pb-6 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="password" title="At least 8 characters, one uppercase, one number" className="text-[14px] font-semibold text-slate-700">Password *</Label>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    required
                                                    value={form.password}
                                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                                    className={`h-12 bg-white/50 border-slate-200 rounded-xl pr-10 focus:ring-slate-500 ${form.password ? (passwordStrength >= 3 ? 'border-green-200' : 'border-red-200') : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                            {form.password && (
                                                <div className="flex gap-1 mt-2">
                                                    {[1, 2, 3, 4, 5].map((i) => (
                                                        <div
                                                            key={i}
                                                            className={`h-1 w-full rounded-full ${i <= passwordStrength ? (passwordStrength <= 2 ? 'bg-red-400' : passwordStrength <= 4 ? 'bg-yellow-400' : 'bg-green-500') : 'bg-slate-200'}`}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm_password" className="text-[14px] font-semibold text-slate-700">Confirm Password *</Label>
                                            <div className="relative">
                                                <Input
                                                    id="confirm_password"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    required
                                                    value={form.confirm_password}
                                                    onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                                                    className={`h-12 bg-white/50 border-slate-200 rounded-xl pr-10 focus:ring-slate-500 ${form.confirm_password && form.confirm_password === form.password ? 'border-green-200' : form.confirm_password ? 'border-red-200' : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-100 rounded-xl space-y-3">
                                        <Label className="text-[14px] font-bold text-slate-800">Bot Protection: What is {captchaQuest.num1} + {captchaQuest.num2}? *</Label>
                                        <Input
                                            placeholder="Enter your answer"
                                            required
                                            value={form.captcha}
                                            onChange={e => setForm({ ...form, captcha: e.target.value })}
                                            className="h-10 bg-white border-slate-200 rounded-lg"
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <div className="flex flex-col gap-4">
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
                            >
                                {submitting ? 'Processing Registration...' : 'Submit Registration Request'}
                            </Button>
                            <p className="text-center text-slate-500 font-medium">
                                Already have an account? <Link href="/login" className="text-indigo-600 hover:underline">Log in here</Link>
                            </p>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    )
}
