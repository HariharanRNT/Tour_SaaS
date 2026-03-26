'use client'

import React from 'react'
import { Card } from "@/components/ui/card"
import { motion } from 'framer-motion'
import ExportCSVButton from './ExportCSVButton'

interface ReportSectionProps {
    title: string
    description?: string
    onExport?: () => void
    children: React.ReactNode
    className?: string
    icon?: React.ElementType
    exportData?: any[]
    onExportFetch?: () => Promise<any[]>
    exportFilename?: string
}

export default function ReportSection({ 
    title, 
    description, 
    children, 
    className = "", 
    icon: Icon,
    exportData,
    onExportFetch,
    exportFilename
}: ReportSectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[24px] overflow-hidden bg-white/45 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_rgba(200,80,30,0.1)] mb-8 ${className}`}
        >
            <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-white/40 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                            <Icon className="w-4.5 h-4.5" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-[16px] font-bold text-slate-800 tracking-tight">{title}</h3>
                        {description && <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">{description}</p>}
                    </div>
                </div>
                {(exportData || onExportFetch) && (
                    <ExportCSVButton 
                        data={exportData}
                        onFetch={onExportFetch}
                        filename={exportFilename || `report_${title.toLowerCase().replace(/\s+/g, '_')}`} 
                    />
                )}
            </div>
            <div className="p-6">
                {children}
            </div>
        </motion.div>
    )
}
