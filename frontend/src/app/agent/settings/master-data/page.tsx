'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { API_URL } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import {
    ArrowLeft,
    Plus,
    Tag,
    Layers,
    Trash2,
    Edit2,
    Globe,
    AlertCircle,
    Check
} from 'lucide-react'

export default function MasterDataSettingsPage() {
    const router = useRouter()
    const { hasPermission, isSubUser } = useAuth()

    useEffect(() => {
        if (isSubUser && !hasPermission('settings', 'view')) {
            router.push('/agent/dashboard')
        }
    }, [isSubUser, hasPermission, router])

    const [tags, setTags] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [styles, setStyles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalType, setModalType] = useState<'tag' | 'category' | 'style'>('tag')
    const [editingItem, setEditingItem] = useState<any>(null)
    const [formData, setFormData] = useState({ name: '', icon: '', category_id: '' })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const [tagsRes, categoriesRes, stylesRes] = await Promise.all([
                fetch(`${API_URL}/api/v1/agent/activity-tags`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/v1/agent/activity-categories`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/v1/agent/trip-styles`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            if (tagsRes.ok) setTags(await tagsRes.json())
            if (categoriesRes.ok) setCategories(await categoriesRes.json())
            if (stylesRes.ok) setStyles(await stylesRes.json())
        } catch (error) {
            console.error('Failed to fetch master data', error)
            toast.error('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }

    const openModal = (type: 'tag' | 'category' | 'style', item: any = null) => {
        setModalType(type)
        setEditingItem(item)
        if (item) {
            setFormData({ 
                name: item.name, 
                icon: item.icon || '', 
                category_id: item.category_id || '' 
            })
        } else {
            setFormData({ name: '', icon: '', category_id: '' })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error('Name is required')
            return
        }

        setSubmitting(true)
        try {
            const token = localStorage.getItem('token')
            let endpoint = 'activity-tags'
            if (modalType === 'category') endpoint = 'activity-categories'
            if (modalType === 'style') endpoint = 'trip-styles'

            const url = editingItem
                ? `${API_URL}/api/v1/agent/${endpoint}/${editingItem.id}`
                : `${API_URL}/api/v1/agent/${endpoint}`
            const method = editingItem ? 'PUT' : 'POST'

            const body: any = {
                name: formData.name.trim(),
                icon: formData.icon.trim() || (modalType === 'category' ? '' : '✨')
            }
            if (modalType === 'tag' && formData.category_id) {
                body.category_id = formData.category_id
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Failed to save')
            }

            toast.success(editingItem ? 'Updated successfully' : 'Created successfully')
            setIsModalOpen(false)
            fetchData()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string, type: 'tag' | 'category' | 'style') => {
        if (!confirm('Are you sure you want to delete this item?')) return

        try {
            const token = localStorage.getItem('token')
            let endpoint = 'activity-tags'
            if (type === 'category') endpoint = 'activity-categories'
            if (type === 'style') endpoint = 'trip-styles'

            const res = await fetch(`${API_URL}/api/v1/agent/${endpoint}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Failed to delete')
            }

            toast.success('Deleted successfully')
            fetchData()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const renderGrid = (items: any[], type: 'tag' | 'category' | 'style') => {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                {items.map((item) => {
                    const isGlobal = !item.agent_id
                    return (
                        <div
                            key={item.id}
                            className="glass-card relative p-5 flex flex-col items-center justify-center gap-3 group overflow-hidden border border-white/40 transition-all hover:-translate-y-1 hover:shadow-lg rounded-2xl"
                            style={{
                                background: isGlobal ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            {isGlobal && (
                                <div className="absolute top-2 right-2 text-[8px] font-bold tracking-widest text-slate-500 uppercase bg-slate-200/50 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                                    <Globe className="w-2.5 h-2.5" /> Global
                                </div>
                            )}
                            
                            {!isGlobal && (
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openModal(type, item)}
                                        className="p-1.5 bg-white/50 hover:bg-white rounded-md text-slate-600 transition-colors shadow-sm"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(item.id, type)}
                                        className="p-1.5 bg-red-50 hover:bg-red-100 rounded-md text-red-600 transition-colors shadow-sm"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {type !== 'category' && (
                                <span className="text-3xl drop-shadow-sm transition-transform group-hover:scale-110">
                                    {item.icon}
                                </span>
                            )}
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-bold text-slate-800 text-center leading-tight">
                                    {item.name}
                                </span>
                                {type === 'tag' && item.category_id && (
                                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {categories.find(c => c.id === item.category_id)?.name || 'Unknown Cat'}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Add New Card */}
                <div
                    onClick={() => openModal(type)}
                    className="relative cursor-pointer p-5 flex flex-col items-center justify-center gap-3 group rounded-2xl transition-all hover:bg-white/10"
                    style={{
                        border: '2px dashed rgba(0,0,0,0.15)',
                        background: 'rgba(255,255,255,0.05)',
                    }}
                >
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-black transition-colors shadow-sm">
                        <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors text-center">
                        Add Custom {type === 'tag' ? 'Tag' : type === 'category' ? 'Category' : 'Trip Style'}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
                
                {/* Header */}
                <div className="space-y-6">
                    <nav className="flex items-center text-sm font-medium text-slate-500">
                        <button
                            onClick={() => router.push('/agent/settings')}
                            className="hover:text-[var(--primary)] transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Settings
                        </button>
                    </nav>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Master Data</h1>
                            <p className="text-lg text-slate-600 max-w-2xl font-medium">
                                Manage your custom Trip Styles, Activity Tags and Categories for your packages.
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
                    </div>
                ) : (
                    <Tabs defaultValue="tags" className="w-full space-y-8">
                        <div className="flex justify-center sm:justify-start">
                            <TabsList className="bg-white/40 backdrop-blur-md border border-white/50 p-1 h-auto rounded-full shadow-sm">
                                <TabsTrigger value="tags" className="rounded-full px-6 py-2.5 font-bold data-[state=active]:bg-[var(--primary)] data-[state=active]:text-black data-[state=active]:shadow-md transition-all text-slate-600">
                                    <Tag className="w-4 h-4 mr-2" />
                                    Activity Tags
                                </TabsTrigger>

                                <TabsTrigger value="styles" className="rounded-full px-6 py-2.5 font-bold data-[state=active]:bg-[var(--primary)] data-[state=active]:text-black data-[state=active]:shadow-md transition-all text-slate-600">
                                    <Globe className="w-4 h-4 mr-2" />
                                    Trip Styles
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="tags" className="outline-none mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="glass-card border-0 shadow-xl overflow-hidden bg-white/40 backdrop-blur-3xl">
                                <CardHeader className="border-b border-white/20 bg-white/20 pb-4">
                                    <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                                        <Tag className="w-5 h-5 text-[var(--primary)]" />
                                        Activity Tags
                                    </CardTitle>
                                    <CardDescription className="text-slate-600 font-medium">
                                        Tags help customers filter and search for specific activities (e.g., Beach, Mountain, Trekking).
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {renderGrid(tags, 'tag')}
                                </CardContent>
                            </Card>
                        </TabsContent>



                        <TabsContent value="styles" className="outline-none mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="glass-card border-0 shadow-xl overflow-hidden bg-white/40 backdrop-blur-3xl">
                                <CardHeader className="border-b border-white/20 bg-white/20 pb-4">
                                    <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                                        <Globe className="w-5 h-5 text-[var(--primary)]" />
                                        Trip Styles
                                    </CardTitle>
                                    <CardDescription className="text-slate-600 font-medium">
                                        Define the target audience and vibe for your packages (e.g., Honeymoon, Adventure, Luxury).
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {renderGrid(styles, 'style')}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 border border-slate-100">
                            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 text-center justify-center">
                                {editingItem ? 'Edit' : 'Add Custom'} {modalType === 'tag' ? 'Activity Tag' : modalType === 'category' ? 'Activity Category' : 'Trip Style'}
                            </h3>
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={`e.g. ${modalType === 'tag' ? 'Surfing' : modalType === 'category' ? 'Water Sports' : 'Family Trip'}`}
                                        className="h-11 font-medium bg-slate-50/50"
                                        maxLength={50}
                                    />
                                </div>
                                
                                {modalType !== 'category' && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Icon / Emoji</Label>
                                        <Input
                                            value={formData.icon}
                                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                            placeholder="e.g. 🏄‍♂️"
                                            className="h-11 font-medium bg-slate-50/50"
                                            maxLength={5}
                                        />
                                    </div>
                                )}

                                {modalType === 'tag' && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Category</Label>
                                        <select
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                            className="w-full h-11 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                        >
                                            <option value="">No Category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsModalOpen(false)}
                                        disabled={submitting}
                                        className="flex-1 font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold rounded-xl shadow-md shadow-[var(--primary)]/20 transition-all active:scale-95"
                                    >
                                        {submitting ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
