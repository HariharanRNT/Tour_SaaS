'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Download } from 'lucide-react'
import { format } from 'date-fns'

interface ExportCSVButtonProps {
    data: any[]
    filename: string
    className?: string
}

export default function ExportCSVButton({ data, filename, className = "" }: ExportCSVButtonProps) {
    const handleExport = () => {
        if (!data || data.length === 0) return

        // Generic CSV conversion
        const headers = Object.keys(data[0]).join(",")
        const rows = data.map(row => 
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

    return (
        <Button 
            variant="ghost" 
            onClick={handleExport}
            disabled={!data || data.length === 0}
            className={`gap-2 bg-white/50 border border-white/60 hover:bg-white/80 rounded-[12px] px-4 py-2 text-[12px] font-semibold text-slate-700 transition-all hover:shadow-md h-9 ${className}`}
        >
            <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
    )
}
