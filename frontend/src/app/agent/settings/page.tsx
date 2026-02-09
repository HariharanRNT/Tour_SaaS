'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
    ArrowLeft,
    Loader2,
    Save,
    Key,
    Mail,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Copy,
    ChevronRight,
    Globe,
    ShieldCheck,
    CreditCard,
    Info,
    ExternalLink,
    RefreshCw
} from 'lucide-react'
import { toast } from 'react-toastify'

export default function AgentSettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [testingSmtp, setTestingSmtp] = useState(false)

    // UI Visibility states
    const [showSmtpPassword, setShowSmtpPassword] = useState(false)
    const [showRazorpaySecret, setShowRazorpaySecret] = useState(false)
    const [originalSettings, setOriginalSettings] = useState<any>(null)
    const [lastUpdated, setLastUpdated] = useState<string | null>(null)

    // Separate state for different sections to match API structure
    const [currency, setCurrency] = useState('INR')

    interface SmtpSettings {
        host: string;
        port: number;
        username: string;
        password?: string;
        from_email: string;
        from_name: string;
        encryption_type: string;
    }

    const [smtp, setSmtp] = useState<SmtpSettings>({
        host: '',
        port: 587,
        username: '',
        password: '',
        from_email: '',
        from_name: '',
        encryption_type: 'starttls'
    })

    interface RazorpaySettings {
        key_id: string;
        key_secret?: string;
    }

    const [razorpay, setRazorpay] = useState<RazorpaySettings>({
        key_id: '',
        key_secret: ''
    })

    // Track unsaved changes
    const isDirty = useMemo(() => {
        if (!originalSettings) return false;

        const currentSettings = {
            currency,
            smtp: { ...smtp, password: '' }, // Exclude password from comparison
            razorpay: { ...razorpay, key_secret: '' } // Exclude key_secret from comparison
        };

        // Create a copy of originalSettings, ensuring sensitive fields are empty for comparison
        const originalSettingsForComparison = {
            currency: originalSettings.currency,
            smtp: { ...originalSettings.smtp, password: '' },
            razorpay: { ...originalSettings.razorpay, key_secret: '' }
        };

        return JSON.stringify(currentSettings) !== JSON.stringify(originalSettingsForComparison);
    }, [currency, smtp, razorpay, originalSettings]);

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')

        if (!token || !userStr) {
            router.push('/login')
            return
        }

        loadSettings(token)
    }, [router])

    const loadSettings = async (token: string) => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/agent/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                const initialSmtp = data.smtp ? {
                    host: data.smtp.host || '',
                    port: data.smtp.port || 587,
                    username: data.smtp.username || '',
                    password: '',
                    from_email: data.smtp.from_email || '',
                    from_name: data.smtp.from_name || '',
                    encryption_type: data.smtp.encryption_type || 'starttls'
                } : smtp;

                const initialRazorpay = data.razorpay ? {
                    key_id: data.razorpay.key_id || '',
                    key_secret: ''
                } : razorpay;

                // Currency
                const initialCurrency = data.currency || 'INR';
                setCurrency(initialCurrency)
                setSmtp(initialSmtp)
                setRazorpay(initialRazorpay)

                // Track original for unsaved changes warning
                setOriginalSettings({
                    currency: initialCurrency,
                    smtp: initialSmtp,
                    razorpay: initialRazorpay
                })

                if (data.updated_at) {
                    setLastUpdated(new Date(data.updated_at).toLocaleDateString() + ' ' + new Date(data.updated_at).toLocaleTimeString())
                }
            } else {
                console.error("Failed to fetch settings")
                toast.error("Failed to fetch current settings")
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
            toast.error("Failed to load settings.")
        } finally {
            setLoading(false)
        }
    }

    const handleSmtpChange = (field: keyof SmtpSettings, value: any) => {
        setSmtp(prev => ({ ...prev, [field]: value }))
    }

    const handleRazorpayChange = (field: keyof RazorpaySettings, value: any) => {
        setRazorpay(prev => ({ ...prev, [field]: value }))
    }

    const saveSmtp = async (token: string) => {
        const res = await fetch('http://localhost:8000/api/v1/agent/settings/smtp', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(smtp)
        })
        if (!res.ok) throw new Error('Failed to update SMTP settings')
    }

    const saveRazorpay = async (token: string) => {
        const res = await fetch('http://localhost:8000/api/v1/agent/settings/razorpay', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(razorpay)
        })
        if (!res.ok) throw new Error('Failed to update Razorpay settings')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const token = localStorage.getItem('token')
            if (!token) return

            // We could run these in parallel
            await Promise.all([
                saveSmtp(token),
                saveRazorpay(token)
            ])

            // Update original settings after successful save
            setOriginalSettings({
                currency,
                smtp: { ...smtp, password: '' },
                razorpay: { ...razorpay, key_secret: '' }
            })

            toast.success("All settings updated successfully.")

        } catch (error) {
            console.error('Failed to update settings:', error)
            toast.error("Failed to update some settings. Please check details.")
        } finally {
            setSubmitting(false)
        }
    }

    const testSmtpConnection = async () => {
        setTestingSmtp(true)
        try {
            const token = localStorage.getItem('token')
            if (!token) return

            const res = await fetch('http://localhost:8000/api/v1/agent/settings/smtp/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(smtp)
            })

            const text = await res.text()
            let data;
            try { data = JSON.parse(text) } catch { data = { detail: text } }

            if (res.ok) {
                toast.success(data.message || "Connection successful! Test email sent.")
            } else {
                toast.error(data.detail || "Connection failed. Check credentials.")
            }
        } catch (error) {
            toast.error("Network error while testing connection.")
        } finally {
            setTestingSmtp(false)
        }
    }

    // Keyboard shortcut for saving
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (isDirty && !submitting) {
                    handleSubmit(new Event('submit') as any);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDirty, submitting, handleSubmit]);

    const discardChanges = () => {
        if (!originalSettings) return;
        setCurrency(originalSettings.currency);
        setSmtp(originalSettings.smtp);
        setRazorpay(originalSettings.razorpay);
        toast.info("Changes discarded.");
    }

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const headerOffset = 100;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-gray-500 animate-pulse">Loading settings...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Unsaved Changes Banner */}
            {isDirty && (
                <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-3 shadow-sm animate-in slide-in-from-top duration-300">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-amber-100 rounded-full text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-medium text-amber-800">
                                You have unsaved changes
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-700 hover:bg-amber-100 font-semibold"
                                onClick={discardChanges}
                            >
                                Discard
                            </Button>
                            <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-semibold"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
                {/* Header & Navigation */}
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center text-sm font-medium text-slate-500">
                            <button
                                onClick={() => router.push('/agent/dashboard')}
                                className="hover:text-blue-600 transition-colors"
                            >
                                Dashboard
                            </button>
                            <ChevronRight className="h-4 w-4 mx-2 text-slate-300" />
                            <span className="text-slate-900">Settings</span>
                        </nav>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-1">
                                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Settings</h1>
                                <p className="text-lg text-slate-500 max-w-2xl font-medium">
                                    Manage your agency preferences, email integrations, and payment gateways.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <Button
                                    variant="outline"
                                    className="font-semibold px-6 border-slate-200 hover:bg-slate-50 text-slate-700"
                                    onClick={() => router.push('/agent/dashboard')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || !isDirty}
                                    className="min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold text-base transition-all active:scale-95"
                                    title="Ctrl + S to save"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-5 w-5" />
                                            Save Changes
                                            <span className="ml-2 px-1.5 py-0.5 bg-blue-500 rounded text-[10px] opacity-70">Ctrl+S</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="border-b border-slate-200">
                        <nav className="flex gap-8 overflow-x-auto pb-px scrollbar-hide">
                            {[
                                { name: 'General', id: 'general-section' },
                                { name: 'Email', id: 'email-section' },
                                { name: 'Payment', id: 'payment-section' },
                                { name: 'Notifications', id: 'notifications-section' },
                                { name: 'API', id: 'api-section' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => scrollToSection(tab.id)}
                                    className="pb-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap px-1 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 active:text-blue-600 active:border-blue-600 focus:text-blue-600 focus:border-blue-600"
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                <div className="grid gap-8 pb-12">
                    {/* General Settings */}
                    <Card id="general-section" className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white overflow-hidden scroll-mt-24">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                                    <Globe className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-bold text-slate-900">General Configuration</CardTitle>
                                    <CardDescription className="text-sm font-medium text-slate-500">
                                        Configure basic agency settings and system preferences.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-2">
                            <div className="grid gap-3 max-w-md">
                                <Label htmlFor="currency" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    Default Currency <span className="text-red-500">*</span>
                                    <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                                </Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:ring-2 focus:ring-blue-100 font-medium text-slate-900 rounded-lg">
                                        <SelectValue placeholder="Select Currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INR" className="font-medium">🇮🇳 INR - Indian Rupee (₹)</SelectItem>
                                        <SelectItem value="USD" className="font-medium">🇺🇸 USD - US Dollar ($)</SelectItem>
                                        <SelectItem value="EUR" className="font-medium">🇪🇺 EUR - Euro (€)</SelectItem>
                                        <SelectItem value="GBP" className="font-medium">🇬🇧 GBP - British Pound (£)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                                    <ShieldCheck className="h-3 w-3" />
                                    This currency will be used for all internal calculations and defaults.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SMTP Settings */}
                    <Card id="email-section" className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white overflow-hidden scroll-mt-24">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-50 rounded-xl text-purple-600 border border-purple-100">
                                    <Mail className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-bold text-slate-900">Email Configuration (SMTP)</CardTitle>
                                    <CardDescription className="text-sm font-medium text-slate-500">
                                        Set your own service to send professional automated confirmations.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${smtp.host ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                                    }`}>
                                    <div className={`h-1.5 w-1.5 rounded-full ${smtp.host ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`} />
                                    {smtp.host ? 'Connected' : 'Not Configured'}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-bold border-slate-200 hover:bg-slate-50 text-slate-700 h-9 px-4 rounded-lg shadow-sm"
                                    onClick={testSmtpConnection}
                                    disabled={testingSmtp || !smtp.host}
                                >
                                    {testingSmtp ? (
                                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
                                    )}
                                    Test Connection
                                </Button>
                            </div>
                        </CardHeader>
                        <Separator className="bg-slate-100" />
                        <CardContent className="space-y-8 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-9 space-y-2">
                                    <Label htmlFor="smtp_host" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        SMTP Host <span className="text-red-500">*</span>
                                        <span title="Example: smtp.gmail.com">
                                            <Info className="h-3 w-3 text-slate-400 cursor-help" />
                                        </span>
                                    </Label>
                                    <Input
                                        id="smtp_host"
                                        placeholder="e.g., smtp.gmail.com"
                                        className="h-12 border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:ring-2 focus:ring-blue-100 font-medium rounded-lg"
                                        value={smtp.host}
                                        onChange={(e) => handleSmtpChange('host', e.target.value)}
                                    />
                                    <p className="text-xs font-medium text-slate-500 italic">Example: smtp.mailtrap.io or smtp.gmail.com</p>
                                </div>
                                <div className="md:col-span-3 space-y-2">
                                    <Label htmlFor="smtp_port" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        Port <span className="text-red-500">*</span>
                                        <span title="Common: 587 (TLS), 465 (SSL), 25">
                                            <Info className="h-3 w-3 text-slate-400 cursor-help" />
                                        </span>
                                    </Label>
                                    <Input
                                        id="smtp_port"
                                        placeholder="587"
                                        type="number"
                                        className="h-12 border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:ring-2 focus:ring-blue-100 font-bold rounded-lg"
                                        value={smtp.port}
                                        onChange={(e) => handleSmtpChange('port', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="encryption" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        Encryption <span className="text-red-500">*</span>
                                        <Info className="h-3.5 w-3.5 text-slate-400" />
                                    </Label>
                                    <Select
                                        value={smtp.encryption_type}
                                        onValueChange={(val) => handleSmtpChange('encryption_type', val)}
                                    >
                                        <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:ring-2 focus:ring-blue-100 font-medium rounded-lg">
                                            <SelectValue placeholder="Select encryption" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="starttls" className="font-medium">STARTTLS (Common for 587)</SelectItem>
                                            <SelectItem value="ssl" className="font-medium">SSL/TLS (Common for 465)</SelectItem>
                                            <SelectItem value="none" className="font-medium">None (Insecure)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="from_name" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        Sender Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="from_name"
                                        placeholder="e.g., Support Team"
                                        className="h-12 border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:ring-2 focus:ring-blue-100 font-medium rounded-lg"
                                        value={smtp.from_name}
                                        onChange={(e) => handleSmtpChange('from_name', e.target.value)}
                                    />
                                    <p className="text-xs font-medium text-slate-400">Appears in the 'From' field of emails.</p>
                                </div>
                            </div>

                            <Separator className="bg-slate-100/50" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_user" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        Username / Email <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <Input
                                            id="smtp_user"
                                            className="h-12 pl-11 border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:ring-2 focus:ring-blue-100 font-medium rounded-lg transition-all"
                                            value={smtp.username}
                                            onChange={(e) => handleSmtpChange('username', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_pass" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        Password
                                    </Label>
                                    <div className="relative group">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <Input
                                            id="smtp_pass"
                                            type={showSmtpPassword ? "text" : "password"}
                                            placeholder={smtp.password ? "••••••••" : "Enter account password"}
                                            className="h-12 pl-11 pr-11 border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:ring-2 focus:ring-blue-100 font-medium rounded-lg transition-all placeholder:text-slate-300 placeholder:italic"
                                            value={smtp.password}
                                            onChange={(e) => handleSmtpChange('password', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                        >
                                            {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5 px-1 py-0.5">
                                        <Info className="h-3 w-3" />
                                        Leave empty to keep existing password.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="from_email" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    Reply-To Email Address <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="from_email"
                                    className="h-12 border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:ring-2 focus:ring-blue-100 font-medium rounded-lg"
                                    value={smtp.from_email}
                                    onChange={(e) => handleSmtpChange('from_email', e.target.value)}
                                    placeholder="noreply@youragency.com"
                                />
                                <p className="text-[10px] font-medium text-slate-400">Usually the same as your login email.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Razorpay Settings */}
                    <Card id="payment-section" className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white overflow-hidden scroll-mt-24">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                        Payment Gateway (Razorpay)
                                    </CardTitle>
                                    <CardDescription className="text-sm font-medium text-slate-500">
                                        Configure your Razorpay account to receive payments directly into your account.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${razorpay.key_id ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_2px_10px_rgba(16,185,129,0.05)]' : 'bg-slate-50 text-slate-500 border-slate-200'
                                    }`}>
                                    <div className={`h-1.5 w-1.5 rounded-full ${razorpay.key_id ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`} />
                                    {razorpay.key_id ? 'Active Gateway' : 'Inactive'}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 pr-2 pl-3 py-1 rounded-lg border border-slate-100">
                                    Mode:
                                    <span className={razorpay.key_id?.startsWith('rzp_test') ? 'text-amber-600' : 'text-blue-600'}>
                                        {razorpay.key_id?.startsWith('rzp_test') ? 'TEST MODE' : 'LIVE MODE'}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <Separator className="bg-slate-100" />
                        <CardContent className="space-y-8 pt-8">
                            <div className="grid grid-cols-1 gap-8">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="key_id" className="text-sm font-bold text-slate-700">Key ID <span className="text-red-500">*</span></Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs font-bold text-slate-400 hover:text-blue-600 bg-transparent px-2"
                                            onClick={() => {
                                                navigator.clipboard.writeText(razorpay.key_id);
                                                toast.info("Key ID copied to clipboard");
                                            }}
                                        >
                                            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                                        </Button>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 rounded text-slate-400 group-focus-within:bg-blue-100 group-focus-within:text-blue-600 transition-colors">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                        </div>
                                        <Input
                                            id="key_id"
                                            placeholder="rzp_test_..."
                                            className="h-12 pl-12 border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:ring-2 focus:ring-blue-100 font-medium rounded-lg transition-all"
                                            value={razorpay.key_id}
                                            onChange={(e) => handleRazorpayChange('key_id', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <ExternalLink className="h-3 w-3 text-blue-500" />
                                        <a href="https://dashboard.razorpay.com/app/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline">
                                            Get API Keys from Razorpay Dashboard
                                        </a>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="key_secret" className="text-sm font-bold text-slate-700">Key Secret <span className="text-red-500">*</span></Label>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs font-bold text-slate-400 hover:text-blue-600 bg-transparent px-2"
                                                onClick={() => {
                                                    if (razorpay.key_secret) {
                                                        navigator.clipboard.writeText(razorpay.key_secret);
                                                        toast.info("Secret copied to clipboard");
                                                    }
                                                }}
                                                disabled={!razorpay.key_secret}
                                            >
                                                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 rounded text-slate-400 group-focus-within:bg-blue-100 group-focus-within:text-blue-600 transition-colors">
                                            <Key className="h-3.5 w-3.5" />
                                        </div>
                                        <Input
                                            id="key_secret"
                                            type={showRazorpaySecret ? "text" : "password"}
                                            placeholder={razorpay.key_secret ? "••••••••" : "Enter new account secret code"}
                                            className="h-12 pl-12 pr-11 border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:ring-2 focus:ring-blue-100 font-medium rounded-lg transition-all placeholder:text-slate-300 italic"
                                            value={razorpay.key_secret}
                                            onChange={(e) => handleRazorpayChange('key_secret', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                        >
                                            {showRazorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5 px-1 py-0.5">
                                        <ShieldCheck className="h-3 w-3" />
                                        Saved keys are encrypted and stored securely.
                                    </p>
                                    {lastUpdated && (
                                        <p className="text-[10px] font-medium text-slate-400 italic px-1 mt-2">
                                            Last modified: {lastUpdated}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}
