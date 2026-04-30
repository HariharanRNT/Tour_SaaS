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
    RefreshCw,
    Sparkles, // Added for Notifications
    Bell // Added for Notifications
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import EmailTemplateEditor from '@/components/agent/EmailTemplateEditor'
import { DEFAULT_TEMPLATES } from '@/constants/email-defaults'
import { fetchAgentSettings, updateAgentSettingsGeneral, updateAgentSettingsSmtp, updateAgentSettingsRazorpay, testSmtpSettings, API_URL } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { Separator as SeparatorUI } from "@/components/ui/separator"

const SettingsSkeleton = () => (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-pulse">
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="h-4 w-40 bg-slate-200/50 rounded-full" />
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-3">
                        <div className="h-12 w-64 bg-slate-200/50 rounded-xl" />
                        <div className="h-4 w-[80%] bg-slate-200/50 rounded-full" />
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <div className="h-10 w-24 bg-slate-200/50 rounded-full" />
                        <div className="h-10 w-40 bg-slate-200/50 rounded-full" />
                    </div>
                </div>
            </div>
            <div className="h-14 w-full bg-white/30 backdrop-blur-md rounded-full border border-white/20" />
        </div>
        {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 w-full bg-white/30 backdrop-blur-[40px] border border-white/20 rounded-[32px] shadow-sm" />
        ))}
    </div>
)

