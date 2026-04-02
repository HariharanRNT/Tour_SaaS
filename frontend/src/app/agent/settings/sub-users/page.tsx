'use client'

import React, { useState, useEffect } from 'react'
import { 
    Users, 
    UserPlus, 
    Search, 
    MoreVertical, 
    Edit2, 
    Key, 
    Trash2, 
    Shield, 
    UserCheck, 
    UserX,
    Loader2,
    Mail,
    Phone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubUserModal } from '@/components/agent/SubUserModal'
import { agentAPI } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function SubUsersPage() {
    const router = useRouter()
    const { hasPermission, isSubUser } = useAuth()
    const [subUsers, setSubUsers] = useState<any[]>([])

    useEffect(() => {
        if (isSubUser && !hasPermission('settings', 'view')) {
            router.push('/agent/dashboard')
        }
    }, [isSubUser, hasPermission, router])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedSubUser, setSelectedSubUser] = useState<any>(null)

    const fetchSubUsers = async () => {
        try {
            setLoading(true)
            const data = await agentAPI.getSubUsers()
            setSubUsers(data.sub_users || [])
        } catch (error) {
            console.error('Failed to fetch sub-users:', error)
            toast.error('Failed to load sub-users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSubUsers()
    }, [])

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await agentAPI.toggleSubUserStatus(id, !currentStatus)
            toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
            fetchSubUsers()
        } catch (error) {
            toast.error('Failed to update user status')
        }
    }

    const handleResetPassword = async (id: string) => {
        if (!confirm('Are you sure you want to reset this user\'s password? A new temporary password will be emailed to them.')) return
        
        try {
            await agentAPI.resetSubUserPassword(id)
            toast.success('Password reset email sent to staff member')
        } catch (error) {
            toast.error('Failed to reset password')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this sub-user? This action cannot be undone.')) return
        
        try {
            await agentAPI.deleteSubUser(id)
            toast.success('Sub-user deleted successfully')
            fetchSubUsers()
        } catch (error) {
            toast.error('Failed to delete sub-user')
        }
    }

    const filteredUsers = subUsers.filter(user => 
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                        <Users className="w-7 h-7 text-orange-500" />
                        Staff & Sub-Users
                    </h1>
                    <p className="text-sm text-black/50 font-medium">Manage your team's access to the agent portal</p>
                </div>
                
                {hasPermission('settings', 'edit') && (
                    <Button 
                        onClick={() => {
                            setSelectedSubUser(null)
                            setIsModalOpen(true)
                        }}
                        className="rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 shadow-lg shadow-orange-500/20 py-6"
                    >
                        <UserPlus className="w-5 h-5 mr-2" />
                        Add Staff Member
                    </Button>
                )}
            </div>

            {/* Stats Cards (Optional but premium) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/40 backdrop-blur-md rounded-3xl p-5 border border-white/50 shadow-sm">
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest leading-none mb-2">Total Staff</p>
                    <h3 className="text-3xl font-black text-black">{subUsers.length}</h3>
                </div>
                <div className="bg-white/40 backdrop-blur-md rounded-3xl p-5 border border-white/50 shadow-sm">
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest leading-none mb-2">Active Now</p>
                    <h3 className="text-3xl font-black text-green-600">{subUsers.filter(u => u.is_active).length}</h3>
                </div>
                <div className="bg-white/40 backdrop-blur-md rounded-3xl p-5 border border-white/50 shadow-sm">
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest leading-none mb-2">Deactivated</p>
                    <h3 className="text-3xl font-black text-red-500">{subUsers.filter(u => !u.is_active).length}</h3>
                </div>
            </div>

            {/* Search & Listing */}
            <div className="bg-white/60 backdrop-blur-xl rounded-[32px] border border-white/40 shadow-xl overflow-hidden min-h-[400px]">
                <div className="p-6 border-b border-black/5 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                        <Input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="pl-11 rounded-2xl border-black/5 bg-black/5 focus:bg-white transition-all w-full py-6"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                        <p className="text-sm font-medium text-black/40">Loading staff directory...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                        <div className="w-20 h-20 rounded-full bg-black/5 flex items-center justify-center mb-4">
                            <Users className="w-10 h-10 text-black/20" />
                        </div>
                        <h3 className="text-lg font-bold text-black">No staff members found</h3>
                        <p className="text-sm text-black/40 max-w-xs mt-1">
                            {searchQuery ? "Try adjusting your search query." : "You haven't added any sub-users yet. Start delegating work to your team."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black/5 border-b border-black/5">
                                <tr className="text-[11px] font-bold text-black/40 uppercase tracking-widest">
                                    <th className="px-6 py-4">Staff Member</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Permissions</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="group hover:bg-black/5 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm shadow-sm">
                                                    {(user.first_name?.[0] || 'U').toUpperCase()}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-black leading-tight">
                                                        {user.first_name} {user.last_name}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Mail className="w-3 h-3 text-black/30" />
                                                        <span className="text-[11px] text-black/40 font-medium truncate">{user.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-xs font-bold text-black/70 bg-black/5 px-2.5 py-1 rounded-lg">
                                                {user.role_label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1">
                                                {user.permissions?.slice(0, 3).map((p: any) => (
                                                    <span key={p.module} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase tracking-tight">
                                                        {p.module}
                                                    </span>
                                                ))}
                                                {(user.permissions?.length || 0) > 3 && (
                                                    <span className="text-[10px] text-black/30 font-bold pl-1">+{user.permissions.length - 3} more</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                <button 
                                                    onClick={() => hasPermission('settings', 'edit') && handleToggleStatus(user.id, user.is_active)}
                                                    disabled={!hasPermission('settings', 'edit')}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all",
                                                        user.is_active 
                                                            ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                                            : "bg-red-100 text-red-700 hover:bg-red-200",
                                                        !hasPermission('settings', 'edit') && "opacity-60 cursor-not-allowed"
                                                    )}
                                                >
                                                    {user.is_active ? (
                                                        <><UserCheck className="w-3.5 h-3.5" /> Active</>
                                                    ) : (
                                                        <><UserX className="w-3.5 h-3.5" /> Blocked</>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                        <MoreVertical className="w-4 h-4 text-black/40" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-2xl border-black/5 shadow-2xl p-1 w-48">
                                                    {hasPermission('settings', 'edit') ? (
                                                        <>
                                                            <DropdownMenuItem 
                                                                onClick={() => {
                                                                    setSelectedSubUser(user)
                                                                    setIsModalOpen(true)
                                                                }}
                                                                className="rounded-xl flex items-center gap-2 font-bold text-sm h-10 px-3 hover:bg-black/5 cursor-pointer"
                                                            >
                                                                <Edit2 className="w-4 h-4 text-blue-500" />
                                                                Edit Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                onClick={() => handleResetPassword(user.id)}
                                                                className="rounded-xl flex items-center gap-2 font-bold text-sm h-10 px-3 hover:bg-black/5 cursor-pointer"
                                                            >
                                                                <Key className="w-4 h-4 text-orange-500" />
                                                                Reset Password
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                onClick={() => handleDelete(user.id)}
                                                                className="rounded-xl flex items-center gap-2 font-bold text-sm h-10 px-3 text-red-600 hover:bg-red-50 cursor-pointer"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete Account
                                                            </DropdownMenuItem>
                                                        </>
                                                    ) : (
                                                        <DropdownMenuItem disabled className="text-[10px] font-bold uppercase text-black/40 px-3">
                                                            View Only Mode
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <SubUserModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchSubUsers}
                subUser={selectedSubUser}
            />
        </div>
    )
}
