'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authAPI } from '@/lib/api'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

export default function RegisterPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const data = await authAPI.register(formData)
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify(data.user))
            router.push('/')
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed')
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
                        <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">Create Account</CardTitle>
                        <CardDescription className="text-base text-gray-500">
                            Sign up to start booking amazing tours
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 flex items-center gap-2">
                                    <span className="font-bold">Error:</span> {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">First Name</label>
                                    <Input
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        required
                                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Last Name</label>
                                    <Input
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        required
                                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Email Address</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    placeholder="name@example.com"
                                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Phone (Optional)</label>
                                <PhoneInput
                                    country={'in'}
                                    value={formData.phone}
                                    onChange={phone => setFormData({ ...formData, phone })}
                                    inputProps={{
                                        name: 'phone',
                                        id: 'phone'
                                    }}
                                    containerClass="w-full !rounded-md"
                                    inputClass="!w-full !h-11 !text-sm !border-gray-300 !rounded-md focus:!border-blue-500 focus:!ring-blue-500"
                                    buttonClass="!border-gray-300 !rounded-l-md !bg-white"
                                    dropdownClass="!rounded-md !shadow-lg"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Password</label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all font-medium"
                                />
                                <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-semibold bg-gray-900 hover:bg-gray-800 transition-all shadow-md mt-4"
                                disabled={loading}
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                            </Button>

                            <div className="text-center text-sm pt-2">
                                <span className="text-gray-500">Already have an account? </span>
                                <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-colors">
                                    Sign in
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
