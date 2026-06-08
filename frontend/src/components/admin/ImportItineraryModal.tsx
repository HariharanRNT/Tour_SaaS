'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { API_URL } from '@/lib/api'
import {
    Upload,
    FileText,
    CheckCircle2,
    Loader2,
    AlertTriangle,
    X,
    FileSpreadsheet,
    File,
    AlertCircle,
    RefreshCw,
    Info,
    CalendarDays,
    MapPin,
    Banknote,
    AlignLeft,
    ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safe localStorage.setItem that catches QuotaExceededError gracefully.
 * Clears old stale AI keys to free space and retries once before giving up.
 */
function safeLocalStorageSet(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value)
        return true
    } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            console.warn(`[localStorage] Quota exceeded for "${key}". Clearing stale AI data and retrying...`)
            const aiKeys = ['ai_generated_package', 'ai_highlights', 'ai_inclusions', 'ai_exclusions']
            aiKeys.forEach(k => { try { localStorage.removeItem(k) } catch {} })
            try {
                localStorage.setItem(key, value)
                return true
            } catch {
                console.error(`[localStorage] Still quota exceeded for "${key}" after cleanup.`)
            }
        }
        return false
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportedActivity {
    title: string
    description: string
    timeSlot: string
    startTime: string
    endTime: string
}

interface ImportedDay {
    day: number
    title: string
    activities: ImportedActivity[]
}

export interface ImportedItinerary {
    packageTitle: string
    packageMode: 'single' | 'multi'
    destination: string
    country: string
    destinations: { city: string; country: string; days: number }[]
    durationDays: number
    durationNights: number
    pricePerPerson: number
    description: string
    days: ImportedDay[]
}

