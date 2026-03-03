'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { ArrowLeft, Plus, Save, Trash2, Edit, CheckCircle2, GripVertical, Upload, X, Clock, Sun, Sunset, Moon, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { activitiesAPI } from '@/lib/api'
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

                const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const API_URL = `${API_BASE}/api/v1/upload`
                const res = await fetch(API_URL, {
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

                        const imgIdx = targetImages.findIndex(img => img.image_url === 'loading' || (img as any)._tempId === tempId)
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
        const newImages = (row.images || []).filter((_, i) => i !== imgIndex)
        const reordered = newImages.map((img, i) => ({ ...img, display_order: i }))
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
            // Concurrent saves
            await Promise.all(rowsToSave.map(row => activitiesAPI.create(row)))
            toast.success(`Successfully saved ${rowsToSave.length} activities!`)

            // Re-fetch left side
            loadCityActivities()

            // Reset right side
            setActivityRows([createEmptyRow()])
        } catch (error: any) {
            console.error('Failed to save bulk activities:', error)
            toast.error(error?.response?.data?.detail || 'Failed to save some activities')
        } finally {
            setIsSavingAll(false)
        }
    }

    // --- Left Side Actions ---

    const handleDeleteExisting = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this activity?')) return
        try {
            await activitiesAPI.delete(id)
            toast.success('Activity deleted')
            loadCityActivities()
        } catch (error: any) {
            console.error('Failed to delete activity:', error)
            toast.error('Failed to delete activity')
        }
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
            <div className="glass-panel border-b border-white/10 shrink-0 relative z-30">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/agent/activities')}
                                className="h-10 w-10 shrink-0 rounded-full hover:bg-slate-200/50 text-slate-700"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                                    <MapPin className="h-5 w-5 text-indigo-600" />
                                    {cityName}
                                </h1>
                                <p className="text-sm text-slate-500">Manage all activities for this destination</p>
                            </div>
                        </div>

                        <Button
                            onClick={handleSaveAll}
                            disabled={isSavingAll || activityRows.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 shadow-md transition-all active:scale-95 h-10"
                        >
                            {isSavingAll ? 'Saving...' : (
                                <>
                                    <Save className="mr-2 h-4 w-4" /> Save All Activities
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Split Content */}
            <div className="flex flex-1 overflow-hidden h-full">

                {/* Left Panel: Existing Activities */}
                <div className="w-1/3 min-w-[350px] max-w-[450px] flex flex-col h-full overflow-y-auto custom-scrollbar p-6">
                    <div className="glass-panel h-full flex flex-col overflow-hidden">
                        <div className="p-6 shrink-0 sticky top-0 z-10 border-b border-white/40 bg-white/30 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold text-slate-800">Existing Activities</h2>
                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-none">
                                    {existingActivities.length}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-500">Live preview of saved activities</p>
                        </div>

                        <div className="p-6 pt-2 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
                                </div>
                            ) : existingActivities.length === 0 ? (
                                <div className="text-center p-8 border-2 border-dashed border-slate-200/50 rounded-2xl bg-white/20">
                                    <MapPin className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-slate-600 text-sm">No activities yet.</p>
                                    <p className="text-slate-400 text-xs mt-1">Add activities on the right</p>
                                </div>
                            ) : (
                                existingActivities.map((activity) => (
                                    <Card key={activity.id} className="overflow-hidden glass-card group border-white/40 hover:shadow-lg transition-all duration-300">
                                        <div className="h-32 relative">
                                            <ActivityImageGallery
                                                images={activity.images.map(img => img.image_url)}
                                                title={activity.name}
                                                aspectRatio="video"
                                                className="w-full h-full opacity-90"
                                            />
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Button size="icon" variant="destructive" className="h-8 w-8 shadow-sm backdrop-blur-sm bg-red-500/80 hover:bg-red-600 border border-white/20" onClick={() => handleDeleteExisting(activity.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-slate-800 text-base line-clamp-1 flex-1">{activity.name}</h3>
                                                {(activity.price_per_person ?? 0) > 0 && (
                                                    <span className="font-semibold text-slate-700 text-sm ml-2 shrink-0">₹{activity.price_per_person}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-none font-normal">{activity.category}</Badge>
                                                <span className="flex items-center gap-1 text-slate-600 bg-white/50 px-2 py-0.5 rounded-sm">
                                                    <Clock className="h-3 w-3 text-slate-400" /> {activity.duration_hours}h
                                                </span>
                                                <span className="flex items-center gap-1 text-slate-600 bg-white/50 px-2 py-0.5 rounded-sm capitalize">
                                                    {getTimeSlotIcon(activity.time_slot_preference)}
                                                    {activity.time_slot_preference.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Divider Line */}
                <div className="w-px h-full bg-white/15 shrink-0"></div>

                {/* Right Panel: Bulk Creation Form Form */}
                <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 lg:p-10 relative">
                    <div className="max-w-4xl mx-auto space-y-8 pb-20">
                        {activityRows.map((row, index) => (
                            <div key={index} className="glass-panel relative overflow-visible animate-in fade-in slide-in-from-bottom-4 group">

                                {/* Row Number Indicator */}
                                <div className="absolute -left-4 -top-4 bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-white z-10 transition-transform group-hover:scale-110">
                                    {index + 1}
                                </div>

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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-slate-700">Activity Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={row.name}
                                                onChange={(e) => handleRowChange(index, 'name', e.target.value)}
                                                placeholder="e.g., Safari Tour"
                                                className="glass-input placeholder:text-slate-400"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-slate-700">Category <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={row.category}
                                                onValueChange={(val) => handleRowChange(index, 'category', val)}
                                            >
                                                <SelectTrigger className="glass-input data-[placeholder]:text-slate-400">
                                                    <SelectValue placeholder="Select" />
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

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-slate-700">Time Slot <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={row.time_slot_preference}
                                                onValueChange={(val: TimeSlotPreference) => handleRowChange(index, 'time_slot_preference', val)}
                                            >
                                                <SelectTrigger className="glass-input data-[placeholder]:text-slate-400">
                                                    <SelectValue placeholder="Time" />
                                                </SelectTrigger>
                                                <SelectContent className="glass-panel border border-white/60 bg-white/80 backdrop-blur-xl">
                                                    <SelectItem value="morning">Morning</SelectItem>
                                                    <SelectItem value="afternoon">Afternoon</SelectItem>
                                                    <SelectItem value="evening">Evening</SelectItem>
                                                    <SelectItem value="full_day">Full Day</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-slate-700">Duration <span className="text-red-500">*</span></Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    min="0.5"
                                                    value={row.duration_hours}
                                                    onChange={(e) => handleRowChange(index, 'duration_hours', parseFloat(e.target.value))}
                                                    className="glass-input"
                                                />
                                                <span className="text-slate-500 text-sm font-medium">hrs</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-slate-700">Price / Person</Label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</div>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={row.price_per_person || ''}
                                                    onChange={(e) => handleRowChange(index, 'price_per_person', parseFloat(e.target.value) || 0)}
                                                    className="pl-8 glass-input placeholder:text-slate-400"
                                                    placeholder="Optional"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inline Images - Horizontal layout for compactness */}
                                    <div className="mt-8 space-y-3 p-4 glass-card border-2 border-dashed border-slate-300/50 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-semibold text-slate-700 flex items-center gap-2">
                                                <Upload className="h-4 w-4 text-indigo-500" />
                                                Images ({row.images?.length || 0}/5)
                                            </Label>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleAddImage(index)}
                                                    className="glass-button h-8 text-xs font-medium rounded-full px-4 text-slate-700"
                                                    disabled={(row.images?.length || 0) >= 5}
                                                >
                                                    <Upload className="h-3 w-3 mr-1" /> Upload
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleAddImageUrl(index)}
                                                    className="glass-button h-8 text-xs font-medium rounded-full px-4 text-slate-700"
                                                    disabled={(row.images?.length || 0) >= 5}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> URL
                                                </Button>
                                            </div>
                                        </div>

                                        {row.images && row.images.length > 0 && (
                                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                                {row.images.map((img, imgIdx) => (
                                                    <div key={imgIdx} className={`relative group shrink-0 h-24 w-36 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-white/10 ${imgIdx === 0 ? 'border-indigo-400 shadow-sm' : 'border-white/20'}`}>
                                                        {img.image_url === 'loading' ? (
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                                        ) : (
                                                            <>
                                                                <img src={getValidImageUrl(img.image_url)} alt="" className="h-full w-full object-cover" />

                                                                {/* Primary Badge */}
                                                                {imgIdx === 0 && (
                                                                    <div className="absolute top-0 left-0 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-md z-10">
                                                                        PRIMARY
                                                                    </div>
                                                                )}

                                                                {/* Hover Controls Overview */}
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 z-20 backdrop-blur-[2px]">
                                                                    <Button size="icon" variant="secondary" className="h-6 w-6 bg-white/20 hover:bg-white/40 text-white border border-white/30" onClick={() => handleMoveImage(index, imgIdx, 'up')} disabled={imgIdx === 0}>
                                                                        <ArrowLeft className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button size="icon" variant="destructive" className="h-6 w-6 bg-red-500/80 hover:bg-red-600 border border-white/30" onClick={() => handleRemoveImage(index, imgIdx)}>
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Description - Collapsible or simple text area */}
                                    <div className="mt-6 space-y-2">
                                        <Label className="font-semibold text-slate-700">Description</Label>
                                        <Textarea
                                            value={row.description}
                                            onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                                            placeholder="Activity highlights..."
                                            className="h-20 glass-input placeholder:text-slate-400"
                                        />
                                    </div>
                                </CardContent>
                            </div>
                        ))}

                        {/* Add Row Button */}
                        <div className="flex justify-center pt-4">
                            <Button
                                onClick={handleAddRow}
                                variant="outline"
                                className="glass-button rounded-full border-2 border-dashed border-indigo-300 text-indigo-700 hover:border-indigo-500 hover:bg-white/40 px-8 h-12"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Add Another Activity
                            </Button>
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
                    background: rgba(255, 255, 255, 0.4) !important;
                    border: 1px solid rgba(255, 255, 255, 0.6) !important;
                    color: #1e293b !important;
                }
                .glass-input:focus {
                    background: rgba(255, 255, 255, 0.6) !important;
                    border-color: rgba(99, 102, 241, 0.5) !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
                }

                .glass-button {
                    background: rgba(255, 255, 255, 0.3) !important;
                    border: 1px solid rgba(255, 255, 255, 0.5) !important;
                    color: #1e293b !important;
                    backdrop-filter: blur(8px);
                }
                .glass-button:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.5) !important;
                    border-color: rgba(255, 255, 255, 0.8) !important;
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
