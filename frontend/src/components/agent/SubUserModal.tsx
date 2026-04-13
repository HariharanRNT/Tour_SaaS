'use client'

import React, { useState, useEffect } from 'react'
import { X, UserPlus, Info, Save, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PermissionMatrix, ModulePermission } from './PermissionMatrix'
import { agentAPI } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

interface SubUserModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    subUser?: any // For editing
}

const ROLE_PRESETS: Record<string, ModulePermission[]> = {
    "Package Manager": [
        { module: "dashboard", access_level: "view" },
        { module: "packages", access_level: "full" },
        { module: "activities", access_level: "full" },
    ],
    "Finance Manager": [
        { module: "dashboard", access_level: "view" },
        { module: "billing", access_level: "full" },
        { module: "finance_reports", access_level: "full" },
    ],
    "Report Viewer": [
        { module: "dashboard", access_level: "view" },
        { module: "bookings", access_level: "view" },
        { module: "finance_reports", access_level: "view" },
    ],
}

export function SubUserModal({ isOpen, onClose, onSuccess, subUser }: SubUserModalProps) {
    const isEdit = !!subUser
    const [loading, setLoading] = useState(false)
    
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role_label: 'Custom'
    })
    
    const [permissions, setPermissions] = useState<ModulePermission[]>([])

    useEffect(() => {
        if (subUser) {
            setFormData({
                first_name: subUser.first_name || '',
                last_name: subUser.last_name || '',
                email: subUser.email || '',
                phone: subUser.phone || '',
                role_label: subUser.role_label || 'Custom'
            })
            setPermissions(subUser.permissions || [])
        } else {
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                role_label: 'Custom'
            })
            setPermissions([])
        }
    }, [subUser, isOpen])

    const handleRoleChange = (role: string) => {
        setFormData(prev => ({ ...prev, role_label: role }))
        if (ROLE_PRESETS[role]) {
            setPermissions(ROLE_PRESETS[role])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        try {
            const payload = {
                ...formData,
                permissions: permissions.map(p => ({ module: p.module, access_level: p.access_level }))
            }

            if (isEdit) {
                await agentAPI.updateSubUser(subUser.id, payload)
                toast.success('Sub-user updated successfully')
            } else {
                await agentAPI.createSubUser(payload)
                toast.success('Sub-user created! Credentials emailed to staff member.')
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Failed to save sub-user:', error)
            toast.error(error.response?.data?.detail || 'Failed to save sub-user')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white/60 backdrop-blur-[30px] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] shadow-2xl border border-white/50 flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white/40 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-black leading-tight tracking-tight">
                                {isEdit ? 'Edit Staff Member' : 'Add New Sub-User'}
                            </h2>
                            <p className="text-xs text-black font-bold tracking-tight opacity-70">
                                Delegate portal access to your team members
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="p-2 hover:bg-black/10 rounded-full transition-colors group"
                    >
                        <X className="w-5 h-5 text-black/60 group-hover:text-black" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-black uppercase tracking-widest pl-1">First Name</label>
                            <Input 
                                required
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                placeholder="e.g. Rahul"
                                className="rounded-xl border-black/10 focus:border-orange-500/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-black uppercase tracking-widest pl-1">Last Name</label>
                            <Input 
                                required
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                placeholder="e.g. Sharma"
                                className="rounded-xl border-black/10 focus:border-orange-500/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-black uppercase tracking-widest pl-1">Email Address (Login ID)</label>
                            <Input 
                                required
                                type="email"
                                disabled={isEdit}
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="staff@yourapp.com"
                                className="rounded-xl border-black/10 focus:border-orange-500/50 disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-black uppercase tracking-widest pl-1">Phone Number</label>
                            <div className="phone-input-container">
                                <PhoneInput
                                    country={'in'}
                                    value={formData.phone}
                                    onChange={phone => setFormData({ ...formData, phone })}
                                    containerClass="!w-full !rounded-xl"
                                    inputClass="!w-full !h-10 !pl-12 !bg-white/40 !border-black/20 !rounded-xl focus:!border-orange-500/50 focus:!bg-white !transition-all !text-sm !font-bold !text-black !placeholder-black/30"
                                    buttonClass="!bg-transparent !border-none !rounded-l-xl !pl-2 hover:!bg-black/5 !transition-colors"
                                    dropdownClass="rounded-2xl shadow-xl border-black/5"
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-black/5" />

                    {/* Role & Permissions Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-black text-black flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-orange-500" />
                                Role & Permissions
                            </h3>
                            <p className="text-[11px] text-black font-bold opacity-60">Choose a preset or configure custom module access</p>
                        </div>

                        <select 
                            value={formData.role_label}
                            onChange={(e) => handleRoleChange(e.target.value)}
                            className="text-xs font-bold border rounded-xl px-3 py-2 bg-black/5 text-black border-transparent focus:border-orange-500 outline-none transition-all cursor-pointer"
                        >
                            <option value="Custom">Custom Role</option>
                            <option value="Package Manager">Package Manager</option>
                            <option value="Finance Manager">Finance Manager</option>
                            <option value="Report Viewer">Report Viewer</option>
                        </select>
                    </div>

                    {/* Permissions Grid */}
                    <PermissionMatrix 
                        permissions={permissions}
                        onChange={setPermissions}
                    />

                    {/* Info Note */}
                    {!isEdit && (
                        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex gap-3">
                            <Info className="w-5 h-5 text-blue-500 shrink-0" />
                            <p className="text-[11px] text-blue-800 leading-normal">
                                <strong>Note:</strong> We will automatically generate a secure temporary password and email it to this user. They will be prompted to change it upon their first login.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-xl font-black text-black/70 hover:text-black hover:bg-black/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || permissions.length === 0}
                            className={cn(
                                "rounded-xl font-bold px-8 shadow-lg shadow-orange-500/20",
                                "bg-orange-500 hover:bg-orange-600 text-white"
                            )}
                        >
                            {loading ? 'Saving...' : (isEdit ? 'Update Details' : 'Create Staff User')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
