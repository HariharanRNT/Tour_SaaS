'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Plus, Search, MapPin, Trash2, Edit, ChevronLeft, ChevronRight, MoreHorizontal, Activity as ActivityIcon, ArrowRight, ChevronDown, Upload, Link2, Loader2 } from 'lucide-react'
import { activitiesAPI } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface DestinationSummary {
    name: string
    country: string
    image_url?: string
    description?: string
    is_popular?: boolean
    activity_count: number
    package_count: number
}

export default function ActivitiesMasterPage() {
    const router = useRouter()
    const { hasPermission } = useAuth()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(8)

    // Modal State for New Destination
    const [isNewDestModalOpen, setIsNewDestModalOpen] = useState(false)
    const [newCityName, setNewCityName] = useState('')
    const [newCityCountry, setNewCityCountry] = useState('')
    const [newCityImage, setNewCityImage] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [isPopular, setIsPopular] = useState(true)

    // Edit State
    const [isEditing, setIsEditing] = useState(false)
    const [editingDestOriginalName, setEditingDestOriginalName] = useState('')

    // Alert Dialog State for Deletion
    const [cityToDelete, setCityToDelete] = useState<{ city: string, count: number } | null>(null)

    const { data: destinationsData, isLoading: loading, isFetching } = useQuery({
        queryKey: ['agent-destinations', currentPage, searchTerm],
        queryFn: async () => {
            const data = await activitiesAPI.getDestinations({
                page: currentPage,
                limit: pageSize,
                search: searchTerm || undefined
            })
            return {
                destinations: data.destinations || data || [],
                totalCount: data.total_count || (Array.isArray(data) ? data.length : 0)
            }
        },
        staleTime: 300000, // 5 minutes
        refetchOnWindowFocus: false
    })

    const destinations = destinationsData?.destinations || []
    const totalCount = destinationsData?.totalCount || 0
    const totalPages = Math.ceil(totalCount / pageSize)

    // Mutations
    const saveMetadataMutation = useMutation({
        mutationFn: async (data: any) => {
            if (isEditing) {
                return activitiesAPI.updateDestinationMetadata(editingDestOriginalName, data)
            }
            return activitiesAPI.saveDestinationMetadata(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-destinations'] })
            toast.success(isEditing ? 'Destination updated!' : 'Destination created!')
            setIsNewDestModalOpen(false)
            setIsEditing(false)
            if (!isEditing) {
                router.push(`/agent/activities/${encodeURIComponent(newCityName.trim())}`)
            }
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to save destination')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (city: string) => activitiesAPI.deleteDestination(city),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-destinations'] })
            toast.success(`Deleted destination and its activities`)
            setCityToDelete(null)
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete destination')
        }
    })

    const totalActivities = useMemo(() => {
        return destinations.reduce((sum: number, dest: DestinationSummary) => sum + dest.activity_count, 0)
    }, [destinations])

    const handleNavigateToCity = (city: string) => {
        router.push(`/agent/activities/${encodeURIComponent(city)}`)
    }

    const handleCreateNewDestination = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCityName.trim()) {
            toast.error('Please enter a destination name')
            return
        }

        saveMetadataMutation.mutate({
            name: newCityName.trim(),
            country: newCityCountry.trim() || 'Unknown',
            image_url: newCityImage,
            is_popular: isPopular
        })
    }

    const handleEditDestination = (dest: DestinationSummary) => {
        setNewCityName(dest.name)
        setNewCityCountry(dest.country)
        setNewCityImage(dest.image_url || '')
        setIsPopular(dest.is_popular ?? true)
        setEditingDestOriginalName(dest.name)
        setIsEditing(true)
        setIsNewDestModalOpen(true)
    }

    const confirmDeleteDestination = (city: string, count: number) => {
        setCityToDelete({ city, count })
    }

    const handleDeleteDestination = async () => {
        if (!cityToDelete) return
        deleteMutation.mutate(cityToDelete.city)
    }

    return (
        <div className="min-h-screen bg-transparent">
            {/* Content Container */}
            <div className="container mx-auto px-4 py-8">
                {/* Modern Page Header Card */}
                <div className="page-header-card animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col gap-4">
                        {/* Breadcrumb */}
                        <nav className="flex items-center text-[13px] font-medium text-[#92400e]/80">
                            <span className="hover:text-[#92400e] cursor-pointer transition-colors" onClick={() => router.push('/agent/dashboard')}>Dashboard</span>
                            <span className="mx-2">/</span>
                            <span className="text-[#92400e]">Destinations Library</span>
                        </nav>

                        {/* Title & Badge */}
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-50 rounded-2xl shadow-inner border border-white/60">
                                <MapPin className="h-6 w-6 text-[var(--primary)]" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif", color: '#4A2B1D' }}>
                                    Destinations Library
                                </h1>
                                <p className="mt-1.5 text-[#8B5E34] text-[13px] font-medium bg-white/40 px-3 py-1 rounded-[20px] border border-white/50 backdrop-blur-md inline-block shadow-sm">
                                    Manage all destinations and their activities
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center">
                        {hasPermission('activities', 'edit') && (
                            <Button
                                onClick={() => {
                                    setNewCityName('')
                                    setNewCityCountry('')
                                    setNewCityImage('')
                                    setIsEditing(false)
                                    setIsNewDestModalOpen(true)
                                }}
                                className="group text-white tracking-wide font-semibold px-7 py-6 transition-all duration-300 hover:-translate-y-1 border border-white/20 shadow-[0_8px_24px_var(--primary-glow)] hover:shadow-[0_12px_30px_var(--primary-glow)]"
                                style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', borderRadius: '50px' }}
                            >
                                <Plus className="mr-2 h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
                                Add Destination
                            </Button>
                        )}
                    </div>
                </div>

                {/* Summary Bar */}
                <div className="flex flex-wrap items-center gap-6 mb-8 p-4 transition-all duration-300" style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '40px', boxShadow: '0 8px 32px var(--primary-glow)' }}>
                    <div className="flex-1 min-w-[200px] flex items-center justify-center gap-5 bg-white/30 px-6 py-4 rounded-[32px] border border-white/50 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="p-3.5 bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary)] rounded-2xl shadow-[0_4px_12px_var(--primary-glow)] border border-white/20">
                            <MapPin className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-xs text-[#E8A585] font-bold uppercase tracking-widest mb-0.5">Destinations</p>
                            <p className="text-4xl font-extrabold text-[var(--primary)] leading-none tracking-tight">{destinations.length}</p>
                        </div>
                    </div>

                    <div className="hidden sm:block w-px h-16 bg-gradient-to-b from-transparent via-[var(--primary)]/50 to-transparent shadow-[0_0_8px_var(--primary-glow)]"></div>

                    <div className="flex-1 min-w-[200px] flex items-center justify-center gap-5 bg-white/30 px-6 py-4 rounded-[32px] border border-white/50 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="p-3.5 bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary)] rounded-2xl shadow-[0_4px_12px_var(--primary-glow)] border border-white/20">
                            <ActivityIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-xs text-[#E8A585] font-bold uppercase tracking-widest mb-0.5">Total Activities</p>
                            <p className="text-4xl font-extrabold text-[var(--primary)] leading-none tracking-tight">{totalActivities}</p>
                        </div>
                    </div>
                </div>

                {/* Search / Filter Area */}
                <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full max-w-2xl group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--primary)] opacity-60 group-focus-within:opacity-100 transition-opacity" />
                        <Input
                            placeholder="Search destinations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setCurrentPage(1);
                                }
                            }}
                            className="bg-white/25 backdrop-blur-md border-white/40 shadow-sm pl-14 h-12 w-full rounded-full text-slate-800 focus:ring-[var(--primary-light)]/40 focus:border-[var(--primary-light)] focus:bg-white/40 transition-all font-medium text-[15px] placeholder:text-slate-500/80"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#B4501E]/60 uppercase tracking-widest italic pr-2">
                            Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount} destinations
                        </span>
                    </div>
                </div>

                {loading || isFetching ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[400px]">
                        {Array.from({ length: pageSize }).map((_, i) => (
                            <div key={i} className="h-[160px] p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-[20px] relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmerPulse_2s_infinite]" />
                                <div className="flex justify-between items-center h-10 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-white/20" />
                                    <div className="w-8 h-8 rounded-full bg-white/20" />
                                </div>
                                <div className="w-3/4 h-7 bg-white/20 rounded-md mb-2" />
                                <div className="w-1/2 h-6 bg-white/20 rounded-full mb-4" />
                                <div className="w-1/3 h-4 bg-white/20 rounded-full absolute bottom-4" />
                            </div>
                        ))}
                    </div>
                ) : destinations.length === 0 ? (
                    <div className="text-center py-20 px-4 rounded-[20px]" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 8px 32px rgba(180, 100, 60, 0.08)' }}>
                        <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800">No destinations found</h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                            {searchTerm ? `No destinations match "${searchTerm}".` : "You haven't added any destinations yet."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[380px]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentPage}
                                    initial={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 col-span-full"
                                >
                                    {destinations.map((dest: DestinationSummary, index: number) => (
                                        <motion.div
                                            key={dest.name}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
                                        >
                                            <Card
                                                className="group relative cursor-pointer overflow-hidden border border-white/40 shadow-sm hover:shadow-[0_12px_32px_var(--primary-glow)] transition-all duration-300 hover:-translate-y-1 h-[200px]"
                                                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '20px' }}
                                                onClick={() => handleNavigateToCity(dest.name)}
                                            >
                                                {/* Destination Image Overlay */}
                                                {dest.image_url && (
                                                    <div className="absolute inset-0 z-0">
                                                        <img src={dest.image_url} alt={dest.name} className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent" />
                                                    </div>
                                                )}

                                                <CardContent className="p-4 relative z-10 flex flex-col h-full">
                                                    {/* Row 1: Pin icon badge (left) + ··· menu (right) — 40px height */}
                                                    <div className="flex justify-between items-center h-10 mb-2">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-md border border-white/60 flex items-center justify-center text-[var(--primary)] shadow-sm group-hover:scale-110 transition-all duration-500">
                                                            <MapPin className="h-5 w-5" />
                                                        </div>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[var(--primary)] hover:bg-white/40 rounded-full transition-all">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-2xl border-white/50 bg-white/80 backdrop-blur-2xl">
                                                                {hasPermission('activities', 'edit') && (
                                                                    <DropdownMenuItem
                                                                        className="text-slate-600 focus:text-[var(--primary)] focus:bg-orange-50 cursor-pointer rounded-xl h-11 font-bold"
                                                                        onClick={(e) => { e.stopPropagation(); handleEditDestination(dest); }}
                                                                    >
                                                                        <Edit className="mr-3 h-4 w-4" />
                                                                        Edit Destination
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {hasPermission('activities', 'full') && (
                                                                    <DropdownMenuItem
                                                                        className="text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer rounded-xl h-11 font-bold"
                                                                        onClick={(e) => { e.stopPropagation(); confirmDeleteDestination(dest.name, dest.activity_count); }}
                                                                    >
                                                                        <Trash2 className="mr-3 h-4 w-4" />
                                                                        Delete Destination
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <h2 className="text-[20px] font-black group-hover:text-[var(--primary)] transition-colors leading-tight h-7 overflow-hidden truncate" style={{ fontFamily: "'Playfair Display', serif", color: '#2D1A0E' }}>
                                                        {dest.name}
                                                    </h2>

                                                    {/* Row 3: Activity count orange dot pill — 24px height */}
                                                    <div className="flex items-center h-6 mb-2">
                                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold border border-[var(--primary-light)]/30 bg-[var(--primary-light)]/10 text-[#B4501E] text-[10px] uppercase tracking-widest">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mr-2 animate-pulse shadow-[0_0_8px_var(--primary-glow)]" />
                                                            {dest.activity_count} {dest.activity_count === 1 ? 'Activity' : 'Activities'}
                                                            <span className="mx-2 opacity-30">|</span>
                                                            {dest.package_count} {dest.package_count === 1 ? 'Package' : 'Packages'}
                                                        </div>
                                                        {dest.is_popular && (
                                                            <div className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full font-bold border border-amber-300 bg-amber-50 text-amber-700 text-[10px] uppercase tracking-widest shadow-sm">
                                                                🔥 Popular
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Row 4: MANAGE LIBRARY → link pinned to bottom — 32px height */}
                                                    <div className="mt-auto flex items-center h-8 text-[var(--primary)] font-black text-[10px] uppercase tracking-widest group-hover:pl-1 transition-all">
                                                        Manage Library
                                                        <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1.5 transition-transform duration-500" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex flex-col items-center mt-12 space-y-4">
                                <div className="flex items-center gap-1.5 p-1.5 bg-white/20 backdrop-blur-[16px] rounded-full border border-white/40 shadow-xl">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1 || isFetching}
                                        className="h-10 w-10 rounded-full border border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>

                                    <div className="flex items-center px-2">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                            if (totalPages > 7) {
                                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                                    return (
                                                        <button
                                                            key={page}
                                                            onClick={() => setCurrentPage(page)}
                                                            disabled={isFetching}
                                                            className={cn(
                                                                "h-9 w-9 rounded-full text-sm font-bold transition-all duration-300 mx-0.5",
                                                                currentPage === page
                                                                    ? "bg-[var(--primary)] text-white shadow-[0_4px_12px_var(--primary-glow)] scale-110"
                                                                    : "text-[#4A2B1D] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                                                            )}
                                                        >
                                                            {page}
                                                        </button>
                                                    )
                                                }
                                                if (page === 2 || page === totalPages - 1) {
                                                    return <span key={page} className="px-1 text-slate-400">...</span>
                                                }
                                                return null
                                            }

                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    disabled={isFetching}
                                                    className={cn(
                                                        "h-9 w-9 rounded-full text-sm font-bold transition-all duration-300 mx-0.5",
                                                        currentPage === page
                                                            ? "bg-[var(--primary)] text-white shadow-[0_4px_12px_var(--primary-glow)] scale-110"
                                                            : "text-[#4A2B1D] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                                                    )}
                                                >
                                                    {page}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || isFetching}
                                        className="h-10 w-10 rounded-full border border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* New Destination Modal */}
            <Dialog open={isNewDestModalOpen} onOpenChange={(open) => {
                setIsNewDestModalOpen(open);
                if (!open) {
                    setIsEditing(false);
                    setNewCityName('');
                    setNewCityImage('');
                    setIsPopular(true);
                }
            }}>
                <DialogContent
                    hideClose
                    overlayStyle={{
                        background: 'radial-gradient(circle at center, rgba(255, 179, 138, 0.4), transparent 70%), rgba(255, 122, 69, 0.15)',
                        backdropFilter: 'blur(18px)',
                        WebkitBackdropFilter: 'blur(18px)'
                    }}
                    className="sm:max-w-[400px] p-0 border-0 animate-custom-modal max-h-[90vh] overflow-y-auto overflow-x-hidden scrollbar-hide"
                    style={{
                        background: 'rgba(255, 255, 255, 0.28)',
                        backdropFilter: 'blur(28px)',
                        WebkitBackdropFilter: 'blur(28px)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        borderRadius: '28px',
                        boxShadow: '0 25px 70px rgba(255, 122, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                        animation: 'customModalEnter 300ms ease-out forwards, floatModal 6s ease-in-out infinite'
                    }}
                >
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @keyframes customModalEnter {
                            0% { opacity: 0; transform: translate(-50%, calc(-50% + 10px)) scale(0.95); }
                            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                        }
                        @keyframes floatModal {
                            0%, 100% { transform: translate(-50%, -50%); }
                            50% { transform: translate(-50%, calc(-50% - 4px)); }
                        }
                        @keyframes shimmerPulse {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(100%); }
                        }
                        .animate-custom-modal[data-state="open"] {
                            animation: customModalEnter 300ms ease-out forwards, floatModal 6s ease-in-out infinite !important;
                        }
                    `}} />

                    <button
                        type="button"
                        onClick={() => setIsNewDestModalOpen(false)}
                        className="absolute top-4 right-4 z-20 flex items-center justify-center transition-all duration-250 hover:-translate-y-0.5"
                        style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.35)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.5)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 0 10px var(--primary-glow)';
                            if (e.currentTarget.firstChild) (e.currentTarget.firstChild as HTMLElement).style.transform = 'rotate(90deg)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                            if (e.currentTarget.firstChild) (e.currentTarget.firstChild as HTMLElement).style.transform = 'rotate(0deg)';
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3A1A08', transition: 'transform 0.25s ease' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>

                    <div className="px-6 pt-5 pb-2 text-center">
                        <div className="mx-auto w-10 h-10 mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 122, 69, 0.15)', boxShadow: '0 0 20px rgba(255, 122, 69, 0.2)' }}>
                            <MapPin className="h-5 w-5 text-[var(--primary)]" />
                        </div>
                        <DialogTitle style={{ fontFamily: "'Playfair Display', serif", color: '#3A1A08', fontSize: '22px', fontWeight: 600, letterSpacing: '0.02em', marginBottom: '8px' }}>
                            {isEditing ? 'Edit Destination' : 'New Destination'}
                        </DialogTitle>
                        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 122, 69, 0.5), transparent)', margin: '0 auto 12px', width: '80%' }}></div>
                        <DialogDescription style={{ color: 'rgba(120,60,20,0.75)', fontWeight: 400, fontSize: '15px' }}>
                            {isEditing ? `Update details for ${editingDestOriginalName}.` : 'Enter the name of the new destination to manage its activities.'}
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleCreateNewDestination} className="px-6 pb-6">
                        <div className="space-y-3 mb-5 text-left">
                            <div className="space-y-2">
                                <label htmlFor="destination-name" style={{ color: 'var(--primary-glow)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '11px', fontWeight: 600, display: 'block' }}>
                                    Destination
                                </label>
                                <Input
                                    id="destination-name"
                                    value={newCityName}
                                    onChange={(e) => setNewCityName(e.target.value)}
                                    placeholder="e.g., Bali, Paris, Tokyo"
                                    className="w-full transition-all duration-300 focus:outline-none focus:ring-0 placeholder:text-[#B4501E]/40 text-[#3A1A08] font-semibold"
                                    style={{
                                        background: 'rgba(255,255,255,0.45)',
                                        backdropFilter: 'blur(14px)',
                                        border: '1px solid rgba(255,255,255,0.6)',
                                        borderRadius: '16px',
                                        padding: '8px 14px',
                                        height: 'auto',
                                        boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.5)'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                        e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(255,255,255,0.5), 0 0 15px rgba(255,122,69,0.35)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
                                        e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(255,255,255,0.5)';
                                    }}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-3">
                                <label style={{ color: 'var(--primary-glow)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '11px', fontWeight: 600, display: 'block' }}>
                                    Destination Image
                                </label>

                                <div
                                    className={cn(
                                        "border-2 border-dashed rounded-2xl p-4 transition-all duration-300 text-center cursor-pointer group h-44 flex items-center justify-center",
                                        newCityImage ? "border-[var(--primary)]/50 bg-[var(--primary)]/5" : "border-white/40 bg-white/10 hover:border-[var(--primary)]/40 hover:bg-white/20"
                                    )}
                                    onClick={() => document.getElementById('dest-upload')?.click()}
                                >
                                    {isUploading ? (
                                        <div className="flex flex-col items-center py-4">
                                            <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin mb-2" />
                                            <p className="text-xs font-bold text-[#3A1A08]/60">Uploading to S3...</p>
                                        </div>
                                    ) : newCityImage ? (
                                        <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/60 shadow-lg">
                                            <img src={newCityImage} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="p-2 bg-white/90 rounded-full text-[var(--primary)] shadow-xl">
                                                    <Upload className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-2">
                                            <div className="p-2.5 bg-white/40 rounded-full text-[var(--primary)] mb-2 group-hover:scale-110 transition-transform shadow-sm">
                                                <Upload className="h-5 w-5" />
                                            </div>
                                            <p className="text-sm font-bold text-[#3A1A08]">Drag & drop or Click to upload</p>
                                            <p className="text-[9px] text-[#B4501E]/60 mt-0.5 uppercase tracking-widest font-bold">PNG, JPG up to 5MB</p>
                                        </div>
                                    )}
                                    <input
                                        id="dest-upload"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return

                                            setIsUploading(true)
                                            try {
                                                const formData = new FormData()
                                                formData.append('file', file)

                                                const token = localStorage.getItem('token')
                                                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/upload?folder=destinations`, {
                                                    method: 'POST',
                                                    headers: { 'Authorization': `Bearer ${token}` },
                                                    body: formData
                                                })

                                                if (!response.ok) throw new Error('Upload failed')
                                                const data = await response.json()
                                                setNewCityImage(data.url)
                                                toast.success('Image uploaded successfully')
                                            } catch (err) {
                                                console.error(err)
                                                toast.error('Failed to upload image')
                                            } finally {
                                                setIsUploading(false)
                                            }
                                        }}
                                    />
                                </div>

                                <div className="relative group/url">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--primary)]/60 group-focus-within/url:text-[var(--primary)] transition-colors">
                                        <Link2 className="h-4 w-4" />
                                    </div>
                                    <Input
                                        placeholder="Or paste image URL here..."
                                        value={newCityImage}
                                        onChange={(e) => setNewCityImage(e.target.value)}
                                        className="pl-11 h-10 text-[11px] font-semibold bg-white/30 backdrop-blur-md border-white/40 rounded-xl focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id="is-popular" checked={isPopular} onCheckedChange={(checked) => setIsPopular(checked as boolean)} />
                                <label htmlFor="is-popular" className="text-xs font-semibold text-[#3A1A08] cursor-pointer">
                                    Show in Popular Destinations
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                onClick={() => setIsNewDestModalOpen(false)}
                                className="flex-1 transition-all duration-250"
                                style={{
                                    height: '40px',
                                    background: 'rgba(255,255,255,0.25)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.4)',
                                    color: 'rgba(58,26,8,0.8)',
                                    borderRadius: '20px',
                                    fontWeight: 600,
                                    transform: 'translateY(0)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.4)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 transition-all duration-300 border-0 relative overflow-hidden group"
                                style={{
                                    height: '40px',
                                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                    borderRadius: '20px',
                                    color: 'white',
                                    fontWeight: 600,
                                    boxShadow: '0 8px 25px rgba(255,122,69,0.35)',
                                    transform: 'translateY(0)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(255,122,69,0.5)';
                                    e.currentTarget.style.filter = 'brightness(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(255,122,69,0.35)';
                                    e.currentTarget.style.filter = 'brightness(1)';
                                }}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(1px)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            >
                                <span className="absolute inset-0 w-full h-full" style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                    transform: 'translateX(-100%)',
                                    animation: 'shimmerPulse 3s infinite'
                                }}></span>
                                <span className="relative z-10">
                                    {saveMetadataMutation.isPending
                                        ? (isEditing ? 'Updating...' : 'Creating...')
                                        : (isEditing ? 'Save Changes' : 'Continue')}
                                </span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Destination Alert Dialog */}
            <AlertDialog open={!!cityToDelete} onOpenChange={(open) => !open && setCityToDelete(null)}>
                <AlertDialogContent className="rounded-[24px] border-none shadow-2xl sm:max-w-[425px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold tracking-tight text-slate-800">
                            Delete Destination
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 text-base mt-2">
                            This will permanently delete <strong>{cityToDelete?.city}</strong> and all of its <strong>{cityToDelete?.count}</strong> activities.
                            <br /><br />
                            Are you absolutely sure you want to proceed? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-full text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-none">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteDestination}
                            disabled={deleteMutation.isPending}
                            className="rounded-full bg-red-600 hover:bg-red-700 text-white border-0 shadow-md"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Everything'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
