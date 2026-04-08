'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Download } from 'lucide-react'
import { format } from 'date-fns'

interface ExportCSVButtonProps {
    data?: any[]
    onFetch?: () => Promise<any[]>
    filename: string
    className?: string
}

export default function ExportCSVButton({ data, onFetch, filename, className = "" }: ExportCSVButtonProps) {
    const [loading, setLoading] = React.useState(false)

    const handleExport = async () => {
        let exportData = data
        
        if (onFetch) {
            setLoading(true)
            try {
                exportData = await onFetch()
            } catch (error) {
                console.error("Export fetch failed:", error)
                return
            } finally {
                setLoading(false)
            }
        }

        if (!exportData || exportData.length === 0) return

        // Generic CSV conversion
        const headers = Object.keys(exportData[0]).join(",")
        const rows = exportData.map(row => 
            Object.values(row).map(val => {
                // Handle escaping commas and quotes
                const s = String(val)
                if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
                    return `"${s.replace(/"/g, '""')}"`
                }
                return s
            }).join(",")
        )
        const csvContent = [headers, ...rows].join("\n")

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const isDisabled = loading || (!onFetch && (!data || data.length === 0))

    return (
        <Button 
            variant="ghost" 
            onClick={handleExport}
            disabled={isDisabled}
            className={`gap-2 bg-white/50 border border-white/60 hover:bg-white/80 rounded-[12px] px-4 py-2 text-[12px] font-semibold text-[var(--color-primary-font)] transition-all hover:shadow-md h-9 ${className}`}
        >
            <Download className={`h-3.5 w-3.5 ${loading ? 'animate-bounce' : ''}`} /> 
            {loading ? 'Fetching...' : 'Export CSV'}
        </Button>
    )
}
