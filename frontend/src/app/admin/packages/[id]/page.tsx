'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
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
import { ArrowLeft, MapPin, Calendar, Plus, Edit2, Trash2, X } from 'lucide-react'
import { ActivityImageGallery } from '@/components/ui/activity-image-gallery'
import { toast } from 'react-toastify'

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
            const response = await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}`)

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
            day_number: activity.day_number || 1, // These might need to be passed from parent if not in activity object
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
                ? `http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items/${formData.id}`
                : `http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items`

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
            const response = await fetch(`http://localhost:8000/api/v1/admin-simple/packages-simple/${packageId}/itinerary-items/${deleteId}`, {
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading package details...</p>
                </div>
            </div>
        )
    }

    if (error || !packageData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="max-w-md">
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

    // Helper to render a time slot section
    const renderTimeSlot = (day: any, slot: string, label: string) => (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm text-gray-600 capitalize">{label}</h4>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => openAddDialog(day.day_number, slot)}
                >
                    <Plus className="h-3 w-3 mr-1" /> Add Activity
                </Button>
            </div>

            {day[slot] && day[slot].length > 0 ? (
                day[slot].map((activity: any, idx: number) => (
                    <div key={idx} className="ml-4 mb-2 p-3 bg-white border rounded-lg flex gap-3 group">
                        <div className="w-24 h-24 flex-shrink-0">
                            <ActivityImageGallery
                                images={activity.image_url ? [activity.image_url] : []}
                                title={activity.title}
                                className="w-full h-full"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h5 className="font-medium">{activity.title}</h5>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => openEditDialog({ ...activity, day_number: day.day_number, time_slot: slot })}
                                    >
                                        <Edit2 className="h-3 w-3 text-gray-500" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleDeleteClick(activity.id)}
                                    >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="ml-4 text-xs text-gray-400 italic">No activities planned</div>
            )}
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/packages')}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">{packageData.title}</h1>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {packageData.destination}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {packageData.duration_days}D/{packageData.duration_nights}N</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {packageData.status && (
                                <Badge variant={packageData.status === 'published' ? 'default' : 'secondary'}>
                                    {packageData.status}
                                </Badge>
                            )}
                            <Button onClick={() => router.push(`/admin/packages/new?id=${packageId}`)} variant="outline" size="sm">
                                Edit Details
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <Tabs defaultValue="itinerary" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="itinerary">Itinerary Builder</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Package Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Category</label>
                                            <p className="font-medium">{packageData.category}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Price</label>
                                            <p className="font-medium text-blue-600">₹{packageData.price_per_person}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Group Size</label>
                                            <p className="font-medium">{packageData.max_group_size}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 whitespace-pre-wrap text-sm">{packageData.description}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="itinerary">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Itinerary Planner</CardTitle>
                                    <CardDescription>Manage day-wise activities</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={loadPackageData}>
                                    Refresh
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {packageData.itinerary && packageData.itinerary.length > 0 ? (
                                    <div className="space-y-8">
                                        {packageData.itinerary.map((day: any) => (
                                            <div key={day.day_number} className="border rounded-lg p-6 bg-gray-50/50">
                                                <h3 className="text-lg font-bold mb-6 text-gray-800 border-b pb-2">Day {day.day_number}</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                                    {renderTimeSlot(day, 'morning', '🌅 Morning')}
                                                    {renderTimeSlot(day, 'afternoon', '☀️ Afternoon')}
                                                    {renderTimeSlot(day, 'evening', '🌆 Evening')}
                                                    {renderTimeSlot(day, 'night', '🌙 Night')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900">No Itinerary Generated</h3>
                                        <p className="text-gray-500 mb-4">This package has no days assigned.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Add/Edit Activity Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Activity title"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the activity..."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="image_url">Image URL (Optional)</Label>
                            <Input
                                id="image_url"
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        {/* Hidden context fields */}
                        <div className="text-xs text-gray-500 mt-2">
                            Day {formData.day_number} - {formData.time_slot}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveActivity} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Activity'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Activity?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this activity? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