interface ImportItineraryModalProps {
    open: boolean
    onClose: () => void
    packageId: string | null
    /** Called after successful import so parent can update formData & trigger reload */
    onImportSuccess: (itinerary: ImportedItinerary) => void
    /** Existing activity count so we can show conflict dialog */
    existingActivityCount?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ACCEPTED_TYPES: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-excel': 'XLS',
    'text/plain': 'TXT',
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.xls', '.txt']

type Stage = 'upload' | 'processing' | 'conflict' | 'success'
type SuccessTab = 'basic' | 'itinerary'

interface ProgressStep {
    label: string
    done: boolean
    active: boolean
}

// ─── File icon ────────────────────────────────────────────────────────────────

function FileTypeIcon({ type }: { type: string }) {
    if (type === 'PDF') return <FileText className="w-10 h-10 text-red-500" />
    if (type === 'XLSX' || type === 'XLS') return <FileSpreadsheet className="w-10 h-10 text-green-600" />
    if (type === 'DOCX' || type === 'DOC') return <FileText className="w-10 h-10 text-blue-500" />
    return <File className="w-10 h-10 text-gray-500" />
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ImportItineraryModal({
    open,
    onClose,
    packageId,
    onImportSuccess,
    existingActivityCount = 0,
}: ImportItineraryModalProps) {

    const [stage, setStage] = useState<Stage>('upload')
    const [successTab, setSuccessTab] = useState<SuccessTab>('basic')
    const [dragOver, setDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [fileError, setFileError] = useState<string>('')
    const [fileTypeName, setFileTypeName] = useState<string>('')

    const [steps, setSteps] = useState<ProgressStep[]>([
        { label: 'Uploading file', done: false, active: false },
        { label: 'Extracting & AI processing', done: false, active: false },
        { label: 'Building itinerary', done: false, active: false },
    ])

    const [importedItinerary, setImportedItinerary] = useState<ImportedItinerary | null>(null)
    const [conflictChoice, setConflictChoice] = useState<'replace' | 'append' | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const abortRef = useRef(false)

    useEffect(() => {
        if (open) {
            abortRef.current = false
            setStage('upload')
            setSuccessTab('basic')
            setSelectedFile(null)
            setFileError('')
            setFileTypeName('')
            setImportedItinerary(null)
            setConflictChoice(null)
            setSteps(s => s.map(step => ({ ...step, done: false, active: false })))
        }
    }, [open])

    const handleClose = () => {
        abortRef.current = true
        onClose()
    }

    // ─── Progress helpers ──────────────────────────────────────────────────────

    const setStepActive = (index: number) => {
        setSteps(prev => prev.map((s, i) => ({
            ...s,
            active: i === index,
            done: i < index,
        })))
    }

    const setStepDone = (index: number) => {
        setSteps(prev => prev.map((s, i) => ({
            ...s,
            active: i === index + 1 && i < prev.length,
            done: i <= index,
        })))
    }

    const setAllDone = () => {
        setSteps(prev => prev.map(s => ({ ...s, done: true, active: false })))
    }

    // ─── File validation ───────────────────────────────────────────────────────

    const validateFile = (file: File): string => {
        if (file.size > MAX_FILE_SIZE) {
            return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is 10 MB.`
        }
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        // .doc (legacy binary Word) is not supported by the parser — guide user to re-save
        if (ext === '.doc') {
            return 'Legacy .doc files are not supported. Please open the file in Microsoft Word or LibreOffice and save it as .docx, then upload again.'
        }
        const mimeOk = ACCEPTED_TYPES[file.type]
        const extOk = ACCEPTED_EXTENSIONS.includes(ext)
        if (!mimeOk && !extOk) {
            return `Unsupported file type. Please upload PDF, DOCX, XLSX, XLS, or TXT.`
        }
        return ''
    }

    const getFileTypeName = (file: File): string => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        if (ext === '.pdf') return 'PDF'
        if (ext === '.docx') return 'DOCX'
        if (ext === '.xlsx') return 'XLSX'
        if (ext === '.xls') return 'XLS'
        if (ext === '.txt') return 'TXT'
        return ACCEPTED_TYPES[file.type] || 'FILE'
    }

    // ─── Drop zone ─────────────────────────────────────────────────────────────

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (!file) return
        const err = validateFile(file)
        if (err) { setFileError(err); return }
        setFileError('')
        setSelectedFile(file)
        setFileTypeName(getFileTypeName(file))
    }, [])

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const err = validateFile(file)
        if (err) { setFileError(err); return }
        setFileError('')
        setSelectedFile(file)
        setFileTypeName(getFileTypeName(file))
    }

    // ─── Main import flow ──────────────────────────────────────────────────────

    const handleImport = async () => {
        if (!selectedFile) return

        abortRef.current = false
        setStage('processing')

        try {
            // Step 0: Uploading file
            setStepActive(0)

            const formData = new FormData()
            formData.append('file', selectedFile)

            const token = localStorage.getItem('token')

            // Step 1 active while server extracts + runs AI
            setStepDone(0)
            setStepActive(1)

            const response = await fetch(`${API_URL}/api/v1/ai-assistant/import-itinerary`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // NOTE: Do NOT set Content-Type here — browser sets it automatically
                    // with the correct multipart boundary for FormData uploads.
                },
                body: formData,
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: 'AI processing failed' }))
                throw new Error(err.detail || 'AI processing failed')
            }

            const data = await response.json()
            if (!data.success || !data.itinerary) {
                throw new Error('Invalid response from AI service')
            }
            if (abortRef.current) return
            setStepDone(1)

            // Step 2: Building itinerary structure
            setStepActive(2)
            await new Promise(r => setTimeout(r, 500))
            if (abortRef.current) return
            setAllDone()

            setImportedItinerary(data.itinerary)

            if (existingActivityCount > 0) {
                setStage('conflict')
            } else {
                await finalizeImport(data.itinerary, 'replace')
            }

        } catch (err: any) {
            if (abortRef.current) return
            toast.error(err.message || 'Import failed. Please try again.')
            setStage('upload')
        }
    }


    // ─── Finalize ──────────────────────────────────────────────────────────────

    const finalizeImport = async (itinerary: ImportedItinerary, mode: 'replace' | 'append') => {
        const aiItineraryData = itinerary.days.map((day: ImportedDay) => ({
            day: day.day,
            title: day.title,
            activities: day.activities.map((act: ImportedActivity, idx: number) => ({
                title: act.title,
                description: act.description,
                timeSlot: act.timeSlot?.toLowerCase() || 'full_day',
                startTime: act.startTime || '',
                endTime: act.endTime || '',
                display_order: idx,
                imageUrls: [],
            })),
        }))

        if (packageId) {
            localStorage.removeItem(`ai_activities_saved_${packageId}`)
        }

        safeLocalStorageSet('ai_itinerary_data', JSON.stringify(aiItineraryData))
        safeLocalStorageSet('import_mode', mode)

        setStage('success')
        setSuccessTab('basic')
        onImportSuccess(itinerary)
    }

    const handleConflictChoice = async (choice: 'replace' | 'append' | 'cancel') => {
        if (choice === 'cancel') { handleClose(); return }
        if (!importedItinerary) return
        setConflictChoice(choice)
        await finalizeImport(importedItinerary, choice)
    }

    const handleRemoveFile = () => {
        setSelectedFile(null)
        setFileError('')
        setFileTypeName('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
            <DialogContent
                className="max-w-lg w-full p-0 overflow-hidden border-0 shadow-2xl"
                style={{
                    background: 'rgba(255,255,255,0.97)',
                    backdropFilter: 'blur(24px)',
                    borderRadius: '24px',
                }}
            >
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-0">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, var(--button-bg) 0%, var(--button-bg-light) 100%)' }}
                        >
                            <Upload className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-gray-900">
                                Import Itinerary via AI
                            </DialogTitle>
                            <DialogDescription className="text-xs text-gray-500 mt-0.5">
                                Upload PDF, Excel, Word, or Text files
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-6 py-5 space-y-4">

                    {/* ── Stage: Upload ── */}
                    {stage === 'upload' && (
                        <div className="space-y-4">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={onDrop}
                                onClick={() => !selectedFile && fileInputRef.current?.click()}
                                className={cn(
                                    'relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer',
                                    dragOver
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 scale-[1.01]'
                                        : selectedFile
                                            ? 'border-emerald-400 bg-emerald-50/40'
                                            : 'border-gray-200 hover:border-[var(--primary)]/50 hover:bg-gray-50/50',
                                )}
                                style={{ minHeight: '160px' }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={ACCEPTED_EXTENSIONS.join(',')}
                                    className="hidden"
                                    onChange={onFileChange}
                                />

                                {!selectedFile && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-sm">
                                            <Upload className="w-7 h-7 text-gray-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-gray-700">Drag & drop your file here</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                or <span className="text-[var(--primary)] font-semibold underline">click to browse</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
                                            {['PDF', 'DOCX', 'XLSX', 'TXT'].map(f => (
                                                <span key={f} className="px-2 py-0.5 text-[10px] font-bold rounded-full border border-gray-200 bg-white text-gray-500 uppercase tracking-wide">{f}</span>
                                            ))}
                                            <span className="text-[10px] text-gray-400">• Max 10 MB</span>
                                        </div>
                                    </div>
                                )}

                                {selectedFile && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                                        <FileTypeIcon type={fileTypeName} />
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-gray-800 max-w-xs truncate">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{fileTypeName} · {(selectedFile.size / 1024).toFixed(0)} KB</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFile() }}
                                            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" /> Remove file
                                        </button>
                                    </div>
                                )}
                            </div>

                            {fileError && (
                                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-red-600 font-medium">{fileError}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-1">
                                <Button variant="outline" className="flex-1 h-11 rounded-xl border-gray-200 text-gray-600" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 h-11 rounded-xl font-bold text-white shadow-sm"
                                    style={{ background: 'linear-gradient(135deg, var(--button-bg) 0%, var(--button-bg-light) 100%)' }}
                                    disabled={!selectedFile || !!fileError}
                                    onClick={handleImport}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import &amp; Generate
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── Stage: Processing ── */}
                    {stage === 'processing' && (
                        <div className="space-y-5 py-2">
                            <div className="text-center mb-2">
                                <p className="text-sm font-semibold text-gray-700">Processing your itinerary...</p>
                                <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
                            </div>
                            <div className="space-y-3">
                                {steps.map((step, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className={cn(
                                            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500',
                                            step.done ? 'bg-emerald-500 shadow-sm' : step.active ? 'bg-[var(--primary)] shadow-md' : 'bg-gray-100',
                                        )}>
                                            {step.done ? (
                                                <CheckCircle2 className="w-4 h-4 text-white" />
                                            ) : step.active ? (
                                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            ) : (
                                                <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                                            )}
                                        </div>
                                        <span className={cn(
                                            'text-sm font-medium transition-colors duration-300',
                                            step.done ? 'text-emerald-600' : step.active ? 'text-gray-900' : 'text-gray-400',
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" className="w-full h-10 text-sm text-gray-400 hover:text-gray-600" onClick={handleClose}>
                                Cancel
                            </Button>
                        </div>
                    )}

                    {/* ── Stage: Conflict ── */}
                    {stage === 'conflict' && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-amber-800">Existing itinerary detected</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        This package already has {existingActivityCount} activit{existingActivityCount === 1 ? 'y' : 'ies'}. How would you like to handle the import?
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <button
                                    onClick={() => handleConflictChoice('replace')}
                                    className="w-full flex items-start gap-3 p-4 border-2 border-red-200 hover:border-red-400 bg-red-50/30 hover:bg-red-50 rounded-xl text-left transition-all duration-150 group"
                                >
                                    <RefreshCw className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 group-hover:rotate-180 transition-transform duration-300" />
                                    <div>
                                        <p className="text-sm font-bold text-red-700">Replace All</p>
                                        <p className="text-xs text-red-500 mt-0.5">Remove existing itinerary and replace with imported content</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleConflictChoice('append')}
                                    className="w-full flex items-start gap-3 p-4 border-2 border-[var(--primary)]/30 hover:border-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 rounded-xl text-left transition-all duration-150"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Append Days</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Keep existing days and add imported days after them</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleConflictChoice('cancel')}
                                    className="w-full flex items-center justify-center h-10 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                                >
                                    Cancel import
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Stage: Success ── */}
                    {stage === 'success' && importedItinerary && (
                        <div className="space-y-4">
                            {/* Success header */}
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-emerald-800">Import Successful!</p>
                                    <p className="text-xs text-emerald-600 mt-0.5">
                                        {importedItinerary.durationDays} day{importedItinerary.durationDays !== 1 ? 's' : ''} ·{' '}
                                        {importedItinerary.days.reduce((sum, d) => sum + (d.activities?.length || 0), 0)} activities
                                        {conflictChoice === 'replace' ? ' (replaced)' : conflictChoice === 'append' ? ' (appended)' : ' (imported)'}
                                    </p>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex rounded-xl border border-gray-200 p-1 gap-1 bg-gray-50">
                                <button
                                    onClick={() => setSuccessTab('basic')}
                                    className={cn(
                                        'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold transition-all duration-200',
                                        successTab === 'basic'
                                            ? 'bg-white shadow-sm text-gray-900'
                                            : 'text-gray-400 hover:text-gray-600',
                                    )}
                                >
                                    <Info className="w-3.5 h-3.5" />
                                    Basic Info
                                </button>
                                <button
                                    onClick={() => setSuccessTab('itinerary')}
                                    className={cn(
                                        'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold transition-all duration-200',
                                        successTab === 'itinerary'
                                            ? 'bg-white shadow-sm text-gray-900'
                                            : 'text-gray-400 hover:text-gray-600',
                                    )}
                                >
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    Itinerary Preview
                                </button>
                            </div>

                            {/* ── Tab: Basic Info ── */}
                            {successTab === 'basic' && (
                                <div className="space-y-2.5">

                                    {/* Package Title */}
                                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlignLeft className="w-3.5 h-3.5 text-[var(--primary)]" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Package Title</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {importedItinerary.packageTitle || <span className="text-gray-400 italic">Not detected</span>}
                                        </p>
                                    </div>

                                    {/* Destination */}
                                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <MapPin className="w-3.5 h-3.5 text-[var(--primary)]" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                {importedItinerary.packageMode === 'multi' ? 'Destinations' : 'Destination'}
                                            </span>
                                            {importedItinerary.packageMode === 'multi' && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">Multi-City</span>
                                            )}
                                        </div>
                                        {importedItinerary.packageMode === 'multi' && importedItinerary.destinations.length > 0 ? (
                                            <div className="space-y-1 mt-1">
                                                {importedItinerary.destinations.map((d, i) => (
                                                    <div key={i} className="flex items-center justify-between text-xs">
                                                        <span className="font-semibold text-gray-800">{d.city}{d.country ? `, ${d.country}` : ''}</span>
                                                        <span className="text-gray-400 text-[10px]">{d.days} day{d.days !== 1 ? 's' : ''}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm font-semibold text-gray-800">
                                                {[importedItinerary.destination, importedItinerary.country].filter(Boolean).join(', ')
                                                    || <span className="text-gray-400 italic">Not detected</span>}
                                            </p>
                                        )}
                                    </div>

                                    {/* Duration */}
                                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CalendarDays className="w-3.5 h-3.5 text-[var(--primary)]" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duration</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {importedItinerary.durationDays} Days / {importedItinerary.durationNights} Nights
                                        </p>
                                    </div>

                                    {/* Price */}
                                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Banknote className="w-3.5 h-3.5 text-[var(--primary)]" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price Per Person</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {importedItinerary.pricePerPerson > 0
                                                ? `₹${importedItinerary.pricePerPerson.toLocaleString('en-IN')}`
                                                : <span className="text-gray-400 italic">Not detected</span>}
                                        </p>
                                    </div>

                                    {/* Description */}
                                    {importedItinerary.description && (
                                        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</span>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                                                {importedItinerary.description}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-amber-700">
                                            <span className="font-bold">Review before saving.</span>{' '}
                                            These fields will auto-fill in Step 1. You can edit them anytime.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Tab: Itinerary Preview ── */}
                            {successTab === 'itinerary' && (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                    {importedItinerary.days.map((day) => (
                                        <div key={day.day} className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span
                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                                                    style={{ background: 'var(--button-bg)' }}
                                                >
                                                    {day.day}
                                                </span>
                                                <p className="text-xs font-bold text-gray-800 truncate">{day.title}</p>
                                            </div>
                                            <div className="space-y-1 pl-8">
                                                {day.activities.slice(0, 3).map((act, i) => (
                                                    <div key={i} className="flex items-start gap-1.5">
                                                        <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0 mt-0.5" />
                                                        <p className="text-[11px] text-gray-600 line-clamp-1">{act.title}</p>
                                                    </div>
                                                ))}
                                                {day.activities.length > 3 && (
                                                    <p className="text-[10px] text-gray-400 pl-4">+{day.activities.length - 3} more activities</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action button */}
                            <Button
                                className="w-full h-11 rounded-xl font-bold text-white shadow-sm"
                                style={{ background: 'linear-gradient(135deg, var(--button-bg) 0%, var(--button-bg-light) 100%)' }}
                                onClick={handleClose}
                            >
                                View &amp; Edit Package
                            </Button>
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    )
}
