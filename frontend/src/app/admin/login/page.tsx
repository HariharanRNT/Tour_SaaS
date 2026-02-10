'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Lock, Mail, Eye, EyeOff, Check, AlertCircle, Copy, Key, Lightbulb, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'

export default function AdminLoginPage() {
    const router = useRouter()
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
            const response = await fetch('http://localhost:8000/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'username': email,
                    'password': password,
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed')
            }

            // Verify admin role
            if (data.user.role !== 'admin') {
                throw new Error('Access denied: Admin privileges required')
            }

            // Store session
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify(data.user))
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
        setEmail('admin@globaltours.com')
        setPassword('adminpassword123')
        toast.success('Demo credentials filled!')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center p-4 relative overflow-hidden animate-gradient">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} />
            </div>

            <Card className={`w-full max-w-md shadow-2xl border border-gray-100 rounded-2xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ${formShake ? 'animate-shake' : ''}`}>
                <CardHeader className="space-y-3 pb-6">
                    <div className="flex items-center justify-center mb-2">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-full shadow-lg animate-pulse-slow">
                            <Lock className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-4xl text-center font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Admin Login
                    </CardTitle>
                    <CardDescription className="text-center text-gray-400 text-base">
                        Enter your credentials to access the admin panel
                    </CardDescription>
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
                        <div className="relative">
                            <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors ${emailFocused || email ? 'text-blue-500' : 'text-gray-400'}`} />
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => setEmailFocused(false)}
                                className={`pl-10 pr-10 h-14 bg-gray-50 border-2 rounded-lg transition-all duration-200 ${emailFocused ? 'border-blue-500 shadow-md' : 'border-gray-200'
                                    } ${emailValid === false ? 'border-red-500' : ''} ${emailValid === true ? 'border-green-500' : ''}`}
                                placeholder="Email address"
                                required
                            />
                            {emailValid === true && (
                                <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                            )}
                            {emailValid === false && (
                                <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
                            )}
                            <label
                                htmlFor="email"
                                className={`absolute left-10 transition-all duration-200 pointer-events-none ${emailFocused || email
                                        ? '-top-2.5 text-xs bg-white px-1 text-blue-600 font-medium'
                                        : 'top-1/2 -translate-y-1/2 text-gray-500'
                                    }`}
                            >
                                {emailFocused || email ? 'Email' : ''}
                            </label>
                        </div>

                        {/* Password Field with Floating Label */}
                        <div className="relative">
                            <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors ${passwordFocused || password ? 'text-blue-500' : 'text-gray-400'}`} />
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                className={`pl-10 pr-10 h-14 bg-gray-50 border-2 rounded-lg transition-all duration-200 ${passwordFocused ? 'border-blue-500 shadow-md' : 'border-gray-200'
                                    }`}
                                placeholder="Password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                            <label
                                htmlFor="password"
                                className={`absolute left-10 transition-all duration-200 pointer-events-none ${passwordFocused || password
                                        ? '-top-2.5 text-xs bg-white px-1 text-blue-600 font-medium'
                                        : 'top-1/2 -translate-y-1/2 text-gray-500'
                                    }`}
                            >
                                {passwordFocused || password ? 'Password' : ''}
                            </label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Logging in...
                                </>
                            ) : (
                                'Login'
                            )}
                        </Button>

                        {/* Enhanced Demo Credentials Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3 mt-6">
                            <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                <Lightbulb className="h-5 w-5" />
                                <span>Demo Credentials</span>
                            </div>
                            <div className="h-px bg-blue-200" />

                            <div className="space-y-2">
                                <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                                    <div className="flex items-center gap-2 flex-1">
                                        <Mail className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-mono text-gray-700">admin@globaltours.com</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard('admin@globaltours.com', 'Email')}
                                        className="text-blue-600 hover:text-blue-700 transition-colors"
                                        aria-label="Copy email"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                                    <div className="flex items-center gap-2 flex-1">
                                        <Key className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-mono text-gray-700">adminpassword123</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard('adminpassword123', 'Password')}
                                        className="text-blue-600 hover:text-blue-700 transition-colors"
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
                                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                            >
                                Auto-fill Demo Credentials
                            </Button>
                        </div>

                        {/* Footer */}
                        <div className="text-center text-xs text-gray-500 pt-2">
                            <div className="flex items-center justify-center gap-1">
                                <Lock className="h-3 w-3" />
                                <span>Secure Login - SSL Encrypted</span>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <style jsx global>{`
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 15s ease infinite;
                }
                
                .animate-pulse-slow {
                    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                
                .animate-shake {
                    animation: shake 0.5s;
                }
            `}</style>
        </div>
    )
}
