'use client'

import React from 'react'
import { Check, Shield, Eye, Edit3, Settings, Package, Map, Calendar, Receipt, BarChart2, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AccessLevel = 'view' | 'edit' | 'full'

export interface ModulePermission {
    module: string
    access_level: AccessLevel
}

interface PermissionMatrixProps {
    permissions: ModulePermission[]
    onChange: (permissions: ModulePermission[]) => void
}

const MODULES = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview of bookings and revenue' },
    { id: 'packages', label: 'Manage Packages', icon: Package, desc: 'Create and edit tour packages' },
    { id: 'activities', label: 'Activity Master', icon: Map, desc: 'Manage global activity database' },
    { id: 'bookings', label: 'Booking Report', icon: Calendar, desc: 'View and manage customer bookings' },
    { id: 'billing', label: 'Billing', icon: Receipt, desc: 'Manage subscriptions and invoices' },
    { id: 'finance_reports', label: 'Finance Reports', icon: BarChart2, desc: 'Revenue and commission analysis' },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Agency profile and configuration' },
]

export function PermissionMatrix({ permissions, onChange }: PermissionMatrixProps) {
    const toggleModule = (moduleId: string) => {
        const exists = permissions.find(p => p.module === moduleId)
        if (exists) {
            onChange(permissions.filter(p => p.module !== moduleId))
        } else {
            onChange([...permissions, { module: moduleId, access_level: 'view' }])
        }
    }

    const setLevel = (moduleId: string, level: AccessLevel) => {
        onChange(permissions.map(p => 
            p.module === moduleId ? { ...p, access_level: level } : p
        ))
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {MODULES.map((mod) => {
                const perm = permissions.find(p => p.module === mod.id)
                const isActive = !!perm

                return (
                    <div 
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleModule(mod.id);
                            }
                        }}
                        className={cn(
                            "relative group rounded-2xl border transition-all duration-300 p-4 shrink-0 cursor-pointer",
                            isActive 
                                ? "bg-white border-orange-500/30 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500/10" 
                                : "bg-white/20 backdrop-blur-md border-white/40 hover:bg-white/30 hover:border-black/10 shadow-sm"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            {/* Icon & Toggle Area */}
                            <div 
                                className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                    isActive ? "bg-orange-500 text-white" : "bg-black/10 text-black"
                                )}
                            >
                                <mod.icon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0 pr-8">
                                <h4 className={cn("text-sm font-black uppercase tracking-tight", isActive ? "text-black" : "text-black opacity-70")}>
                                    {mod.label}
                                </h4>
                                <p className={cn("text-[11px] leading-tight mt-0.5 font-bold", isActive ? "text-black opacity-80" : "text-black opacity-50")}>
                                    {mod.desc}
                                </p>
                            </div>

                            {/* Main Toggle (Checkmark) */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleModule(mod.id);
                                }}
                                className={cn(
                                    "absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                    isActive ? "bg-orange-500 text-white scale-110" : "bg-black/5 text-transparent border border-black/10"
                                )}
                            >
                                <Check className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Access Level Selector (Visible only when module active) */}
                        {isActive && (
                            <div 
                                onClick={(e) => e.stopPropagation()}
                                className="mt-4 pt-3 border-t border-black/5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300"
                            >
                                <span className="text-[10px] font-black text-black uppercase tracking-widest mr-1">Access:</span>
                                
                                <button
                                    type="button"
                                    onClick={() => setLevel(mod.id, 'view')}
                                    className={cn(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                                        perm.access_level === 'view' 
                                            ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                                            : "bg-black/5 text-black hover:bg-black/10 font-bold"
                                    )}
                                >
                                    <Eye className="w-3 h-3" /> View Only
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setLevel(mod.id, 'edit')}
                                    className={cn(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                                        perm.access_level === 'edit' 
                                            ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" 
                                            : "bg-black/5 text-black hover:bg-black/10 font-bold"
                                    )}
                                >
                                    <Edit3 className="w-3 h-3" /> Edit
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setLevel(mod.id, 'full')}
                                    className={cn(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                                        perm.access_level === 'full' 
                                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/20" 
                                            : "bg-black/5 text-black hover:bg-black/10 font-bold"
                                    )}
                                >
                                    <Shield className="w-3 h-3" /> Full
                                </button>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
