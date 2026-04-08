'use client'

import React from 'react'

interface Column {
    header: string
    accessor: string | ((row: any) => React.ReactNode)
    className?: string
    sortKey?: string
}

interface DataTableProps {
    columns: Column[]
    data: any[]
    isLoading?: boolean
    emptyMessage?: string
    sortConfig?: { key: string, direction: 'asc' | 'desc' }
    onSort?: (key: string) => void
}

export default function DataTable({ 
    columns, 
    data, 
    isLoading, 
    emptyMessage = "No data found",
    sortConfig,
    onSort
}: DataTableProps) {
    return (
        <div className="overflow-x-auto relative -mx-2 px-2 scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className="border-b border-slate-200/60">
                        {columns.map((col, idx) => {
                            const sortKey = col.sortKey || (typeof col.accessor === 'string' ? col.accessor : null)
                            return (
                                <th 
                                    key={idx} 
                                    className={`text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary-font)] font-black pb-4 pt-2 px-4 whitespace-nowrap ${onSort && sortKey ? 'cursor-pointer hover:text-orange-600 transition-colors' : ''} ${col.className || ''}`}
                                    onClick={() => onSort && sortKey && onSort(sortKey)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {col.header}
                                        {onSort && sortKey && sortConfig?.key === sortKey && (
                                            <span className={`transition-transform inline-block ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}>
                                                ▼
                                            </span>
                                        )}
                                    </div>
                                </th>
                            )
                        })}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                        <tr>
                            <td colSpan={columns.length} className="py-12 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                                    <span className="text-[12px] text-[var(--color-primary-font)] font-bold uppercase tracking-widest">Loading...</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="py-12 text-center text-[var(--color-primary-font)] text-[13px] font-medium">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIdx) => (
                            <tr key={rowIdx} className="group hover:bg-white/40 transition-colors">
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} className={`py-4 px-4 text-[13px] text-[var(--color-primary-font)] ${col.className || ''}`}>
                                        {typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
