import { API_URL } from '@/lib/api'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog'
import { ArrowLeft, MapPin, Calendar, Plus, Edit2, Trash2 } from 'lucide-react'
import { ActivityImageGallery } from '@/components/ui/activity-image-gallery'
import { toast } from 'sonner'

interface Package {
    id: string
    title: string
    destination: string
    duration_days: number
    duration_nights: number
    category: string
    price_per_person: number
    max_group_size: number
    description: string
    status?: string
    itinerary?: any[]
}

interface ActivityFormData {
    id?: string
    title: string
    description: string
    image_url: string
    day_number: number
    time_slot: string
    display_order: number
}

const INITIAL_FORM_DATA: ActivityFormData = {
    title: '',
    description: '',
    image_url: '',
    day_number: 1,
    time_slot: 'morning',
    display_order: 0
}

export default function PackageDetailPage() {
    const router = useRouter()
    const params = useParams()
    const packageId = params.id as string

    const [packageData, setPackageData] = useState<Package | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState<ActivityFormData>(INITIAL_FORM_DATA)
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        loadPackageData()
    }, [packageId])

    const loadPackageData = async () => {
        setLoading(true)
        setError(null)
        try {
            // const response = await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}`)
            const response = await fetch(`${API_URL}/api/v1/admin-simple/packages-simple/${packageId}`)

            if (!response.ok) {
                throw new Error('Failed to load package')
            }

            const data = await response.json()

            if (!data.package) {
                setError('Package not found')
                return
            }

            setPackageData({
                ...data.package,
                itinerary: data.itinerary_by_day || []
            })
        } catch (err) {
            console.error('Failed to load package:', err)
            setError('Failed to load package details')
        } finally {
            setLoading(false)
        }
    }

    const openAddDialog = (day: number, slot: string) => {
        setFormData({
            ...INITIAL_FORM_DATA,
            day_number: day,
            time_slot: slot,
            display_order: getNextDisplayOrder(day, slot)
        })
        setIsEditing(false)
        setIsDialogOpen(true)
    }

    const openEditDialog = (activity: any) => {
        setFormData({
            id: activity.id,
            title: activity.title,
            description: activity.description,
            image_url: activity.image_url || '',
            day_number: activity.day_number || 1,
            time_slot: activity.time_slot || 'morning',
            display_order: activity.display_order || 0
        })
        setIsEditing(true)
        setIsDialogOpen(true)
    }

    const getNextDisplayOrder = (day: number, slot: string) => {
        if (!packageData?.itinerary) return 0
        const dayData = packageData.itinerary.find((d: any) => d.day_number === day)
        if (!dayData || !dayData[slot]) return 0
        return dayData[slot].length
    }

    const handleSaveActivity = async () => {
        if (!formData.title) {
            toast.error('Title is required')
            return
        }

        setSaving(true)
        try {
            const url = isEditing
                ? `${API_URL}/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items/${formData.id}`
                : `${API_URL}/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items`

            const method = isEditing ? 'PATCH' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!response.ok) throw new Error('Failed to save activity')

            await loadPackageData()
            setIsDialogOpen(false)
            toast.success(`Activity ${isEditing ? 'updated' : 'added'} successfully`)
        } catch (error) {
            console.error('Failed to save activity:', error)
            toast.error('Failed to save activity')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteClick = (id: string) => {
        setDeleteId(id)
    }

    const confirmDelete = async () => {
        if (!deleteId) return

        setIsDeleting(true)
        try {
            const response = await fetch(`${API_URL}/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items/${deleteId}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Failed to delete')

            await loadPackageData()
            toast.success('Activity has been deleted.')
            setDeleteId(null)
        } catch (error) {
            console.error('Failed to delete activity:', error)
            toast.error('Failed to delete activity')
        } finally {
            setIsDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading package details...</p>
                </div>
            </div>
        )
    }

    if (error || !packageData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Card className="max-w-md glass-card">
                    <CardContent className="pt-6">
                        <p className="text-red-600 text-center">{error || 'Package not found'}</p>
                        <Button onClick={() => router.push('/admin/packages')} className="mt-4 w-full">
                            Back to Packages
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const renderTimeSlot = (day: any, slot: string, label: string) => (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm text-gray-600 uppercase tracking-wider">{label}</h4>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => openAddDialog(day.day_number, slot)}
                >
                    <Plus className="h-3 w-3 mr-1" /> Add Activity
                </Button>
            </div>

            {day[slot] && day[slot].length > 0 ? (
                day[slot].map((activity: any, idx: number) => (
                    <div key={idx} className="ml-0 mb-3 p-3 glass-card border border-gray-100 rounded-lg flex gap-4 group hover:border-blue-100 transition-colors shadow-sm">
                        <div className="w-20 h-20 flex-shrink-0">
                            <ActivityImageGallery
                                images={activity.image_url ? [activity.image_url] : []}
                                title={activity.title}
                                className="w-full h-full rounded-md object-cover"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h5 className="font-semibold text-gray-900">{activity.title}</h5>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 hover:bg-gray-100"
                                        onClick={() => openEditDialog({ ...activity, day_number: day.day_number, time_slot: slot })}
                                    >
                                        <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 hover:bg-red-50"
                                        onClick={() => handleDeleteClick(activity.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{activity.description}</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-xs text-gray-400 italic py-2">No activities planned</div>
            )}
        </div>
    )

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-[1440px] mx-auto space-y-6">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/packages')} className="text-blue-600 hover:bg-blue-50">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{packageData.title}</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {packageData.destination}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {packageData.duration_days}D/{packageData.duration_nights}N</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {packageData.status && (
                            <Badge variant={packageData.status === 'PUBLISHED' ? 'default' : 'secondary'} className="px-3">
                                {packageData.status}
                            </Badge>
                        )}
                        <Button
                            onClick={() => router.push(`/admin/packages/new?id=${packageId}`)}
                            variant="outline"
                            size="sm"
                            className="border-gray-200"
                        >
                            Edit Details
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <Tabs defaultValue="itinerary" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="itinerary">Itinerary Planner</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="md:col-span-1 border-gray-100 shadow-sm glass-card">
                                <CardHeader>
                                    <CardTitle className="text-lg">Package Specs</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <Label className="text-xs text-gray-400 font-medium">CATEGORY</Label>
                                            <p className="font-semibold text-gray-900 mt-0.5">{packageData.category}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-400 font-medium">PRICE</Label>
                                            <p className="font-bold text-blue-600 text-lg">₹{packageData.price_per_person}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-400 font-medium">MAX GROUP SIZE</Label>
                                            <p className="font-semibold text-gray-900 mt-0.5">{packageData.max_group_size} travelers</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="md:col-span-2 border-gray-100 shadow-sm glass-card">
                                <CardHeader>
                                    <CardTitle className="text-lg">Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">{packageData.description}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="itinerary" className="mt-0">
                        <Card className="border-gray-100 shadow-sm glass-panel">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Daily Itinerary</CardTitle>
                                    <CardDescription>Plan and manage activities day-by-day</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={loadPackageData} className="border-gray-200">
                                    Refresh
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {packageData.itinerary && packageData.itinerary.length > 0 ? (
                                    <div className="space-y-8">
                                        {packageData.itinerary.map((day: any) => (
                                            <div key={day.day_number} className="border border-gray-100 rounded-xl p-6 glass-card">
                                                <h3 className="text-lg font-bold mb-6 text-gray-900 border-b border-gray-100 pb-3">Day {day.day_number}</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                                    {renderTimeSlot(day, 'morning', '🌅 Morning')}
                                                    {renderTimeSlot(day, 'afternoon', '☀️ Afternoon')}
                                                    {renderTimeSlot(day, 'evening', '🌆 Evening')}
                                                    {renderTimeSlot(day, 'night', '🌙 Night')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-24">
                                        <div className="bg-transparent w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Calendar className="h-10 w-10 text-gray-200" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">Itinerary Pending</h3>
                                        <p className="text-gray-500 max-w-xs mx-auto mt-1">This package currently has no itinerary data available.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Dialogs */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Activity' : 'Add New Activity'}</DialogTitle>
                        <DialogDescription>
                            Enter activity details for Day {formData.day_number} - {formData.time_slot}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Activity Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Visit Tokyo Tower"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Briefly describe what happens..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="image_url">Image URL (Optional)</Label>
                            <Input
                                id="image_url"
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="Paste image link here"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveActivity} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                            {saving ? 'Saving...' : 'Save Activity'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove this activity? This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete Activity'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
