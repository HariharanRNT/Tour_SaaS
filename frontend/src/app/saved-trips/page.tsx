'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { tripPlannerAPI } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calendar, MapPin, Users, Trash2, ArrowRight, Loader2, Plane, Clock, Sparkles, Filter, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SavedTripsPage() {
    const router = useRouter()
    const [sessions, setSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        loadSessions()
    }, [])

    const loadSessions = async () => {
        try {
            const data = await tripPlannerAPI.getUserSessions()
            setSessions(data)
        } catch (error) {
            console.error('Failed to load saved trips:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this saved trip?')) return

        setDeletingId(id)
        try {
            await tripPlannerAPI.deleteSession(id)
            setSessions(prev => prev.filter(s => s.session_id !== id))
        } catch (error) {
            console.error('Failed to delete trip:', error)
            alert('Failed to delete trip')
        } finally {
            setDeletingId(null)
        }
    }

    const filteredSessions = sessions.filter(session =>
        session.destination.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-500 font-medium tracking-tight">Loading your adventures...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-24">
            {/* Header Section with Pattern */}
            <div className="bg-white border-b border-gray-100 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}
                />
                <div className="container mx-auto px-4 py-12 relative z-10 max-w-7xl">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                                    Saved Trips
                                </span>
                            </h1>
                            <p className="text-gray-500 text-lg font-medium">Your dream adventures await! Resume planning or start something new.</p>
                        </div>
                        <Link href="/itinerary/builder">
                            <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 px-6 py-6 rounded-xl text-lg font-bold transition-all hover:translate-y-[-2px]">
                                <Sparkles className="h-5 w-5 mr-2 text-blue-200" />
                                Start New Plan
                            </Button>
                        </Link>
                    </div>

                    {/* Filters & Search - Only show if there are sessions */}
                    {sessions.length > 0 && (
                        <div className="mt-10 flex flex-col md:flex-row gap-4 items-center bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-gray-200/50 shadow-sm max-w-3xl">
                            <div className="relative flex-1 w-full md:w-auto">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search destinations..."
                                    className="pl-9 border-0 bg-transparent focus-visible:ring-0 text-base"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="h-6 w-px bg-gray-200 hidden md:block" />
                            <div className="flex gap-2 w-full md:w-auto">
                                <Select defaultValue="recent">
                                    <SelectTrigger className="w-[160px] border-white/20 bg-white/10 focus:ring-0 rounded-xl font-medium">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recent">Recent First</SelectItem>
                                        <SelectItem value="oldest">Oldest First</SelectItem>
                                        <SelectItem value="name">Destination</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 max-w-7xl">
                {sessions.length === 0 ? (
                    <Card className="border-0 shadow-none bg-transparent">
                        <CardContent className="py-20 text-center flex flex-col items-center">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse" />
                                <div className="relative bg-white p-6 rounded-[2rem] shadow-xl shadow-blue-500/10">
                                    <MapPin className="h-16 w-16 text-blue-500" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">No saved trips yet!</h3>
                            <p className="text-gray-500 mb-8 text-lg max-w-md mx-auto">
                                Start planning your dream vacation and save it here for later access.
                            </p>
                            <Link href="/plan-trip">
                                <Button size="lg" className="glass-panel hover:bg-white/10 text-blue-600 border px-8 py-6 h-auto text-lg rounded-xl font-bold shadow-sm transition-all hover:shadow-md">
                                    <Sparkles className="h-5 w-5 mr-2" />
                                    Start Your First Plan
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredSessions.map((session) => (
                            <Link href={`/plan-trip/build?session=${session.session_id}`} key={session.session_id} className="group block">
                                <Card className="border-0 bg-white shadow-md hover:shadow-2xl transition-all duration-300 rounded-[1.5rem] overflow-hidden group-hover:-translate-y-1 h-full flex flex-col relative">
                                    <div className="h-48 glass-panel relative overflow-hidden border-0 rounded-b-none">
                                        {/* Placeholder Image - In a real app, this would be dynamic */}
                                        <img
                                            src={`https://placehold.co/600x400/e2e8f0/64748b?text=${session.destination.split(',')[0]}`}
                                            alt={session.destination}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                        <div className="absolute top-4 left-4">
                                            <Badge className={`backdrop-blur-md bg-white/20 text-white border-0 px-3 py-1 font-bold shadow-sm ${session.status === 'confirmed' ? 'bg-green-500/20 text-green-100' : ''
                                                }`}>
                                                {session.status === 'confirmed' ? 'BOOKED' : 'ACTIVE'}
                                            </Badge>
                                        </div>

                                        <div className="absolute bottom-4 left-4 right-4 text-white">
                                            <h3 className="text-2xl font-black tracking-tight leading-none mb-1 shadow-black/10 drop-shadow-md">
                                                {session.destination}
                                            </h3>
                                            <div className="flex items-center gap-1 text-white/90 text-sm font-medium">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span>Custom Trip</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <CardContent className="p-5 pt-6 flex-1 flex flex-col">
                                        <div className="flex flex-col gap-4 mb-6">
                                            <div className="flex items-center gap-3 text-gray-700">
                                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                                    <Calendar className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Departure</p>
                                                    <p className="font-bold">{session.start_date ? formatDate(session.start_date) : 'Flexible Dates'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 text-gray-700">
                                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                                    <Clock className="h-4 w-4 text-[var(--primary)]" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</p>
                                                    <p className="font-bold">{session.duration_days} Days / {session.duration_nights} Nights</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 text-gray-700">
                                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                                    <Users className="h-4 w-4 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Travelers</p>
                                                    <p className="font-bold">{(session.travelers?.adults || 0) + (session.travelers?.children || 0)} Dynamic Travelers</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-gray-100">
                                            {session.price_per_person > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Package starts from</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-black text-gray-900">{formatCurrency(session.price_per_person)}</span>
                                                        <span className="text-sm font-medium text-gray-400">/ person</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 rounded-xl font-bold border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                                                    onClick={(e) => handleDelete(session.session_id, e)}
                                                    disabled={deletingId === session.session_id}
                                                >
                                                    {deletingId === session.session_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                                <Button className="flex-[3] bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-black/5 group-hover:shadow-black/10 transition-all">
                                                    Resume Planning
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