export default function AgentSettingsPage() {
    const router = useRouter()
    const { hasPermission, isSubUser } = useAuth()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (isSubUser && !hasPermission('settings', 'view')) {
            router.push('/agent/dashboard')
        }
    }, [isSubUser, hasPermission, router])
    const [showSmtpPassword, setShowSmtpPassword] = useState(false)
    const [showRazorpaySecret, setShowRazorpaySecret] = useState(false)
    const [originalSettings, setOriginalSettings] = useState<any>(null)
    const [lastUpdated, setLastUpdated] = useState<string | null>(null)

    // Separate state for different sections to match API structure
    const [currency, setCurrency] = useState('INR')

    // Default GST settings for new packages
    const [gstDefaults, setGstDefaults] = useState({
        gst_applicable: false,
        gst_inclusive: false,
        gst_percentage: 18.00
    })

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

    // Email Templates state
    const [emailTemplates, setEmailTemplates] = useState<Record<string, string>>(DEFAULT_TEMPLATES)

    // Track unsaved changes
    const isDirty = useMemo(() => {
        if (!originalSettings) return false;

        const currentSettings = {
            currency,
            gstDefaults,
            smtp: { ...smtp, password: '' },
            razorpay: { ...razorpay, key_secret: '' }
        };

        const originalSettingsForComparison = {
            currency: originalSettings.currency,
            gstDefaults: originalSettings.gstDefaults,
            smtp: { ...originalSettings.smtp, password: '' },
            razorpay: { ...originalSettings.razorpay, key_secret: '' }
        };

        return JSON.stringify(currentSettings) !== JSON.stringify(originalSettingsForComparison);
    }, [currency, gstDefaults, smtp, razorpay, originalSettings]);

    const { data: settingsData, isLoading } = useQuery({
        queryKey: ['agent-settings'],
        queryFn: fetchAgentSettings })

    useEffect(() => {
        if (settingsData) {
            const data = settingsData
            const initialSmtp = data.smtp ? {
                host: data.smtp.host || '',
                port: data.smtp.port || 587,
                username: data.smtp.username || '',
                password: '',
                from_email: data.smtp.from_email || '',
                from_name: data.smtp.from_name || '',
                encryption_type: data.smtp.encryption_type || 'starttls'
            } : {
                host: '',
                port: 587,
                username: '',
                password: '',
                from_email: '',
                from_name: '',
                encryption_type: 'starttls'
            };

            const initialRazorpay = data.razorpay ? {
                key_id: data.razorpay.key_id || '',
                key_secret: ''
            } : {
                key_id: '',
                key_secret: ''
            };

            const initialCurrency = data.currency || 'INR';
            const initialGstDefaults = {
                gst_applicable: data.gst_applicable ?? false,
                gst_inclusive: data.gst_inclusive ?? false,
                gst_percentage: data.gst_percentage ?? 18.00
            }

            setCurrency(initialCurrency)
            setGstDefaults(initialGstDefaults)
            setSmtp(initialSmtp)
            setRazorpay(initialRazorpay)

            setOriginalSettings({
                currency: initialCurrency,
                gstDefaults: initialGstDefaults,
                smtp: initialSmtp,
                razorpay: initialRazorpay
            })

            if (data.updated_at) {
                setLastUpdated(new Date(data.updated_at).toLocaleDateString() + ' ' + new Date(data.updated_at).toLocaleTimeString())
            }

            // Populate email templates if provided
            if (data.homepage_settings?.email_templates) {
                setEmailTemplates(data.homepage_settings.email_templates);
            }
        }
    }, [settingsData])

    // Mutations
    const updateGeneralMutation = useMutation({
        mutationFn: updateAgentSettingsGeneral,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-settings'] })
    })

    const updateSmtpMutation = useMutation({
        mutationFn: updateAgentSettingsSmtp,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-settings'] })
    })

    const updateRazorpayMutation = useMutation({
        mutationFn: updateAgentSettingsRazorpay,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-settings'] })
    })

    const testSmtpMutation = useMutation({
        mutationFn: testSmtpSettings,
        onSuccess: (data) => {
            toast.success(data.message || "Connection successful! Test email sent.")
        },
        onError: (error: any) => {
            let errorMessage = "Connection failed. Check credentials.";
            
            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (Array.isArray(detail)) {
                    const errors = detail.map((err: any) => {
                        const field = err.loc[err.loc.length - 1];
                        const readableField = field.toString().replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                        return `${readableField}: ${err.msg}`;
                    });
                    errorMessage = errors.join(" | ");
                } else if (typeof detail === 'string') {
                    errorMessage = detail;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage)
        }
    })

    const handleSmtpChange = (field: keyof SmtpSettings, value: any) => {
        setSmtp(prev => ({ ...prev, [field]: value }))
    }

    const handleRazorpayChange = (field: keyof RazorpaySettings, value: any) => {
        setRazorpay(prev => ({ ...prev, [field]: value }))
    }

    const submitting = updateGeneralMutation.isPending || updateSmtpMutation.isPending || updateRazorpayMutation.isPending;
    const testingSmtp = testSmtpMutation.isPending;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Trim whitespace from SMTP fields
        const trimmedSmtp = {
            ...smtp,
            host: smtp.host.trim(),
            username: smtp.username.trim(),
            from_email: smtp.from_email.trim(),
            from_name: smtp.from_name.trim(),
            password: smtp.password?.trim() // Trimming password as well per user request for "SMTP fields"
        };

        // SMTP Mandatory Field Validation
        if (!trimmedSmtp.host) {
            toast.error("SMTP Host is required.");
            scrollToSection('email-section');
            return;
        }
        if (!trimmedSmtp.port) {
            toast.error("SMTP Port is required.");
            scrollToSection('email-section');
            return;
        }
        if (!trimmedSmtp.username) {
            toast.error("SMTP Username is required.");
            scrollToSection('email-section');
            return;
        }
        if (!trimmedSmtp.from_name) {
            toast.error("Sender Name is required.");
            scrollToSection('email-section');
            return;
        }
        if (!trimmedSmtp.from_email) {
            toast.error("Reply-To Email is required.");
            scrollToSection('email-section');
            return;
        }
        
        // Password is required for initial setup
        const isInitialSmtp = !originalSettings?.smtp?.host;
        if (isInitialSmtp && !trimmedSmtp.password) {
            toast.error("SMTP Password is required for initial setup.");
            scrollToSection('email-section');
            return;
        }

        // Email Format Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedSmtp.username)) {
            toast.error("Please enter a valid SMTP username (email address).");
            scrollToSection('email-section');
            return;
        }
        if (!emailRegex.test(trimmedSmtp.from_email)) {
            toast.error("Please enter a valid from email address.");
            scrollToSection('email-section');
            return;
        }

        // Trim whitespace from Razorpay fields
        const trimmedRazorpay = {
            ...razorpay,
            key_id: razorpay.key_id.trim(),
            key_secret: razorpay.key_secret?.trim()
        };

        // Razorpay Mandatory Field Validation
        if (!trimmedRazorpay.key_id) {
            toast.error("Razorpay Key ID is required.");
            scrollToSection('payment-section');
            return;
        }
        
        // Key Secret is required for initial setup
        const isInitialRazorpay = !originalSettings?.razorpay?.key_id;
        if (isInitialRazorpay && !trimmedRazorpay.key_secret) {
            toast.error("Razorpay Key Secret is required for initial setup.");
            scrollToSection('payment-section');
            return;
        }

        try {
            await Promise.all([
                updateGeneralMutation.mutateAsync({ currency, ...gstDefaults }),
                updateSmtpMutation.mutateAsync(trimmedSmtp),
                updateRazorpayMutation.mutateAsync(trimmedRazorpay)
            ])

            setSmtp(trimmedSmtp); // Update local state with trimmed values
            setRazorpay(trimmedRazorpay); // Update local state with trimmed values
            setOriginalSettings({
                currency,
                gstDefaults,
                smtp: { ...trimmedSmtp, password: '' },
                razorpay: { ...trimmedRazorpay, key_secret: '' }
            })

            toast.success("All settings updated successfully.")
        } catch (error: any) {
            console.error('Failed to update settings:', error)
            
            let errorMessage = "Failed to update some settings. Please check details.";
            
            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (Array.isArray(detail)) {
                    // Handle Pydantic validation errors
                    const errors = detail.map((err: any) => {
                        const field = err.loc[err.loc.length - 1];
                        // Make field name more readable
                        const readableField = field.toString().replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                        return `${readableField}: ${err.msg}`;
                    });
                    errorMessage = errors.join(" | ");
                } else if (typeof detail === 'string') {
                    errorMessage = detail;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
        }
    }

    const testSmtpConnection = () => {
        // Trim whitespace before testing
        const trimmedSmtp = {
            ...smtp,
            host: smtp.host.trim(),
            username: smtp.username.trim(),
            from_email: smtp.from_email.trim(),
            from_name: smtp.from_name.trim(),
            password: smtp.password?.trim()
        };
        
        // Also update local state so the user sees the trimmed values
        setSmtp(trimmedSmtp);
        
        // Validation for testing
        if (!trimmedSmtp.host || !trimmedSmtp.username || !trimmedSmtp.from_email || !trimmedSmtp.from_name) {
            toast.error("Please fill all mandatory SMTP fields before testing.");
            return;
        }

        const isInitialSmtp = !originalSettings?.smtp?.host;
        if (isInitialSmtp && !trimmedSmtp.password) {
            toast.error("SMTP Password is required for testing initial setup.");
            return;
        }
        
        testSmtpMutation.mutate(trimmedSmtp)
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
        setGstDefaults(originalSettings.gstDefaults);
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

    const handleCopy = (text: string, label: string) => {
        if (!text) return;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => toast.info(`${label} copied to clipboard`))
                .catch(() => fallbackCopy(text, label));
        } else {
            fallbackCopy(text, label);
        }
    };

    const fallbackCopy = (text: string, label: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Ensure it's not visible but part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                toast.info(`${label} copied to clipboard`);
            } else {
                toast.error(`Failed to copy ${label}`);
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            toast.error(`Failed to copy ${label}`);
        }
        
        document.body.removeChild(textArea);
    };

    if (isLoading || !originalSettings) {
        return (
            <div className="min-h-screen">
                <SettingsSkeleton />
            </div>
        )
    }

    return (
        <div className="min-h-screen">

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
                {/* Header & Navigation */}
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center text-sm font-medium text-[var(--color-primary-font)]">
                            <button
                                onClick={() => router.push('/agent/dashboard')}
                                className="hover:text-[var(--primary)] transition-colors"
                            >
                                Dashboard
                            </button>
                            <ChevronRight className="h-4 w-4 mx-2 text-[var(--color-primary-font)]/40" />
                            <span className="text-[var(--color-primary-font)]">Settings</span>
                        </nav>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-1">
                                <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-primary-font)]">Settings</h1>
                                <p className="text-lg text-[var(--color-primary-font)] max-w-2xl font-medium">
                                    Manage your agency preferences, email integrations, and payment gateways.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <Button
                                    variant="outline"
                                    className="font-semibold px-6 border-slate-200 hover:bg-transparent text-[var(--color-primary-font)]/70"
                                    onClick={() => router.push('/agent/dashboard')}
                                >
                                    Cancel
                                </Button>
                                {hasPermission('settings', 'edit') && (
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={submitting || !isDirty}
                                        className="min-w-[160px] bg-gradient-to-r from-[var(--button-bg)] to-[var(--button-bg-light)] text-white shadow-lg shadow-[var(--button-glow)] font-bold text-base transition-all active:scale-95 rounded-full px-8 hover:-translate-y-0.5"
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
                                                <span className="ml-2 px-1.5 py-0.5 bg-[var(--button-bg)] text-white rounded text-[10px] opacity-90">Ctrl+S</span>
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Glass Pill Tab Navigation */}
                    <div className="glass-navbar rounded-full p-1.5 flex gap-1 overflow-x-auto scrollbar-hide shadow-sm">
                        {[
                            { name: 'General', id: 'general-section' },
                            { name: 'Email', id: 'email-section' },
                            { name: 'Payment', id: 'payment-section' },
                            { name: 'Notifications', id: 'notifications-section' },
                            { name: 'Master Data', id: 'master-data-link' },
                            { name: 'Theme', id: 'theme-link' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.id === 'theme-link') {
                                        router.push('/agent/settings/theme');
                                    } else if (tab.id === 'master-data-link') {
                                        router.push('/agent/settings/master-data');
                                    } else {
                                        scrollToSection(tab.id);
                                    }
                                }}
                                className="px-5 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-all text-[var(--color-primary-font)] hover:text-[var(--color-primary-font)]/70 hover:bg-white/50"
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-8 pb-12">
                    {/* General Settings */}
                    <Card id="general-section" className="glass-agent overflow-hidden scroll-mt-24 transition-all duration-500">
                        <CardHeader className="pb-6 pt-8 px-8">
                            <div className="flex items-center gap-5">
                                <div className="p-3.5 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-2xl text-[var(--primary)] border border-white/40 shadow-sm">
                                    <Globe className="h-6 w-6" />
                                </div>
                                <div className="space-y-1.5">
                                    <CardTitle className="text-2xl font-extrabold text-[var(--color-primary-font)] tracking-tight">General Configuration</CardTitle>
                                    <CardDescription className="text-sm font-semibold text-[var(--color-primary-font)]/80">
                                        Configure basic agency settings and system preferences.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8 px-8 pb-8 pt-2">
                            <div className="grid gap-3 max-w-md">
                                <Label htmlFor="currency" className="text-sm font-bold text-[var(--color-primary-font)]/70 flex items-center gap-2">
                                    Default Currency <span className="text-red-500">*</span>
                                    <Info className="h-3.5 w-3.5 text-[var(--color-primary-font)]/70 cursor-help" />
                                </Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="glass-input h-12 font-medium text-[var(--color-primary-font)] rounded-lg">
                                        <SelectValue placeholder="Select Currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INR" className="font-medium">🇮🇳 INR - Indian Rupee (₹)</SelectItem>
                                        <SelectItem value="USD" className="font-medium">🇺🇸 USD - US Dollar ($)</SelectItem>
                                        <SelectItem value="EUR" className="font-medium">🇪🇺 EUR - Euro (€)</SelectItem>
                                        <SelectItem value="GBP" className="font-medium">🇬🇧 GBP - British Pound (£)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs font-medium text-[var(--color-primary-font)] flex items-center gap-1.5 mt-1">
                                    <ShieldCheck className="h-3 w-3" />
                                    This currency will be used for all internal calculations and defaults.
                                </p>
                            </div>

                            <Separator className="bg-slate-100" />

                            {/* GST Configuration */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-[var(--color-primary-font)]">GST Configuration</h3>
                                    <p className="text-sm text-[var(--color-primary-font)]">Set default GST applicability for new packages. Mode and percentage are configured per package.</p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setGstDefaults(prev => ({ ...prev, gst_applicable: true }))}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${gstDefaults.gst_applicable
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                                            : 'border-slate-200 bg-white text-[var(--color-primary-font)] hover:border-slate-300'
                                            }`}
                                    >
                                        ✅ Applicable
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGstDefaults(prev => ({ ...prev, gst_applicable: false }))}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${!gstDefaults.gst_applicable
                                            ? 'border-red-400 bg-red-50 text-red-600 shadow-sm'
                                            : 'border-slate-200 bg-white text-[var(--color-primary-font)] hover:border-slate-300'
                                            }`}
                                    >
                                        ❌ Not Applicable
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SMTP Settings */}
                    <Card id="email-section" className="glass-agent overflow-hidden scroll-mt-24 transition-all duration-500">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 pt-8 px-8">
                            <div className="flex items-center gap-5">
                                <div className="p-3.5 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-2xl text-[var(--primary)] border border-white/40 shadow-sm">
                                    <Mail className="h-6 w-6" />
                                </div>
                                 <div className="space-y-1.5">
                                    <CardTitle className="text-2xl font-extrabold text-[var(--color-primary-font)] tracking-tight">Email Configuration (SMTP)</CardTitle>
                                    <CardDescription className="text-sm font-semibold text-[var(--color-primary-font)]/80">
                                        Set your own service to send professional automated confirmations.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3 shrink-0">
                                <div className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md shadow-sm",
                                    smtp.host ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-slate-500/10 text-[var(--color-primary-font)] border-slate-500/20"
                                )}>
                                    <div className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        smtp.host ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-400"
                                    )} />
                                    {smtp.host ? 'Connected' : 'Not Configured'}
                                </div>
                                {hasPermission('settings', 'edit') && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="font-bold border-white/40 bg-white/30 hover:bg-white/50 text-[var(--color-primary-font)]/70 h-10 px-6 rounded-xl shadow-sm transition-all active:scale-95"
                                        onClick={testSmtpConnection}
                                        disabled={testingSmtp || !smtp.host}
                                    >
                                        {testingSmtp ? (
                                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 mr-2 text-emerald-500 font-bold" />
                                        )}
                                        Test Connection
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <Separator className="bg-white/10" />
                        <CardContent className="space-y-8 px-8 pb-8 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-9 space-y-2">
                                    <Label htmlFor="smtp_host" className="text-sm font-bold text-[var(--color-primary-font)]/70 flex items-center gap-2">
                                        SMTP Host <span className="text-red-500">*</span>
                                        <span title="Example: smtp.gmail.com">
                                            <Info className="h-3 w-3 text-[var(--color-primary-font)]/70 cursor-help" />
                                        </span>
                                    </Label>
                                    <Input
                                        id="smtp_host"
                                        placeholder="e.g., smtp.gmail.com"
                                        className="glass-input h-12 font-medium rounded-lg"
                                        value={smtp.host}
                                        onChange={(e) => handleSmtpChange('host', e.target.value)}
                                        maxLength={50}
                                    />
                                    <p className="text-xs font-medium text-[var(--color-primary-font)] italic">Example: smtp.mailtrap.io or smtp.gmail.com</p>
                                </div>
                                <div className="md:col-span-3 space-y-2">
                                    <Label htmlFor="smtp_port" className="text-sm font-bold text-[var(--color-primary-font)]/70 flex items-center gap-2">
                                        Port <span className="text-red-500">*</span>
                                        <span title="Common: 587 (TLS), 465 (SSL), 25">
                                            <Info className="h-3 w-3 text-[var(--color-primary-font)]/70 cursor-help" />
                                        </span>
                                    </Label>
                                    <Input
                                        id="smtp_port"
                                        placeholder="587"
                                        type="number"
                                        className="glass-input h-12 font-bold rounded-lg"
                                        value={smtp.port}
                                        onChange={(e) => handleSmtpChange('port', parseInt(e.target.value))}
                                        max={65535}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="encryption" className="text-sm font-bold text-[var(--color-primary-font)]/70 flex items-center gap-2">
                                        Encryption <span className="text-red-500">*</span>
                                        <Info className="h-3.5 w-3.5 text-[var(--color-primary-font)]/70" />
                                    </Label>
                                    <Select
                                        value={smtp.encryption_type}
                                        onValueChange={(val) => handleSmtpChange('encryption_type', val)}
                                    >
                                        <SelectTrigger className="glass-input h-12 font-medium rounded-lg">
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
                                    <Label htmlFor="from_name" className="text-sm font-bold text-[var(--color-primary-font)]/70 flex items-center gap-2">
                                        Sender Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="from_name"
                                        placeholder="e.g., Support Team"
                                        className="glass-input h-12 font-medium rounded-lg"
                                        value={smtp.from_name}
                                        onChange={(e) => handleSmtpChange('from_name', e.target.value)}
                                        maxLength={50}
                                    />
                                    <p className="text-xs font-medium text-[var(--color-primary-font)]/70">Appears in the 'From' field of emails.</p>
                                </div>
                            </div>

                            <Separator className="bg-slate-100/50" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_user" className="text-sm font-bold text-[var(--color-primary-font)]/70 flex items-center gap-2">
                                        Username / Email <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-primary-font)]/70 group-focus-within:text-[var(--primary)] transition-colors" />
                                        <Input
                                            id="smtp_user"
                                            type="email"
                                            className="glass-input h-12 pl-11 font-medium rounded-lg transition-all"
                                            value={smtp.username}
                                            onChange={(e) => handleSmtpChange('username', e.target.value)}
                                            maxLength={200}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_pass" className="text-sm font-bold text-[var(--color-primary-font)]/70 flex items-center gap-2">
                                        Password
                                    </Label>
                                    <div className="relative group">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-primary-font)]/70 group-focus-within:text-[var(--primary)] transition-colors" />
                                        <Input
                                            id="smtp_pass"
                                            type={showSmtpPassword ? "text" : "password"}
                                            placeholder={smtp.password ? "••••••••" : "Enter account password"}
                                            className="glass-input h-12 pl-11 pr-11 font-medium rounded-lg transition-all placeholder:text-[var(--color-primary-font)]/40 placeholder:italic"
                                            value={smtp.password}
                                            onChange={(e) => handleSmtpChange('password', e.target.value)}
                                            maxLength={50}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-primary-font)]/70 hover:text-slate-600 focus:outline-none transition-colors"
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
                                <Label htmlFor="from_email" className="text-sm font-bold text-[var(--color-primary-font)]/70 flex items-center gap-2">
                                    Reply-To Email Address <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="from_email"
                                    type="email"
                                    className="glass-input h-12 font-medium rounded-lg"
                                    value={smtp.from_email}
                                    onChange={(e) => handleSmtpChange('from_email', e.target.value)}
                                    placeholder="noreply@youragency.com"
                                    maxLength={200}
                                />
                                <p className="text-[10px] font-medium text-[var(--color-primary-font)]/70">Usually the same as your login email.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Razorpay Settings */}
                    <Card id="payment-section" className="glass-agent overflow-hidden scroll-mt-24 transition-all duration-500">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 pt-8 px-8">
                            <div className="flex items-center gap-5">
                                <div className="p-3.5 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-2xl text-[var(--primary)] border border-white/40 shadow-sm">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                 <div className="space-y-1.5">
                                    <CardTitle className="text-2xl font-extrabold text-[var(--color-primary-font)] tracking-tight flex items-center gap-3">
                                        Payment Gateway (Razorpay)
                                    </CardTitle>
                                    <CardDescription className="text-sm font-semibold text-[var(--color-primary-font)]/80">
                                        Configure your Razorpay account to receive payments directly into your account.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3 shrink-0">
                                <div className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md shadow-sm",
                                    razorpay.key_id ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-slate-500/10 text-[var(--color-primary-font)] border-slate-500/20"
                                )}>
                                    <div className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        razorpay.key_id ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-400"
                                    )} />
                                    {razorpay.key_id ? 'Active Gateway' : 'Inactive'}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-primary-font)] bg-white/40 px-3 py-1.5 rounded-lg border border-white/40 shadow-sm">
                                    Mode:
                                    <span className={cn(
                                        "ml-1",
                                        razorpay.key_id?.startsWith('rzp_test') ? 'text-amber-600' : 'text-blue-600'
                                    )}>
                                        {razorpay.key_id?.startsWith('rzp_test') ? 'TEST MODE' : 'LIVE MODE'}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <Separator className="bg-white/10" />
                        <CardContent className="space-y-8 px-8 pb-8 pt-8">
                            <div className="grid grid-cols-1 gap-8">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="key_id" className="text-sm font-bold text-[var(--color-primary-font)]/70">Key ID <span className="text-red-500">*</span></Label>
                                         <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs font-bold text-[var(--color-primary-font)]/70 hover:text-[var(--primary)] bg-transparent px-2"
                                            onClick={() => handleCopy(razorpay.key_id, "Key ID")}
                                        >
                                            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                                        </Button>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 rounded text-[var(--color-primary-font)]/70 group-focus-within:bg-[var(--primary)]/10 group-focus-within:text-[var(--primary)] transition-colors">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                        </div>
                                        <Input
                                            id="key_id"
                                            placeholder="rzp_test_..."
                                            className="glass-input h-12 pl-12 font-medium rounded-lg transition-all"
                                            value={razorpay.key_id}
                                            onChange={(e) => handleRazorpayChange('key_id', e.target.value)}
                                            maxLength={50}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <ExternalLink className="h-3 w-3 text-[var(--primary)]" />
                                        <a href="https://dashboard.razorpay.com/app/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-[var(--primary)] hover:underline">
                                            Get API Keys from Razorpay Dashboard
                                        </a>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="key_secret" className="text-sm font-bold text-[var(--color-primary-font)]/70">Key Secret <span className="text-red-500">*</span></Label>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs font-bold text-[var(--color-primary-font)]/70 hover:text-[var(--primary)] bg-transparent px-2"
                                                onClick={() => handleCopy(razorpay.key_secret || "", "Key Secret")}
                                                disabled={!razorpay.key_secret}
                                            >
                                                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 rounded text-[var(--color-primary-font)]/70 group-focus-within:bg-[var(--primary)]/10 group-focus-within:text-[var(--primary)] transition-colors">
                                            <Key className="h-3.5 w-3.5" />
                                        </div>
                                        <Input
                                            id="key_secret"
                                            type={showRazorpaySecret ? "text" : "password"}
                                            placeholder={razorpay.key_secret ? "••••••••" : "Enter new account secret code"}
                                            className="glass-input h-12 pl-12 pr-11 font-medium rounded-lg transition-all placeholder:text-[var(--color-primary-font)]/40 italic"
                                            value={razorpay.key_secret}
                                            onChange={(e) => handleRazorpayChange('key_secret', e.target.value)}
                                            maxLength={50}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-primary-font)]/70 hover:text-slate-600 focus:outline-none transition-colors"
                                        >
                                            {showRazorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5 px-1 py-0.5">
                                        <ShieldCheck className="h-3 w-3" />
                                        Saved keys are encrypted and stored securely.
                                    </p>
                                    {lastUpdated && (
                                        <p className="text-[10px] font-medium text-[var(--color-primary-font)]/70 italic px-1 mt-2">
                                            Last modified: {lastUpdated}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notifications & Email Templates */}
                    <Card id="notifications-section" className="glass-agent overflow-hidden scroll-mt-24 transition-all duration-500">
                        <CardHeader className="pb-6 pt-8 px-8">
                            <div className="flex items-center gap-5">
                                <div className="p-3.5 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-2xl text-[var(--primary)] border border-white/40 shadow-sm">
                                    <Bell className="h-6 w-6" />
                                </div>
                                <div className="space-y-1.5">
                                    <CardTitle className="text-2xl font-extrabold text-[var(--color-primary-font)] tracking-tight flex items-center gap-3">
                                        Notifications & Email Visuals
                                    </CardTitle>
                                    <CardDescription className="text-sm font-semibold text-[var(--color-primary-font)]">
                                        Customize the layout and design of automated emails sent to your customers.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <Separator className="bg-white/10" />
                        <CardContent className="px-8 pb-8 pt-6">
                             <div className="bg-white/10 backdrop-blur-xl rounded-[48px] border border-white/20 p-4 md:p-6 shadow-2xl shadow-black/20 overflow-hidden relative">
                                <EmailTemplateEditor
                                    initialTemplates={emailTemplates}
                                    agencyLogo={settingsData?.homepage_settings?.navbar_logo_image}
                                    onSave={async (newTemplates) => {
                                        const token = localStorage.getItem('token') || '';
                                        setEmailTemplates(newTemplates);

                                        const res = await fetch(`${API_URL}/api/v1/agent/settings/homepage`, {
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify({
                                                email_templates: newTemplates
                                            })
                                        });

                                        if (!res.ok) {
                                            const err = await res.json();
                                            throw new Error(err.detail || "Failed to save templates");
                                        }
                                        toast.success("Email templates updated successfully");
                                    }}
                                />
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
