'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'react-toastify'

export default function AgentSettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [settings, setSettings] = useState({
        currency: 'INR',
        smtp_host: '',
        smtp_port: '587',
        smtp_user: '',
        smtp_password: '',
        smtp_from_email: ''
    })

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
                setSettings({
                    currency: data.currency || 'INR',
                    smtp_host: data.smtp_host || '',
                    smtp_port: data.smtp_port?.toString() || '587',
                    smtp_user: data.smtp_user || '',
                    smtp_password: '', // Don't verify/show password
                    smtp_from_email: data.smtp_from_email || ''
                })
            } else {
                console.error("Failed to fetch settings")
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
            toast.error("Failed to load settings.")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const token = localStorage.getItem('token')
            const payload = {
                currency: settings.currency,
                smtp_host: settings.smtp_host,
                smtp_port: parseInt(settings.smtp_port),
                smtp_user: settings.smtp_user,
                smtp_from_email: settings.smtp_from_email,
                smtp_password: settings.smtp_password || undefined // Only send if set
            }

            const res = await fetch('http://localhost:8000/api/v1/agent/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                toast.success("Settings updated successfully.")
                // Don't clear password field, just keep current state
            } else {
                throw new Error('Failed to update')
            }
        } catch (error) {
            console.error('Failed to update settings:', error)
            toast.error("Failed to update settings.")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto space-y-6">

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                        <p className="text-muted-foreground">Manage your agency preferences and integrations.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                        {/* General Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle>General Preferences</CardTitle>
                                <CardDescription>Default currency and localization.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="currency">Default Currency</Label>
                                    <Input
                                        id="currency"
                                        value={settings.currency}
                                        onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                        maxLength={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* SMTP Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle>SMTP Configuration</CardTitle>
                                <CardDescription>
                                    Configure your own email server for sending booking confirmations to customers.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="smtp_host">SMTP Host</Label>
                                        <Input
                                            id="smtp_host"
                                            placeholder="smtp.gmail.com"
                                            value={settings.smtp_host}
                                            onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="smtp_port">SMTP Port</Label>
                                        <Input
                                            id="smtp_port"
                                            placeholder="587"
                                            value={settings.smtp_port}
                                            onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="smtp_user">SMTP User / Email</Label>
                                    <Input
                                        id="smtp_user"
                                        type="email"
                                        placeholder="your-email@example.com"
                                        value={settings.smtp_user}
                                        onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="smtp_password">SMTP Password</Label>
                                    <Input
                                        id="smtp_password"
                                        type="password"
                                        placeholder="App Password (leave empty to keep unchanged)"
                                        value={settings.smtp_password}
                                        onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Note: Your password is stored securely. For Gmail, use an App Password.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="smtp_from_email">Sender Email (From)</Label>
                                    <Input
                                        id="smtp_from_email"
                                        type="email"
                                        placeholder="no-reply@youragency.com"
                                        value={settings.smtp_from_email}
                                        onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
