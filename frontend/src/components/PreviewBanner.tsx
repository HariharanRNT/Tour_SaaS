'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Eye, CheckCircle, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useState, useEffect } from 'react'

export function PreviewBanner() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const isPreview = searchParams.get('preview') === 'true'
    const [isPublishing, setIsPublishing] = useState(false)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Only show if preview=true and token exists
        if (isPreview && localStorage.getItem('token')) {
            setIsVisible(true)
        }
    }, [isPreview])

    if (!isVisible) return null

    const handlePublish = async () => {
        setIsPublishing(true)
        try {
            const token = localStorage.getItem('token')

            // 1. Check if there is a preview theme in sessionStorage that needs saving first
            const previewData = sessionStorage.getItem('preview_theme')
            if (previewData) {
                try {
                    const localTheme = JSON.parse(previewData)
                    // Save to draft version in DB
                    await axios.put(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/theme/agent`,
                        localTheme,
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                } catch (e) {
                    console.error("Failed to auto-save sessionStorage theme before publish", e)
                }
            }

            // 2. Publish
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/theme/publish`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            )

            // 3. Cleanup sessionStorage after successful publish
            sessionStorage.removeItem('preview_theme')

            toast.success("Theme published to all customers!")
            // Remove preview param and reload to show live theme
            const params = new URLSearchParams(searchParams.toString())
            params.delete('preview')
            router.push(`/${params.toString() ? `?${params.toString()}` : ''}`)
            // Force a reload to ensure theme updates across the site
            window.location.href = window.location.origin + (params.toString() ? `?${params.toString()}` : '')
        } catch (error) {
            console.error("Publish failed:", error)
            toast.error("Failed to publish changes")
        } finally {
            setIsPublishing(false)
        }
    }

    const handleBackToSettings = () => {
        router.push('/agent/settings/theme')
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-slate-900 text-white py-2 px-4 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-500/20 p-1.5 rounded-full">
                        <Eye className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="text-sm font-medium">
                        <span className="text-blue-400 font-bold mr-1">PREVIEW MODE</span>
                        — These changes are not live yet
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToSettings}
                        className="text-white hover:bg-slate-800 h-8 text-xs font-semibold"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                        Back to Settings
                    </Button>

                    <Button
                        size="sm"
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="bg-blue-500 hover:bg-blue-600 text-white border-0 h-8 text-xs font-bold px-4 shadow-sm"
                    >
                        {isPublishing ? (
                            "Publishing..."
                        ) : (
                            <>
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                Publish Now
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
