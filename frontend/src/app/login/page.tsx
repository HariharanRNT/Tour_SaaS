'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authAPI } from '@/lib/api'

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const nextUrl = searchParams.get('next')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [agentInfo, setAgentInfo] = useState<{ agency_name: string | null; agent_name: string | null } | null>(null)

    useEffect(() => {
        const fetchAgentInfo = async () => {
            try {
                const info = await authAPI.getPublicAgentInfo()
                if (info && info.agency_name) {
                    setAgentInfo(info)
                }
            } catch (error) {
                console.error("Failed to load agent info", error)
            }
        }
        fetchAgentInfo()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const data = await authAPI.login(email, password)
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify(data.user))

            // Redirect based on role
            if (nextUrl) {
                router.push(nextUrl)
            } else if (data.user.role === 'admin') {
                localStorage.setItem('isAdmin', 'true') // Legacy support
                router.push('/admin/dashboard')
            } else if (data.user.role === 'agent') {
                router.push('/agent/dashboard')
            } else {
                router.push('/')
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <Card className="shadow-xl border-t-4 border-t-blue-600">
                    <CardHeader className="space-y-1 text-center pb-2">
                        <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-2">
                            <span className="text-2xl">✈️</span>
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">
                            {agentInfo?.agency_name ? `Welcome to ${agentInfo.agency_name}` : 'Welcome back'}
                        </CardTitle>
                        <CardDescription className="text-base text-gray-500">
                            {agentInfo?.agency_name
                                ? `Sign in to access your bookings with ${agentInfo.agent_name || agentInfo.agency_name}`
                                : 'Enter your credentials to access your account'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 flex items-center gap-2">
                                    <span className="font-bold">Error:</span> {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Email Address</label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    required
                                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Password</label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all font-medium"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-semibold bg-gray-900 hover:bg-gray-800 transition-all shadow-md mt-2"
                                disabled={loading}
                            >
                                {loading ? 'Logging in...' : 'Sign in to Account'}
                            </Button>

                            <div className="text-center text-sm pt-2">
                                <span className="text-gray-500">Don't have an account? </span>
                                <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-colors">
                                    Create account
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Dev Helper - Styled neatly */}
                <div className="mx-auto max-w-xs text-center">
                    <div className="bg-white/50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 backdrop-blur-sm">
                        <p className="font-semibold text-gray-700 mb-1">Demo Credentials:</p>
                        <div className="font-mono bg-gray-100/50 rounded p-1 inline-block text-left px-3">
                            <div>user: john.doe@example.com</div>
                            <div>pass: password123</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
