'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MapPin, Trash2, Edit, ChevronLeft, ChevronRight, MoreHorizontal, Activity as ActivityIcon, ArrowRight } from 'lucide-react'
import { activitiesAPI } from '@/lib/api'

interface DestinationSummary {
    city: string
    activity_count: number
}

const ITEMS_PER_PAGE = 12

export default function ActivitiesMasterPage() {
    const router = useRouter()
    const [destinations, setDestinations] = useState<DestinationSummary[]>([])
    const [loading, setLoading] = useState(true)

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    // Modal State for New Destination
    const [isNewDestModalOpen, setIsNewDestModalOpen] = useState(false)
    const [newCityName, setNewCityName] = useState('')

    // Alert Dialog State for Deletion
    const [cityToDelete, setCityToDelete] = useState<{ city: string, count: number } | null>(null)

    useEffect(() => {
        const userStr = localStorage.getItem('user')
        if (!userStr) {
            router.push('/login')
            return
        }
        loadDestinations()
    }, [router])

    const loadDestinations = async () => {
        setLoading(true)
        try {
            const data = await activitiesAPI.getDestinations()
            setDestinations(data)
        } catch (error) {
            console.error('Failed to load destinations:', error)
            toast.error('Failed to load destinations')
        } finally {
            setLoading(false)
        }
    }

    // Filter destinations locally based on search
    const filteredDestinations = useMemo(() => {
        if (!searchTerm) return destinations
        const lowerSearch = searchTerm.toLowerCase()
        return destinations.filter(d => d.city.toLowerCase().includes(lowerSearch))
    }, [destinations, searchTerm])

    // Pagination logic
    const totalPages = Math.ceil(filteredDestinations.length / ITEMS_PER_PAGE)
    const paginatedDestinations = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return filteredDestinations.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredDestinations, currentPage])

    // Reset pagination when searching
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    const totalActivities = useMemo(() => {
        return destinations.reduce((sum, dest) => sum + dest.activity_count, 0)
    }, [destinations])

    const handleNavigateToCity = (city: string) => {
        router.push(`/agent/activities/${encodeURIComponent(city)}`)
    }

    const handleCreateNewDestination = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCityName.trim()) {
            toast.error('Please enter a destination name')
            return
        }
        setIsNewDestModalOpen(false)
        handleNavigateToCity(newCityName.trim())
    }

    const confirmDeleteDestination = (city: string, count: number) => {
        setCityToDelete({ city, count })
    }

    const handleDeleteDestination = async () => {
        if (!cityToDelete) return
        try {
            await activitiesAPI.deleteDestination(cityToDelete.city)
            toast.success(`Deleted all activities for ${cityToDelete.city}`)
            loadDestinations()
        } catch (error: any) {
            console.error('Failed to delete destination:', error)
            toast.error('Failed to delete destination')
        } finally {
            setCityToDelete(null)
        }
    }

    return (
        <div className="min-h-screen bg-transparent">
            {/* Header */}
            <div className="glass-navbar sticky top-0 z-30 shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 255, 255, 0.20)' }}>
                <div className="container mx-auto px-6 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <nav className="flex items-center text-sm text-gray-500 mb-2">
                                <span className="hover:text-gray-900 cursor-pointer transition-colors" onClick={() => router.push('/agent/dashboard')}>Dashboard</span>
                                <span className="mx-2">/</span>
                                <span className="font-medium text-gray-900">Activity Master</span>
                            </nav>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <MapPin className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Destinations Library</h1>
                                    <p className="text-gray-500 text-sm mt-1">Manage all destinations and their activities</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => {
                                    setNewCityName('')
                                    setIsNewDestModalOpen(true)
                                }}
                                className="text-white px-6 transition-all hover:-translate-y-0.5 border-none shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #6c47ff, #9333ea)', borderRadius: '100px' }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Destination
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {/* Summary Bar */}
                <div className="flex flex-wrap items-center gap-6 mb-8 p-5 transition-all duration-300" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: '20px', boxShadow: '0 8px 32px rgba(180, 100, 60, 0.08)' }}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100/50">
                            <MapPin className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Destinations</p>
                            <p className="text-2xl font-bold text-slate-800 leading-tight">{destinations.length}</p>
                        </div>
                    </div>
                    <div className="hidden sm:block w-px h-12 bg-gray-300/40"></div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100/50">
                            <ActivityIcon className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Total Activities</p>
                            <p className="text-2xl font-bold text-slate-800 leading-tight">{totalActivities}</p>
                        </div>
                    </div>
                </div>

                {/* Search / Filter Area */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search destinations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/60 backdrop-blur-md border-white/40 pl-10 w-full sm:w-80 rounded-full text-slate-800 focus:ring-indigo-500 focus:border-indigo-300 focus:bg-white shadow-sm transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600"></div>
                    </div>
                ) : filteredDestinations.length === 0 ? (
                    <div className="text-center py-20 px-4 rounded-[20px]" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 8px 32px rgba(180, 100, 60, 0.08)' }}>
                        <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800">No destinations found</h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                            {searchTerm ? `No destinations match "${searchTerm}".` : "You haven't added any destinations yet."}
                        </p>
                        {!searchTerm && (
                            <Button
                                onClick={() => {
                                    setNewCityName('')
                                    setIsNewDestModalOpen(true)
                                }}
                                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md"
                            >
                                Add Your First Destination
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {paginatedDestinations.map(dest => (
                                <Card
                                    key={dest.city}
                                    className="group cursor-pointer overflow-hidden border border-white/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                                    style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '24px' }}
                                    onClick={() => handleNavigateToCity(dest.city)}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="h-14 w-14 rounded-2xl bg-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                                <MapPin className="h-7 w-7" />
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-800 hover:bg-white/50 rounded-full">
                                                        <MoreHorizontal className="h-5 w-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-gray-100">
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer rounded-lg m-1 font-medium"
                                                        onClick={(e) => { e.stopPropagation(); confirmDeleteDestination(dest.city, dest.activity_count); }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Destination
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <h2 className="text-2xl font-bold text-slate-800 mb-2 truncate group-hover:text-indigo-700 transition-colors">{dest.city}</h2>

                                        <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600 px-3 py-1 rounded-full font-medium mb-6 shadow-sm">
                                            {dest.activity_count} {dest.activity_count === 1 ? 'Activity' : 'Activities'}
                                        </Badge>

                                        <div className="flex items-center text-indigo-600 font-semibold text-sm group-hover:tracking-wide transition-all">
                                            Manage Activities
                                            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-12 bg-white/40 backdrop-blur-md rounded-full w-max mx-auto p-2 border border-white/50 shadow-sm">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="rounded-full hover:bg-white/80"
                                >
                                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                                </Button>
                                <span className="text-sm font-medium text-slate-700 px-4">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="rounded-full hover:bg-white/80"
                                >
                                    <ChevronRight className="h-5 w-5 text-slate-600" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* New Destination Modal */}
            <Dialog open={isNewDestModalOpen} onOpenChange={setIsNewDestModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[24px] border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold tracking-tight text-slate-800">New Destination</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Enter the name of the new city to manage its activities.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateNewDestination}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="city-name" className="font-semibold text-slate-700">City Name</Label>
                                <Input
                                    id="city-name"
                                    value={newCityName}
                                    onChange={(e) => setNewCityName(e.target.value)}
                                    placeholder="e.g., Paris, Tokyo, New York"
                                    className="h-12 rounded-xl text-lg border-slate-200 focus:border-indigo-400 focus:ring-indigo-100"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsNewDestModalOpen(false)}
                                className="rounded-full text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-md">
                                Continue to Destination
                            </Button>
                        </DialogFooter>
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
                            className="rounded-full bg-red-600 hover:bg-red-700 text-white border-0 shadow-md"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Everything
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
