'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Save, Trash2, Edit, CheckCircle2, GripVertical, Upload, X, Clock, Sun, Sunset, Moon, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { activitiesAPI, API_URL } from '@/lib/api'
import { Activity, ActivityCreate, TimeSlotPreference } from '@/types/activities'
import { ActivityImageGallery } from '@/components/ui/activity-image-gallery'
import { getValidImageUrl } from '@/lib/utils/image'

export default function CityActivityManager({ params }: { params: { city: string } }) {
    const router = useRouter()
    // Decode the city name from the URL
    const cityName = decodeURIComponent(params.city)

    // Left Side State
    const [existingActivities, setExistingActivities] = useState<Activity[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
    const formRef = useRef<HTMLDivElement>(null)

    // Right Side Bulk Creation State
    const createEmptyRow = (): ActivityCreate => ({
        name: '',
        destination_city: cityName,
        category: '',
        duration_hours: 1,
        time_slot_preference: 'morning',
        description: '',
        images: [],
        price_per_person: 0
    })

    const [activityRows, setActivityRows] = useState<ActivityCreate[]>([createEmptyRow()])
    const [isSavingAll, setIsSavingAll] = useState(false)

    useEffect(() => {
        loadCityActivities()
    }, [cityName])

    const loadCityActivities = async () => {
        setIsLoading(true)
        try {
            const data = await activitiesAPI.getAll({ city: cityName })
            setExistingActivities(data)
        } catch (error) {
            console.error('Failed to load city activities:', error)
            toast.error('Failed to load activities for ' + cityName)
        } finally {
            setIsLoading(false)
        }
    }

    // --- Right Side Actions ---

    const handleAddRow = () => {
        setActivityRows([...activityRows, createEmptyRow()])
    }

    const handleRemoveRow = (index: number) => {
        if (activityRows.length === 1) return // Keep at least one row
        const newRows = [...activityRows]
        newRows.splice(index, 1)
        setActivityRows(newRows)
    }

    const handleRowChange = (index: number, field: keyof ActivityCreate, value: any) => {
        const newRows = [...activityRows]
        newRows[index] = { ...newRows[index], [field]: value }
        setActivityRows(newRows)
    }

    // --- Image Handling per Row ---

    const handleAddImage = async (rowIndex: number) => {
        const row = activityRows[rowIndex]
        if ((row.images?.length || 0) >= 5) {
            toast.warning('Maximum 5 images allowed')
            return
        }

        // Create a hidden file input to trigger file selection
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/jpeg, image/png, image/webp'

        input.onchange = async (e: any) => {
            const file = e.target.files?.[0]
            if (!file) return

            // Show loading placeholder initially
            const tempId = Date.now().toString()
            const newImages = [...(row.images || [])]
            const newImageObj = {
                image_url: 'loading',
                display_order: newImages.length,
                _tempId: tempId // just for internal tracking if needed
            }
            newImages.push(newImageObj)
            handleRowChange(rowIndex, 'images', newImages)

            try {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('folder', 'activities')

                // Get token and URL
                const token = localStorage.getItem('token')
                if (!token) throw new Error('Not authenticated')

                const uploadUrl = `${API_URL}/api/v1/upload`
                const res = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                })

                if (!res.ok) throw new Error('Upload failed')
                const data = await res.json()
                const url = data.url

                if (url) {
                    // Update the loading placeholder with actual URL
                    setActivityRows(currentRows => {
                        const updatedRows = [...currentRows]
                        const targetRow = { ...updatedRows[rowIndex] }
                        const targetImages = [...(targetRow.images || [])]

                        const imgIdx = targetImages.findIndex((img: any) => img.image_url === 'loading' || (img as any)._tempId === tempId)
                        if (imgIdx !== -1) {
                            targetImages[imgIdx] = {
                                ...targetImages[imgIdx],
                                image_url: url
                            }
                        } else {
                            // Fallback if not found
                            targetImages.push({
                                image_url: url,
                                display_order: targetImages.length
                            })
                        }

                        targetRow.images = targetImages
                        updatedRows[rowIndex] = targetRow
                        return updatedRows
                    })
                }
            } catch (error) {
                console.error("Upload error:", error)
                toast.error("Failed to upload image")

                // Remove the loading placeholder on failure
                setActivityRows(currentRows => {
                    const updatedRows = [...currentRows]
                    const targetRow = { ...updatedRows[rowIndex] }
                    targetRow.images = (targetRow.images || []).filter(img => img.image_url !== 'loading' && (img as any)._tempId !== tempId)
                    updatedRows[rowIndex] = targetRow
                    return updatedRows
                })
            }
        }

        input.click()
    }

    const handleAddImageUrl = (rowIndex: number) => {
        const row = activityRows[rowIndex]
        if ((row.images?.length || 0) >= 5) {
            toast.warning('Maximum 5 images allowed')
            return
        }
        const url = prompt('Enter image URL:')
        if (url) {
            const newImages = [...(row.images || [])]
            newImages.push({
                image_url: url,
                display_order: newImages.length
            })
            handleRowChange(rowIndex, 'images', newImages)
        }
    }

    const handleRemoveImage = (rowIndex: number, imgIndex: number) => {
        const row = activityRows[rowIndex]
        const newImages = (row.images || []).filter((_: any, i: number) => i !== imgIndex)
        const reordered = newImages.map((img: any, i: number) => ({ ...img, display_order: i }))
        handleRowChange(rowIndex, 'images', reordered)
    }

    const handleMoveImage = (rowIndex: number, imgIndex: number, direction: 'up' | 'down') => {
        const row = activityRows[rowIndex]
        if (!row.images) return
        const newImages = [...row.images]
        const targetIndex = direction === 'up' ? imgIndex - 1 : imgIndex + 1

        if (targetIndex < 0 || targetIndex >= newImages.length) return

        const temp = newImages[imgIndex]
        newImages[imgIndex] = newImages[targetIndex]
        newImages[targetIndex] = temp

        const reordered = newImages.map((img, i) => ({ ...img, display_order: i }))
        handleRowChange(rowIndex, 'images', reordered)
    }

    // --- Submission ---

    const handleSaveAll = async () => {
        // Validation: Filter out completely empty rows. Check partial rows.
        const rowsToSave: ActivityCreate[] = []
        let hasValidationErrors = false

        activityRows.forEach((row, i) => {
            const isCompletelyEmpty = !row.name && !row.category && (row.duration_hours === 1) && !row.description && (!row.images || row.images.length === 0) && row.price_per_person === 0

            if (isCompletelyEmpty) {
                // Ignore completely empty rows
                return
            }

            // Check required fields for partially filled rows
            if (!row.name || !row.category || !row.duration_hours) {
                hasValidationErrors = true
                toast.error(`Row ${i + 1} is missing required fields (Name, Category, Duration)`)
                return
            }

            rowsToSave.push(row)
        })

        if (hasValidationErrors) return
        if (rowsToSave.length === 0) {
            toast.info("No activities to save")
            return
        }

        setIsSavingAll(true)
        try {
            if (editingActivity) {
                // Single Update Mode
                await activitiesAPI.update(editingActivity.id, rowsToSave[0])
                toast.success("Activity updated successfully!")
            } else {
                // Bulk Creation Mode
                await Promise.all(rowsToSave.map(row => activitiesAPI.create(row)))
                toast.success(`Successfully saved ${rowsToSave.length} activities!`)
            }

            // Re-fetch left side
            loadCityActivities()

            // Reset right side
            handleCancelEdit()
        } catch (error: any) {
            console.error('Failed to save activities:', error)
            toast.error(error?.response?.data?.detail || 'Failed to save some activities')
        } finally {
            setIsSavingAll(false)
        }
    }

    // --- Edit Flow Actions ---

    const handleEditClick = (activity: Activity) => {
        setEditingActivity(activity)
        setActivityRows([{
            name: activity.name,
            destination_city: activity.destination_city,
            category: activity.category,
            duration_hours: activity.duration_hours,
            time_slot_preference: activity.time_slot_preference,
            description: activity.description || '',
            images: activity.images.map(img => ({ image_url: img.image_url, display_order: img.display_order })),
            price_per_person: activity.price_per_person || 0
        }])

        // Smooth scroll to form
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleCancelEdit = () => {
        setEditingActivity(null)
        setActivityRows([createEmptyRow()])
    }

    // --- Left Side Actions ---

    const handleDeleteExisting = (id: string) => {
        const activity = existingActivities.find(a => a.id === id)
        
        toast(`Delete ${activity?.name || 'this activity'}?`, {
            description: 'This action cannot be undone. Permanent removal from itinerary.',
            action: {
                label: 'Confirm Delete',
                onClick: async () => {
                    try {
                        await activitiesAPI.delete(id)
                        toast.success('Activity deleted successfully')
                        loadCityActivities()
                    } catch (error: any) {
                        console.error('Failed to delete activity:', error)
                        toast.error(error?.response?.data?.detail || 'Failed to delete activity')
                    }
                }
            },
            cancel: {
                label: 'Cancel',
                onClick: () => {}
            },
            duration: 5000,
        })
    }

    const getTimeSlotIcon = (slot: string) => {
        switch (slot) {
            case 'morning': return <Sun className="h-4 w-4 text-amber-500" />
            case 'afternoon': return <Sun className="h-4 w-4 text-orange-500" />
            case 'evening': return <Sunset className="h-4 w-4 text-rose-500" />
            case 'night': return <Moon className="h-4 w-4 text-indigo-500" />
            default: return <Clock className="h-4 w-4 text-blue-500" />
        }
    }

    return (
        <div className="min-h-screen flex flex-col h-screen overflow-hidden text-slate-800 bg-transparent">

            {/* Header - Glass */}
            <div className="glass-panel border-b border-white/10 shrink-0 relative z-30 m-6 mb-2 rounded-[32px]">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/agent/activities')}
                                className="h-11 w-11 shrink-0 rounded-full bg-white/40 backdrop-blur-md border border-white/50 hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] text-slate-600 shadow-sm transition-all duration-300"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--primary)' }}>
                                    <MapPin className="h-6 w-6 text-[var(--primary)]" />
                                    {cityName.charAt(0).toUpperCase() + cityName.slice(1)}
                                </h1>
                                <p className="text-[#8B5E34] text-sm mt-1 font-medium">Manage all activities for this destination</p>
                            </div>
                        </div>

                        <Button
                            onClick={handleSaveAll}
                            disabled={isSavingAll || activityRows.length === 0}
                            className="text-white font-semibold rounded-[50px] px-8 py-6 shadow-[0_8px_24px_rgba(255,107,43,0.3)] hover:shadow-[0_12px_32px_rgba(255,107,43,0.4)] transition-all duration-300 hover:-translate-y-1 active:scale-95 border border-white/20"
                            style={{ background: 'linear-gradient(135deg, var(--primary), #FF9A5C)' }}
                        >
                            {isSavingAll ? 'Saving...' : (
                                <>
                                    <Save className="mr-2 h-5 w-5" /> Save All Activities
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Split Content */}
            <div className="flex flex-1 overflow-hidden h-full px-6 pb-6 gap-8">

                {/* Left Panel: Existing Activities */}
                <div className="w-1/3 min-w-[350px] max-w-[450px] flex flex-col h-full overflow-y-auto custom-scrollbar">
                    <div className="h-full flex flex-col overflow-hidden border border-white/40 shadow-sm transition-all" style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '32px' }}>
                        <div className="p-6 shrink-0 sticky top-0 z-10 border-b border-white/40 bg-white/20 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xl font-bold text-[var(--primary)]">Existing Activities</h2>
                                <div className="bg-[#FF9A5C]/20 text-[#D95D22] font-bold px-3 py-1 rounded-full text-xs border border-[#FF9A5C]/30 shadow-sm">
                                    {existingActivities.length}
                                </div>
                            </div>
                            <p className="text-sm text-[#8B5E34] font-medium opacity-80">Live preview of saved activities</p>
                        </div>

                        <div className="p-6 pt-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 relative">
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--primary)]/20 border-t-[var(--primary)]"></div>
                                </div>
                            ) : existingActivities.length === 0 ? (
                                <div className="text-center p-8 border-2 border-dashed border-[var(--primary)]/30 rounded-[24px] bg-white/30 backdrop-blur-sm shadow-sm">
                                    <div className="h-12 w-12 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-amber-50 rounded-2xl flex items-center justify-center border border-white/60 shadow-inner">
                                        <MapPin className="h-6 w-6 text-[var(--primary)]" />
                                    </div>
                                    <p className="text-[var(--primary)] text-[15px] font-semibold mb-1">No activities planned yet.</p>
                                    <p className="text-[#8B5E34] text-sm leading-relaxed opacity-80">Add your first experience on the right to start building your itinerary.</p>
                                </div>
                            ) : (
                                existingActivities.map((activity) => {
                                    // Tag color assignments
                                    let tagBg = "bg-orange-500/15"
                                    let tagText = "text-orange-700"
                                    let dotColor = "bg-orange-500"

                                    if (activity.category.includes('Beach')) {
                                        tagBg = "bg-cyan-500/15"; tagText = "text-cyan-700"; dotColor = "bg-cyan-500";
                                    } else if (activity.category.includes('Cultural')) {
                                        tagBg = "bg-purple-500/15"; tagText = "text-purple-700"; dotColor = "bg-purple-500";
                                    } else if (activity.category.includes('Nature')) {
                                        tagBg = "bg-emerald-500/15"; tagText = "text-emerald-700"; dotColor = "bg-emerald-500";
                                    }

                                    const isEditing = editingActivity?.id === activity.id

                                    return (
                                        <Card key={activity.id} className={`overflow-hidden relative group border-white/50 hover:shadow-[0_12px_30px_rgba(255,107,43,0.1)] transition-all duration-300 hover:-translate-y-1 ${isEditing ? 'border-l-4 border-l-[var(--primary)] bg-[var(--primary)]/10 shadow-[0_8px_24px_rgba(255,107,43,0.15)] scale-[1.02]' : ''}`} style={{ background: isEditing ? 'rgba(255,107,43,0.08)' : 'rgba(255,255,255,0.4)', backdropFilter: 'blur(20px)', borderRadius: '20px' }}>
                                            <div className="h-40 relative rounded-t-[20px] overflow-hidden">
                                                <ActivityImageGallery
                                                    images={activity.images.map((img: any) => img.image_url)}
                                                    title={activity.name}
                                                    aspectRatio="video"
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                                {/* Edit/Delete Hover Reveal */}
                                                <div className="absolute top-3 right-3 opacity-100 group-hover:opacity-100 transition-all duration-300 z-20 flex gap-2">
                                                    <Button size="icon" variant="ghost" className={`h-9 w-9 rounded-full backdrop-blur-md border shadow-sm transition-all ${isEditing ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white/40 text-slate-700 border-white/50 hover:bg-white/60 hover:text-[var(--primary)]'}`} onClick={() => handleEditClick(activity)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-red-500/20 backdrop-blur-md text-red-600 hover:bg-red-500/40 hover:text-red-700 border border-red-500/30 shadow-sm" onClick={() => handleDeleteExisting(activity.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                {/* Title Overlay inside thumbnail */}
                                                <div className="absolute bottom-0 inset-x-0 bg-white/40 backdrop-blur-md p-3 px-4 border-t border-white/50 flex justify-between items-center bg-gradient-to-t from-white/60 to-white/10 z-10">
                                                    <h3 className="font-bold text-[var(--primary)] text-[17px] line-clamp-1 flex-1 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{activity.name}</h3>
                                                    {(activity.price_per_person ?? 0) > 0 && (
                                                        <span className="font-semibold text-[#D95D22] text-sm ml-3 shrink-0 bg-white/60 px-2 py-0.5 rounded-md border border-white/50 backdrop-blur-sm shadow-sm">₹{activity.price_per_person}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <CardContent className="p-4 pt-3 flex flex-wrap gap-2.5 z-20 relative">
                                                {/* Category Tag Pill */}
                                                <div className={`flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${tagBg} ${tagText} border border-current shadow-sm`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1.5`} />
                                                    {activity.category}
                                                </div>

                                                {/* Duration Pill */}
                                                <span className="flex items-center gap-1.5 text-slate-700 font-medium text-xs bg-white/60 border border-white/50 shadow-sm px-2.5 py-1 rounded-full backdrop-blur-md">
                                                    <Clock className="h-3 w-3 text-[var(--primary)]" /> {activity.duration_hours}h
                                                </span>

                                                {/* Time Slot Pill */}
                                                <span className="flex items-center gap-1.5 text-slate-700 font-medium text-xs bg-white/60 border border-white/50 shadow-sm px-2.5 py-1 rounded-full backdrop-blur-md capitalize">
                                                    {getTimeSlotIcon(activity.time_slot_preference)}
                                                    {activity.time_slot_preference.replace('_', ' ')}
                                                </span>
                                            </CardContent>
                                        </Card>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Bulk Creation Form Form */}
                <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 lg:p-10 relative bg-white/10 backdrop-blur-sm rounded-[40px] border border-white/40 shadow-inner" ref={formRef}>
                    <div className="max-w-4xl mx-auto space-y-8 pb-20">
                        {activityRows.map((row, index) => (
                            <div key={index} className="glass-panel relative overflow-visible animate-in fade-in slide-in-from-bottom-4 group">

                                {/* Row Number Indicator / Pencil Icon */}
                                <div className={`absolute -left-4 -top-4 bg-gradient-to-br transition-all duration-500 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white/90 z-10 group-hover:scale-110 ${editingActivity ? 'from-[var(--primary)] to-[#D95D22] text-white scale-110' : 'from-[#FF9A5C] to-[var(--primary)] text-white'}`}>
                                    {editingActivity ? <Edit className="h-5 w-5" /> : index + 1}
                                </div>

                                {editingActivity && (
                                    <div className="absolute left-10 -top-3.5 px-4 py-1.5 bg-white/40 backdrop-blur-md border border-white/60 rounded-full text-[var(--primary)] text-xs font-bold shadow-sm animate-in fade-in slide-in-from-left-2">
                                        Editing: <span className="text-[var(--primary)]">{editingActivity.name}</span>
                                    </div>
                                )}

                                {/* Remove Row Button */}
                                {activityRows.length > 1 && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleRemoveRow(index)}
                                        className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-white/80 text-slate-400 hover:text-white hover:bg-red-500/90 border border-slate-200 shadow-sm z-10 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}

                                <CardContent className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                                        <div className="floating-label-group">
                                            <Input
                                                value={row.name}
                                                onChange={(e) => handleRowChange(index, 'name', e.target.value)}
                                                placeholder=" "
                                                className="glass-input peer"
                                            />
                                            <Label className="floating-label">Activity Name <span className="text-red-500">*</span></Label>
                                        </div>
                                        <div>
                                            <Label className="text-[#8B5E34] font-semibold mb-2 block">Category <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={row.category}
                                                onValueChange={(val) => handleRowChange(index, 'category', val)}
                                            >
                                                <SelectTrigger className="bg-white/22 backdrop-blur-md border border-white/40 rounded-[14px] text-slate-800 focus:ring-0 focus:border-[var(--primary)]/50 hover:bg-white/30 transition-all font-medium text-[15px] h-10 shadow-sm data-[placeholder]:text-slate-500/80">
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                                <SelectContent className="glass-panel border border-white/60 bg-white/80 backdrop-blur-xl">
                                                    <SelectItem value="Sightseeing">Sightseeing</SelectItem>
                                                    <SelectItem value="Adventure">Adventure</SelectItem>
                                                    <SelectItem value="Cultural">Cultural</SelectItem>
                                                    <SelectItem value="Food">Food & Drink</SelectItem>
                                                    <SelectItem value="Beach">Beach & Water</SelectItem>
                                                    <SelectItem value="Nature">Nature & Wildlife</SelectItem>
                                                    <SelectItem value="Relaxation">Relaxation</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-7 mt-7">
                                        <div>
                                            <Label className="text-[#8B5E34] font-semibold mb-2 block">Time Slot <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={row.time_slot_preference}
                                                onValueChange={(val: TimeSlotPreference) => handleRowChange(index, 'time_slot_preference', val)}
                                            >
                                                <SelectTrigger className="bg-white/22 backdrop-blur-md border border-white/40 rounded-[14px] text-slate-800 focus:ring-0 focus:border-[var(--primary)]/50 hover:bg-white/30 transition-all font-medium text-[15px] h-10 shadow-sm data-[placeholder]:text-slate-500/80">
                                                    <SelectValue placeholder="Select Time" />
                                                </SelectTrigger>
                                                <SelectContent className="glass-panel border border-white/60 bg-white/80 backdrop-blur-xl">
                                                    <SelectItem value="morning">Morning</SelectItem>
                                                    <SelectItem value="afternoon">Afternoon</SelectItem>
                                                    <SelectItem value="evening">Evening</SelectItem>
                                                    <SelectItem value="full_day">Full Day</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="floating-label-group">
                                            <div className="relative flex items-center h-10">
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    min="0.5"
                                                    value={row.duration_hours}
                                                    onChange={(e) => handleRowChange(index, 'duration_hours', parseFloat(e.target.value))}
                                                    className="glass-input pr-14 h-full"
                                                    placeholder=" "
                                                />
                                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/50 backdrop-blur-md border border-white/60 px-2.5 py-1 rounded-[10px] text-[var(--primary)] text-xs font-bold pointer-events-none shadow-sm">
                                                    hrs
                                                </div>
                                            </div>
                                            <Label className="floating-label">Duration <span className="text-red-500">*</span></Label>
                                        </div>
                                        <div className="floating-label-group">
                                            <div className="relative h-10">
                                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--primary)] font-bold">₹</div>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={row.price_per_person || ''}
                                                    onChange={(e) => handleRowChange(index, 'price_per_person', parseFloat(e.target.value) || 0)}
                                                    className="pl-8 glass-input h-full"
                                                    placeholder=" "
                                                />
                                            </div>
                                            <Label className="floating-label">Price / Person</Label>
                                        </div>
                                    </div>

                                    {/* Inline Images - Horizontal layout for compactness */}
                                    <div className="mt-8 space-y-4 p-5 bg-white/10 backdrop-blur-md border-2 border-dashed border-[var(--primary)]/40 rounded-[16px] shadow-sm relative transition-all hover:border-[var(--primary)]/60 hover:bg-white/20">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[var(--primary)] font-bold flex items-center gap-2.5 text-base">
                                                <div className="bg-orange-100 p-1.5 rounded-lg border border-orange-200">
                                                    <Upload className="h-4 w-4 text-[var(--primary)]" />
                                                </div>
                                                Activity Images
                                                <span className="bg-[#FF9A5C]/20 text-[#D95D22] text-xs px-2.5 py-0.5 rounded-full border border-[#FF9A5C]/30 shadow-sm ml-1">
                                                    {row.images?.length || 0}/5
                                                </span>
                                            </Label>
                                            <div className="flex gap-2.5">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleAddImage(index)}
                                                    className="glass-button h-9 px-4 text-xs font-bold rounded-full text-[#D95D22] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/50 transition-all shadow-sm"
                                                    disabled={(row.images?.length || 0) >= 5}
                                                >
                                                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload File
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleAddImageUrl(index)}
                                                    className="glass-button h-9 px-4 text-xs font-bold rounded-full text-[#D95D22] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/50 transition-all shadow-sm"
                                                    disabled={(row.images?.length || 0) >= 5}
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add URL
                                                </Button>
                                            </div>
                                        </div>

                                        {row.images && row.images.length > 0 && (
                                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                                {row.images.map((img: any, imgIdx: number) => (
                                                    <div key={imgIdx} className={`relative group shrink-0 h-28 w-40 rounded-xl overflow-hidden border-2 flex items-center justify-center bg-white/20 ${imgIdx === 0 ? 'border-[var(--primary)] shadow-sm' : 'border-white/40'}`}>
                                                        {img.image_url === 'loading' ? (
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary)]"></div>
                                                        ) : (
                                                            <>
                                                                <img src={getValidImageUrl(img.image_url)} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />

                                                                {/* Primary Badge */}
                                                                {imgIdx === 0 && (
                                                                    <div className="absolute top-0 left-0 bg-gradient-to-r from-[#FF9A5C] to-[var(--primary)] text-white text-[10px] font-bold px-2 py-1 rounded-br-lg shadow-sm z-10">
                                                                        PRIMARY
                                                                    </div>
                                                                )}

                                                                {/* Hover Controls Overview */}
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 z-20 backdrop-blur-[2px]">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-white border border-white/30 backdrop-blur-md shadow-sm" onClick={() => handleMoveImage(index, imgIdx, 'up')} disabled={imgIdx === 0}>
                                                                        <ArrowLeft className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-600 text-white border border-white/30 backdrop-blur-md shadow-sm" onClick={() => handleRemoveImage(index, imgIdx)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="floating-label-group mt-8 relative">
                                        <Textarea
                                            value={row.description}
                                            onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                                            placeholder=" "
                                            className="glass-input peer min-h-[120px] pb-8 pt-4 resize-y leading-relaxed"
                                        />
                                        <div className="absolute bottom-3 right-4 text-[#E8A585] text-[11px] font-bold uppercase tracking-wider pointer-events-none drop-shadow-sm">
                                            Activity Highlights
                                        </div>
                                        <Label className="floating-label">Description</Label>
                                    </div>
                                </CardContent>
                            </div>
                        ))}

                        {/* Add Row Button / Edit Actions */}
                        <div className="flex flex-col items-center gap-4 pt-2">
                            {editingActivity ? (
                                <div className="flex gap-4 w-full max-w-2xl">
                                    <Button
                                        onClick={handleSaveAll}
                                        disabled={isSavingAll}
                                        className="flex-1 h-14 text-white font-bold rounded-[50px] shadow-lg transition-all duration-300 hover:-translate-y-1 active:scale-95 border border-white/20"
                                        style={{ background: 'linear-gradient(135deg, var(--primary), #FF9A5C)' }}
                                    >
                                        <Save className="mr-2 h-5 w-5" /> {isSavingAll ? 'Updating...' : 'Save Changes'}
                                    </Button>
                                    <Button
                                        onClick={handleCancelEdit}
                                        variant="ghost"
                                        className="px-8 h-14 glass-button text-[#8B5E34] hover:bg-white/40 font-bold border-2 border-dashed border-[#8B5E34]/30"
                                    >
                                        Cancel Edit
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleAddRow}
                                    variant="outline"
                                    className="w-full max-w-2xl glass-button rounded-[50px] border-2 border-dashed border-[var(--primary)]/50 text-[var(--primary)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)] transition-all duration-300 h-14 font-bold text-base flex items-center justify-center gap-3 shadow-sm bg-white/20"
                                >
                                    <div className="bg-[var(--primary)]/20 rounded-full p-1 border border-[var(--primary)]/30 shadow-inner">
                                        <Plus className="h-4 w-4 text-[#D95D22]" />
                                    </div>
                                    Add Another Activity
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .glass-panel {
                    background: rgba(255, 255, 255, 0.25);
                    backdrop-filter: blur(16px) saturate(180%);
                    -webkit-backdrop-filter: blur(16px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.45);
                    border-radius: 20px;
                    box-shadow: 0 8px 32px rgba(180, 100, 60, 0.08);
                }

                .glass-card {
                    background: rgba(255, 255, 255, 0.22);
                    backdrop-filter: blur(16px) saturate(180%);
                    -webkit-backdrop-filter: blur(16px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.45);
                    border-radius: 16px;
                }

                .glass-input {
                    background: rgba(255, 255, 255, 0.22) !important;
                    border: 1px solid rgba(255, 255, 255, 0.4) !important;
                    border-radius: 14px !important;
                    color: #1e293b !important;
                    transition: all 0.3s ease;
                }
                .glass-input:focus {
                    background: rgba(255, 255, 255, 0.4) !important;
                    border-color: rgba(255, 107, 43, 0.5) !important;
                    box-shadow: 0 0 0 3px rgba(255, 107, 43, 0.25) !important;
                }

                .glass-button {
                    background: rgba(255, 255, 255, 0.25) !important;
                    border: 1px solid rgba(255, 255, 255, 0.5) !important;
                    color: var(--primary) !important;
                    backdrop-filter: blur(12px);
                    border-radius: 50px !important;
                    transition: all 0.3s ease;
                }
                .glass-button:hover:not(:disabled) {
                    background: rgba(255, 107, 43, 0.1) !important;
                    border-color: rgba(255, 107, 43, 0.4) !important;
                    color: #D95D22 !important;
                }
                
                /* Custom animated label approach */
                .floating-label-group {
                    position: relative;
                    display: flex;
                    flex-direction: column-reverse;
                }
                .floating-label {
                    transition: all 0.3s ease;
                    transform-origin: left bottom;
                    transform: translateY(0);
                    color: #8B5E34;
                    font-weight: 600;
                    margin-bottom: 8px;
                }
                .glass-input:focus + .floating-label,
                .glass-input:not(:placeholder-shown) + .floating-label {
                    transform: translateY(-2px);
                    color: var(--primary);
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.15);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.25);
                }
                
                /* Select dropdown overrides to prevent black text */
                [data-radix-popper-content-wrapper] .glass-panel * {
                    color: #1e293b;
                }
                [data-radix-popper-content-wrapper] .glass-panel [data-state="checked"] {
                    background: rgba(0,0,0,0.05) !important;
                }
                [data-radix-popper-content-wrapper] .glass-panel [role="option"]:hover, [data-radix-popper-content-wrapper] .glass-panel [data-highlighted] {
                    background: rgba(99, 102, 241, 0.1) !important;
                    cursor: pointer;
                }
            `}</style>
        </div>
    )
}
