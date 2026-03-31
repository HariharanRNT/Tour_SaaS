'use client'

import { API_URL } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Lock, Mail, Eye, EyeOff, Check, AlertCircle, Copy, Key, Lightbulb, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

export default function AdminLoginPage() {
    const router = useRouter()
    const { login: authLogin } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // New state for enhanced UX
    const [showPassword, setShowPassword] = useState(false)
    const [emailFocused, setEmailFocused] = useState(false)
    const [passwordFocused, setPasswordFocused] = useState(false)
    const [emailValid, setEmailValid] = useState<boolean | null>(null)
    const [formShake, setFormShake] = useState(false)
    const [isDemoOpen, setIsDemoOpen] = useState(false)

    // Email validation
    useEffect(() => {
        if (email.length === 0) {
            setEmailValid(null)
            return
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        setEmailValid(emailRegex.test(email))
    }, [email])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        setFormShake(false)

        try {
            // Call login API
            const response = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'username': email,
                    'password': password
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed')
            }

            // Verify admin role
            if (data.user.role.toUpperCase() !== 'ADMIN') {
                throw new Error('Access denied: Admin privileges required')
            }

            // Store session
            authLogin(data.access_token, data.user)
            localStorage.setItem('isAdmin', 'true')

            // Redirect to admin dashboard
            router.push('/admin/dashboard')
        } catch (err: any) {
            console.error('Login error:', err)
            setError(err.message || 'An error occurred during login')
            setFormShake(true)
            setTimeout(() => setFormShake(false), 500)
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = async (text: string, type: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success(`${type} copied to clipboard!`)
        } catch (err) {
            toast.error('Failed to copy')
        }
    }

    const autoFillDemo = () => {
        // Typewriter effect for auto-fill
        const targetEmail = 'admin@globaltours.com';
        const targetPass = 'adminpassword123';
        let emailIdx = 0;
        let passIdx = 0;

        setEmail('');
        setPassword('');
        setEmailFocused(true);
        setPasswordFocused(true);

        const fillEmail = setInterval(() => {
            setEmail(targetEmail.substring(0, emailIdx + 1));
            emailIdx++;
            if (emailIdx === targetEmail.length) {
                clearInterval(fillEmail);
                const fillPass = setInterval(() => {
                    setPassword(targetPass.substring(0, passIdx + 1));
                    passIdx++;
                    if (passIdx === targetPass.length) {
                        clearInterval(fillPass);
                        toast.success('Demo credentials filled!');
                        setShowPassword(false);
                        setEmailFocused(false);
                        setPasswordFocused(false);
                    }
                }, 40);
            }
        }, 40);
    }

    return (
        <div className="min-h-screen bg-[#FFF3E8] flex w-full relative overflow-hidden noise-overlay">
            {/* Ambient Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#FFD8B5]/60 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#FFB38A]/50 blur-[150px] pointer-events-none" />
            <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-[#FFD8B5]/40 blur-[100px] pointer-events-none" />

            {/* Mesh Gradient Overlay with Vignette fade */}
            <div className="absolute inset-0 opacity-80 mix-blend-overlay" style={{
                backgroundImage: 'radial-gradient(at 0% 0%, #FFF3E8 0, transparent 50%), radial-gradient(at 100% 100%, #FFD8B5 0, transparent 60%), radial-gradient(at 50% 50%, #FFB38A 0, transparent 100%), radial-gradient(circle, transparent 40%, rgba(255,179,138,0.2) 100%)'
            }} />

            {/* Split Screen Layout Container */}
            <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row relative z-10 min-h-screen">

                {/* Left Side: Brand Message (40%) */}
                <div className="w-full lg:w-[45%] flex flex-col justify-center p-8 lg:p-12 animate-in fade-in slide-in-from-left-8 duration-700">
                    <div className="space-y-6 max-w-lg">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-white/40 p-3 rounded-2xl backdrop-blur-md border border-white/50 shadow-sm flex items-center justify-center">
                                <span className="text-3xl block">✈️</span>
                            </div>
                            <span className="font-bold text-3xl tracking-tight text-[#5C2500]">TourSaaS</span>
                        </div>

                        <h1 className="text-4xl lg:text-5xl font-bold text-[#3A1A08] leading-tight">
                            Manage your travel<br />empire seamlessly.
                        </h1>

                        <p className="text-lg text-[#6B3F2A] font-medium leading-relaxed max-w-md">
                            The intelligent command center for modern tour operators to monitor bookings, manage packages, and grow revenue.
                        </p>
                    </div>
                </div>

                {/* Right Side: Login Card (60%) */}
                <div className="w-full lg:w-[55%] flex items-center justify-center p-4 lg:p-12">
                    <Card className={`glass-panel w-full max-w-[420px] shadow-[0_20px_60px_rgba(255,122,69,0.25)] bg-white/25 backdrop-blur-[25px] border border-white/35 rounded-[28px] p-2 sm:p-4 relative z-10 animate-in fade-in slide-in-from-right-8 animate-duration-[800ms] ${formShake ? 'animate-shake' : ''}`}>
                        <CardHeader className="space-y-6 pb-8 pt-8 px-4 sm:px-6">
                            <div className="flex flex-col items-center justify-center space-y-6 mb-2">

                                {/* 80px Glass Lock Circle with Breathing Animation */}
                                <div className="relative w-[80px] h-[80px] flex items-center justify-center animate-pulse-slow">
                                    <div className="absolute inset-0 bg-[#FF7A45] rounded-full blur-[20px] opacity-30" />
                                    <div className="w-full h-full bg-white/20 backdrop-blur-md rounded-full border border-white/40 shadow-[0_8px_32px_rgba(255,122,69,0.3)] flex items-center justify-center relative z-10 overflow-hidden">
                                        <div className="absolute inset-x-0 bottom-0 top-[20%] bg-gradient-to-br from-[#FF7A45] to-[#FFB38A] opacity-90 rounded-full blur-md mix-blend-overlay" />
                                        <Lock className="h-8 w-8 text-[#FF7A45] relative z-20 drop-shadow-md" />
                                    </div>
                                </div>

                                <div className="text-center space-y-3 w-full">
                                    <CardTitle className="text-[12px] text-center font-bold text-[#FF7A45] tracking-[0.2em] uppercase">
                                        Admin Portal
                                    </CardTitle>
                                    <CardDescription className="text-center font-medium text-[#6B3F2A] text-[15px]">
                                        Enter your credentials to securely manage the platform
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleLogin} className="space-y-6">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2" role="alert">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                )}

                                {/* Email Field with Floating Label */}
                                <div className="relative group/input animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
                                    <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-300 z-10 ${emailFocused || email ? 'text-[#FF7A45]' : 'text-orange-900/40'}`} />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onFocus={() => setEmailFocused(true)}
                                        onBlur={() => setEmailFocused(false)}
                                        className={`
                                    pl-12 pr-10 h-14 bg-white/35 backdrop-blur-[10px] border border-white/40 rounded-[18px] 
                                    transition-all duration-300 text-[#5C2500] font-medium 
                                    hover:bg-white/50 
                                    focus-visible:ring-0 focus-visible:ring-offset-0 
                                    ${emailFocused ? 'border-[#FF7A45] shadow-[0_0_12px_rgba(255,122,69,0.4)] bg-white/50' : ''}
                                    ${emailValid === false ? 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.25)]' : ''} 
                                    ${emailValid === true ? 'border-green-400 focus:border-green-500' : ''}
                                `}
                                        required
                                    />
                                    {emailValid === true && (
                                        <Check className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                                    )}
                                    {emailValid === false && (
                                        <AlertCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
                                    )}
                                    <label
                                        htmlFor="email"
                                        className={`absolute left-12 transition-all duration-300 pointer-events-none origin-left
                                    ${emailFocused || email
                                                ? '-top-2.5 text-[11px] font-bold text-[#FF7A45] uppercase tracking-wider bg-[#FFF3E8] px-2 rounded-full shadow-sm border border-orange-200/50'
                                                : 'top-1/2 -translate-y-1/2 text-[15px] text-[#7A3E14]/60'
                                            }`}
                                    >
                                        Email address
                                    </label>
                                </div>

                                {/* Password Field with Floating Label */}
                                <div className="relative group/input animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-both">
                                    <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-300 z-10 ${passwordFocused || password ? 'text-[#FF7A45]' : 'text-orange-900/40'}`} />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => setPasswordFocused(false)}
                                        className={`
                                    pl-12 pr-12 h-14 bg-white/35 backdrop-blur-[10px] border border-white/40 rounded-[18px] 
                                    transition-all duration-300 text-[#5C2500] font-medium 
                                    hover:bg-white/50 
                                    focus-visible:ring-0 focus-visible:ring-offset-0 
                                    ${passwordFocused ? 'border-[#FF7A45] shadow-[0_0_12px_rgba(255,122,69,0.4)] bg-white/50' : ''}
                                `}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#FF7A45]/60 hover:text-[#FF7A45] transition-colors focus:outline-none"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                    <label
                                        htmlFor="password"
                                        className={`absolute left-12 transition-all duration-300 pointer-events-none origin-left
                                    ${passwordFocused || password
                                                ? '-top-2.5 text-[11px] font-bold text-[#FF7A45] uppercase tracking-wider bg-[#FFF3E8] px-2 rounded-full shadow-sm border border-orange-200/50'
                                                : 'top-1/2 -translate-y-1/2 text-[15px] text-[#7A3E14]/60'
                                            }`}
                                    >
                                        Password
                                    </label>
                                </div>

                                <div className="pt-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 fill-mode-both px-6">
                                    <Button
                                        type="submit"
                                        className="w-full h-14 rounded-[30px] text-[16px] font-bold shadow-[0_8px_24px_rgba(255,122,69,0.25)] hover:shadow-[0_12px_32px_rgba(255,122,69,0.4)] transition-all duration-300 hover:-translate-y-1 active:translate-y-[1px] bg-gradient-to-r from-[#FF7A45] to-[#FFB38A] hover:bg-gradient-to-r hover:from-[#E66230] hover:to-[#FFA06A] text-white border-none group relative overflow-hidden"
                                        disabled={loading}
                                    >
                                        {/* Button Hover Shine Effect */}
                                        <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 transition-all duration-500" />

                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Authenticating...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="mr-2 h-5 w-5 opacity-90" />
                                                Login
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Collapsible Demo Credentials */}
                                <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500 fill-mode-both relative z-20 px-4 sm:px-6 w-full">
                                    <button
                                        type="button"
                                        onClick={() => setIsDemoOpen(!isDemoOpen)}
                                        className="w-full flex items-center justify-center gap-2 text-[#6B3F2A] hover:text-[#FF7A45] transition-colors py-2 text-sm font-medium"
                                    >
                                        <span className={`transition-transform duration-300 ${isDemoOpen ? 'rotate-180' : ''}`}>▼</span>
                                        Demo Credentials
                                    </button>

                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isDemoOpen ? 'max-h-[300px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                                        <div className="bg-white/30 backdrop-blur-[10px] border border-white/40 rounded-[20px] p-4 space-y-3 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#FFF3E8]/50 to-transparent pointer-events-none" />

                                            <div className="space-y-2 relative z-10 w-full">
                                                <div className="flex items-center justify-between bg-black/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 group/cred">
                                                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                        <Mail className="h-4 w-4 text-[#FF7A45]/80 flex-shrink-0" />
                                                        <span className="text-[13px] font-mono font-medium text-[#6B3F2A] truncate">admin@globaltours.com</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard('admin@globaltours.com', 'Email')}
                                                        className="text-[#FF7A45]/60 hover:text-[#FF7A45] transition-colors bg-white/50 p-1.5 rounded-md hover:bg-white/80 shrink-0 ml-2"
                                                        aria-label="Copy email"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between bg-black/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 group/cred">
                                                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                        <Key className="h-4 w-4 text-[#FF7A45]/80 flex-shrink-0" />
                                                        <span className="text-[13px] font-mono font-medium text-[#6B3F2A] truncate">adminpassword123</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard('adminpassword123', 'Password')}
                                                        className="text-[#FF7A45]/60 hover:text-[#FF7A45] transition-colors bg-white/50 p-1.5 rounded-md hover:bg-white/80 shrink-0 ml-2"
                                                        aria-label="Copy password"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={autoFillDemo}
                                                className="w-full h-10 rounded-[20px] border border-[#FF7A45]/40 text-[#FF7A45] text-sm font-bold tracking-wide hover:bg-[#FF7A45]/10 hover:border-[#FF7A45] transition-all bg-transparent relative z-10"
                                            >
                                                Auto-fill
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="text-center text-[11px] font-bold text-[#FFCBA4] pt-6 relative border-t border-white/20 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-700 fill-mode-both">
                                    <div className="flex items-center justify-center gap-2 tracking-wide">
                                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" />
                                        <span>SECURE LOGIN · SSL ENCRYPTED</span>
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <style jsx global>{`
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }

                @keyframes card-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }

                .animate-card-float {
                    animation: card-float 6s ease-in-out infinite;
                }
                
                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.3); opacity: 0.1; }
                    100% { transform: scale(1); opacity: 0.4; }
                }
                
                .animate-pulse-ring {
                    animation: pulse-ring 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                @keyframes breath-glow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                }

                .animate-breath-glow {
                    animation: breath-glow 4s ease-in-out infinite;
                }

                @keyframes breath-scale {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }

                .animate-breath-scale {
                    animation: breath-scale 4s ease-in-out infinite;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
                </div>
            </div>
        </div>
    )
}
