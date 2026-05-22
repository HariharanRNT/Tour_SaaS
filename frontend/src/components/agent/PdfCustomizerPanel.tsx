'use client'

/**
 * PdfCustomizerPanel.tsx
 * ----------------------
 * Self-contained PDF Customizer settings panel.
 * All 6 sections live here; no state is shared with other settings tabs.
 *
 * Security: every free-text onChange runs through sanitizeText / sanitizeColor /
 * sanitizeLogoUrl before touching React state, and deepSanitizeSettings is called
 * once more before the API call.
 */

import React, { useState, useCallback, useRef } from 'react'
import {
    Save, Eye, ChevronUp, ChevronDown, Plus, Trash2,
    Upload, Palette, Type, Layout, Clock, FileText,
    Shield, AlignLeft, Loader2, Image as ImageIcon, Info
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { sanitizeText, sanitizeColor, sanitizeLogoUrl, deepSanitizeSettings } from '@/lib/sanitize'
import { savePdfCustomizerSettings, previewPdfCustomizer, uploadFileToS3, API_URL } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimeSlot {
    enabled: boolean
    label: string
}

interface TimeSlots {
    morning: TimeSlot
    afternoon: TimeSlot
    evening: TimeSlot
    night: TimeSlot
    full_day: TimeSlot
    half_day: TimeSlot
}

interface CancellationTier {
    days: string
    charge: string
}

interface PdfSection {
    id: string
    label: string
    visible: boolean
}

interface ContentVisibility {
    show_inclusions: boolean
    show_exclusions: boolean
    show_cancellation: boolean
    show_activity_images: boolean
}

export interface ExtraSection {
    id: string
    heading: string
    content: string
    show: boolean
}

export interface PdfCustomizerSettings {
    logo_position: 'top_left' | 'top_center' | 'top_right'
    logo_url: string
    primary_color: string
    accent_color: string
    font_style: 'default' | 'modern' | 'classic' | 'minimal'
    show_footer: boolean
    time_slots: TimeSlots
    content_visibility: ContentVisibility
    sections: PdfSection[]
    terms: { show: boolean; use_global: boolean; custom_text: string }
    itinerary_layout: 'vertical' | 'horizontal'
    local_transport?: string
    state_permit?: string
    regional_language?: string
    domestic_flight_train?: string
    gst_breakdown?: string
    visa_notes?: string
    passport_notes?: string
    currency_exchange?: string
    intl_flight?: string
    timezone_notes?: string
    embassy_contact?: string
    forex_guidelines?: string
    extra_sections?: ExtraSection[]
}

// ---------------------------------------------------------------------------
// Default states — shown to first-time users
// ---------------------------------------------------------------------------

export const DEFAULT_DOMESTIC_SETTINGS: PdfCustomizerSettings = {
    logo_position: 'top_left',
    logo_url: '',
    primary_color: '#1a5276',
    accent_color: '#f39c12',
    font_style: 'modern',
    show_footer: true,
    itinerary_layout: 'vertical',
    time_slots: {
        morning: { enabled: true, label: 'Morning' },
        afternoon: { enabled: true, label: 'Afternoon' },
        evening: { enabled: true, label: 'Evening' },
        night: { enabled: true, label: 'Night' },
        full_day: { enabled: true, label: 'Full Day' },
        half_day: { enabled: false, label: 'Half Day' },
    },
    content_visibility: {
        show_inclusions: true,
        show_exclusions: true,
        show_cancellation: true,
        show_activity_images: true,
    },
    sections: [
        { id: 'header', label: 'Header / Cover Block', visible: true },
        { id: 'itinerary', label: 'Itinerary (Day-wise)', visible: true },
        { id: 'inclusions', label: 'Inclusions', visible: true },
        { id: 'exclusions', label: 'Exclusions', visible: true },
        { id: 'pricing', label: 'Pricing Table', visible: true },
        { id: 'cancellation', label: 'Cancellation Policy', visible: true },
        { id: 'terms', label: 'Terms & Conditions', visible: true },
        { id: 'footer', label: 'Footer (Contact Info)', visible: true },
    ],
    terms: { show: true, use_global: true, custom_text: '' },
    extra_sections: [
        { id: 'dom-1', heading: 'Local Transport',       content: 'Standard AC Sedan/SUV for sightseeing and transfers as per itinerary.', show: true },
        { id: 'dom-2', heading: 'Flight & Train Details',content: 'Domestic flight/train tickets are not included unless specified.', show: true },
        { id: 'dom-3', heading: 'GST Breakdown',         content: 'GST applicable at 18% total (9% CGST + 9% SGST).', show: true },
        { id: 'dom-4', heading: 'State Permit Notes',    content: 'Certain regions require inner line permits. Details shared on booking.', show: false },
        { id: 'dom-5', heading: 'Regional Notes',        content: 'Local customs and dress codes apply at religious and heritage sites.', show: false },
    ]
}

export const DEFAULT_INTERNATIONAL_SETTINGS: PdfCustomizerSettings = {
    logo_position: 'top_left',
    logo_url: '',
    primary_color: '#2a6286',
    accent_color: '#e67e22',
    font_style: 'modern',
    show_footer: true,
    itinerary_layout: 'vertical',
    time_slots: {
        morning: { enabled: true, label: 'Morning' },
        afternoon: { enabled: true, label: 'Afternoon' },
        evening: { enabled: true, label: 'Evening' },
        night: { enabled: true, label: 'Night' },
        full_day: { enabled: true, label: 'Full Day' },
        half_day: { enabled: false, label: 'Half Day' },
    },
    content_visibility: {
        show_inclusions: true,
        show_exclusions: true,
        show_cancellation: true,
        show_activity_images: true,
    },
    sections: [
        { id: 'header', label: 'Header / Cover Block', visible: true },
        { id: 'itinerary', label: 'Itinerary (Day-wise)', visible: true },
        { id: 'inclusions', label: 'Inclusions', visible: true },
        { id: 'exclusions', label: 'Exclusions', visible: true },
        { id: 'pricing', label: 'Pricing Table', visible: true },
        { id: 'cancellation', label: 'Cancellation Policy', visible: true },
        { id: 'terms', label: 'Terms & Conditions', visible: true },
        { id: 'footer', label: 'Footer (Contact Info)', visible: true },
    ],
    terms: { show: true, use_global: true, custom_text: '' },
    extra_sections: [
        { id: 'intl-1', heading: 'Visa Requirements',         content: 'Visa on arrival or pre-travel visa processing is required as per destination country guidelines.', show: true },
        { id: 'intl-2', heading: 'Passport Validity',         content: 'Passport must be valid for at least 6 months from the date of travel.', show: true },
        { id: 'intl-3', heading: 'Currency Exchange',         content: 'We recommend carrying international credit cards and local currency cash.', show: true },
        { id: 'intl-4', heading: 'International Flight Info', content: 'International flights are not included unless explicitly mentioned in inclusions.', show: true },
        { id: 'intl-5', heading: 'Forex Guidelines',          content: 'Please carry a loaded multi-currency Forex card for convenient payments.', show: false },
        { id: 'intl-6', heading: 'Travel Insurance',          content: 'We strongly recommend purchasing comprehensive travel insurance.', show: false },
        { id: 'intl-7', heading: 'Embassy Contacts',          content: 'Indian Embassy contact details will be shared upon booking confirmation.', show: false },
    ]
}

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

/** iOS-style toggle switch */
function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) {
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2',
                checked ? 'bg-[var(--primary)]' : 'bg-slate-200'
            )}
        >
            <span
                className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out',
                    checked ? 'translate-x-5' : 'translate-x-0'
                )}
            />
        </button>
    )
}

/** Section card header — icon + title + description */
function SectionHeader({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType
    title: string
    description: string
}) {
    return (
        <CardHeader className="pb-5 pt-7 px-7">
            <div className="flex items-center gap-5">
                <div className="p-3 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-2xl text-[var(--primary)] border border-white/40 shadow-sm shrink-0">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-xl font-extrabold text-[var(--color-primary-font)] tracking-tight">
                        {title}
                    </CardTitle>
                    <CardDescription className="text-sm font-semibold text-[var(--color-primary-font)]/70">
                        {description}
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
    )
}

function ExtraSectionsEditor({
  sections,
  onChange,
}: {
  sections: ExtraSection[]
  onChange: (updated: ExtraSection[]) => void
}) {
  const addSection = () => {
    onChange([...sections, {
      id: uuidv4(),
      heading: '',
      content: '',
      show: true,
    }])
  }

  const removeSection = (id: string) => {
    onChange(sections.filter(s => s.id !== id))
  }

  const updateSection = (id: string, field: 'heading' | 'content' | 'show', value: any) => {
    onChange(sections.map(s =>
      s.id === id
        ? { ...s, [field]: field === 'heading' || field === 'content'
            ? sanitizeText(value)
            : value }
        : s
    ))
  }

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={section.id} className="rounded-xl border border-white/20 bg-white/10 p-4 space-y-3">

          {/* Row 1 — Heading input + show toggle + remove */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-[var(--color-primary-font)]/30 w-5">
              #{idx + 1}
            </span>
            <Input
              className="glass-input h-9 text-sm font-bold flex-1 text-[var(--color-primary-font)]"
              value={section.heading}
              placeholder="Section heading e.g. Visa Requirements"
              maxLength={80}
              onChange={e => updateSection(section.id, 'heading', e.target.value)}
            />
            <span className={cn(
              'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0',
              section.show ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            )}>
              {section.show ? 'Show' : 'Hide'}
            </span>
            <Toggle
              checked={section.show}
              onChange={v => updateSection(section.id, 'show', v)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
              onClick={() => removeSection(section.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Row 2 — Content textarea */}
          <textarea
            className="glass-input w-full rounded-lg p-3 text-sm font-medium min-h-[72px] resize-y text-[var(--color-primary-font)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            value={section.content}
            placeholder="Section content text…"
            maxLength={500}
            onChange={e => updateSection(section.id, 'content', e.target.value)}
          />
          <p className="text-xs text-[var(--color-primary-font)]/40 text-right">
            {section.content.length} / 500
          </p>
        </div>
      ))}

      {/* Add Section button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 font-semibold border-dashed border-white/40 bg-white/10 hover:bg-white/20 text-[var(--color-primary-font)]"
        onClick={addSection}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Section
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

interface Props {
    /** Pass settingsData?.homepage_settings?.pdf_customizer from the parent query */
    savedSettings?: {
        domestic?: Partial<PdfCustomizerSettings>
        international?: Partial<PdfCustomizerSettings>
    } | Partial<PdfCustomizerSettings> | null
}

interface PdfCustomizerGroup {
    domestic: PdfCustomizerSettings
    international: PdfCustomizerSettings
}

export default function PdfCustomizerPanel({ savedSettings }: Props) {
    const [activeTab, setActiveTab] = useState<'domestic' | 'international'>('domestic')

    // Setup state for both domestic and international settings
    const [settingsGroup, setSettingsGroup] = useState<PdfCustomizerGroup>(() => {
        const migrateExtraSections = (saved: any, isDomestic: boolean): ExtraSection[] => {
            if (saved && Array.isArray(saved.extra_sections)) {
                return saved.extra_sections
            }

            const oldExtra = (saved && typeof saved.extra_sections === 'object' && saved.extra_sections !== null) ? saved.extra_sections : {}

            if (isDomestic) {
                const localTrans = saved?.local_transport ?? 'Standard AC Sedan/SUV for sightseeing and transfers as per itinerary.'
                const domFlight = saved?.domestic_flight_train ?? 'Domestic flight/train tickets are not included unless specified.'
                const gstBd = saved?.gst_breakdown ?? 'GST applicable at 18% total (9% CGST + 9% SGST).'
                const statePerm = saved?.state_permit ?? 'Certain regions require inner line permits. Details shared on booking.'
                const regionalNotes = saved?.regional_language ?? 'Local customs and dress codes apply at religious and heritage sites.'

                return [
                    { id: 'dom-1', heading: 'Local Transport', content: localTrans, show: oldExtra.show_local_transport ?? true },
                    { id: 'dom-2', heading: 'Flight & Train Details', content: domFlight, show: oldExtra.show_domestic_travel_details ?? true },
                    { id: 'dom-3', heading: 'GST Breakdown', content: gstBd, show: oldExtra.show_gst_breakdown ?? true },
                    { id: 'dom-4', heading: 'State Permit Notes', content: statePerm, show: oldExtra.show_state_permits ?? false },
                    { id: 'dom-5', heading: 'Regional Notes', content: regionalNotes, show: oldExtra.show_regional_notes ?? false },
                ]
            } else {
                const visa = saved?.visa_notes ?? 'Visa on arrival or pre-travel visa processing is required as per destination country guidelines.'
                const passport = saved?.passport_notes ?? 'Passport must be valid for at least 6 months from the date of travel.'
                const currency = saved?.currency_exchange ?? 'We recommend carrying international credit cards and local currency cash.'
                const flight = saved?.intl_flight ?? 'International flights are not included unless explicitly mentioned in inclusions.'
                const forex = saved?.forex_guidelines ?? 'Please carry a loaded multi-currency Forex card for convenient payments.'
                const insurance = saved?.timezone_notes ?? 'We strongly recommend purchasing comprehensive travel insurance.'
                const embassy = saved?.embassy_contact ?? 'Indian Embassy contact details will be shared upon booking confirmation.'

                return [
                    { id: 'intl-1', heading: 'Visa Requirements', content: visa, show: oldExtra.show_visa_info ?? true },
                    { id: 'intl-2', heading: 'Passport Validity', content: passport, show: oldExtra.show_passport_notes ?? true },
                    { id: 'intl-3', heading: 'Currency Exchange', content: currency, show: oldExtra.show_currency_info ?? true },
                    { id: 'intl-4', heading: 'International Flight Info', content: flight, show: oldExtra.show_flight_details ?? true },
                    { id: 'intl-5', heading: 'Forex Guidelines', content: forex, show: oldExtra.show_forex_guidelines ?? false },
                    { id: 'intl-6', heading: 'Travel Insurance', content: insurance, show: oldExtra.show_insurance_notes ?? false },
                    { id: 'intl-7', heading: 'Embassy Contacts', content: embassy, show: oldExtra.show_embassy_contacts ?? false },
                ]
            }
        }

        const mergeSettings = (saved: any, defaults: PdfCustomizerSettings, isDomestic: boolean): PdfCustomizerSettings => {
            if (!saved) return defaults
            return {
                ...defaults,
                ...saved,
                time_slots: { ...defaults.time_slots, ...saved.time_slots },
                content_visibility: { ...defaults.content_visibility, ...saved.content_visibility },
                sections: saved.sections ?? defaults.sections,
                terms: { ...defaults.terms, ...saved.terms },
                itinerary_layout: saved.itinerary_layout ?? defaults.itinerary_layout,
                extra_sections: migrateExtraSections(saved, isDomestic),
            }
        }

        // Support both old flat structures and split structures
        let domesticSaved = null
        let internationalSaved = null
        if (savedSettings) {
            if ('domestic' in savedSettings || 'international' in savedSettings) {
                const s = savedSettings as any
                domesticSaved = s.domestic || null
                internationalSaved = s.international || null
            } else {
                // Flat old structure
                domesticSaved = savedSettings
                internationalSaved = savedSettings
            }
        }

        return {
            domestic: mergeSettings(domesticSaved, DEFAULT_DOMESTIC_SETTINGS, true),
            international: mergeSettings(internationalSaved, DEFAULT_INTERNATIONAL_SETTINGS, false),
        }
    })

    const settings = settingsGroup[activeTab]

    const [saving, setSaving] = useState(false)
    const [previewing, setPreviewing] = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const logoInputRef = useRef<HTMLInputElement>(null)

    // -- Generic updater --
    const update = useCallback(<K extends keyof PdfCustomizerSettings>(
        key: K, value: PdfCustomizerSettings[K]
    ) => {
        setSettingsGroup(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                [key]: value
            }
        }))
    }, [activeTab])

    // ---------------------------------------------------------------------------
    // Section 1 — Branding & Layout
    // ---------------------------------------------------------------------------
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const allowed = ['image/png', 'image/jpeg', 'image/jpg']
        if (!allowed.includes(file.type)) {
            toast.error('Please upload a PNG or JPG image.')
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Logo must be smaller than 2 MB.')
            return
        }
        setUploadingLogo(true)
        try {
            const url = await uploadFileToS3(file, 'pdf-logos')
            update('logo_url', url)
            toast.success('Logo uploaded successfully.')
        } catch (err: any) {
            toast.error(err.message || 'Logo upload failed.')
        } finally {
            setUploadingLogo(false)
            if (logoInputRef.current) logoInputRef.current.value = ''
        }
    }

    // ---------------------------------------------------------------------------
    // Section 2 — Time Slots
    // ---------------------------------------------------------------------------
    const timeSlotKeys = ['morning', 'afternoon', 'evening', 'night', 'full_day', 'half_day'] as const

    const updateTimeSlot = (key: keyof TimeSlots, field: 'enabled' | 'label', value: boolean | string) => {
        setSettingsGroup(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                time_slots: {
                    ...prev[activeTab].time_slots,
                    [key]: {
                        ...prev[activeTab].time_slots[key],
                        [field]: field === 'label' ? sanitizeText(value as string) : value,
                    },
                },
            },
        }))
    }



    // ---------------------------------------------------------------------------
    // Section 5 — Section Order
    // ---------------------------------------------------------------------------
    const moveSectionUp = (idx: number) => {
        if (idx === 0) return
        setSettingsGroup(prev => {
            const arr = [...prev[activeTab].sections]
                ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
            return {
                ...prev,
                [activeTab]: {
                    ...prev[activeTab],
                    sections: arr
                }
            }
        })
    }

    const moveSectionDown = (idx: number) => {
        setSettingsGroup(prev => {
            if (idx === prev[activeTab].sections.length - 1) return prev
            const arr = [...prev[activeTab].sections]
                ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
            return {
                ...prev,
                [activeTab]: {
                    ...prev[activeTab],
                    sections: arr
                }
            }
        })
    }

    const toggleSectionVisible = (idx: number) => {
        setSettingsGroup(prev => {
            const arr = [...prev[activeTab].sections]
            arr[idx] = { ...arr[idx], visible: !arr[idx].visible }
            return {
                ...prev,
                [activeTab]: {
                    ...prev[activeTab],
                    sections: arr
                }
            }
        })
    }

    // ---------------------------------------------------------------------------
    // Save & Preview
    // ---------------------------------------------------------------------------
    const handleSave = async () => {
        setSaving(true)
        try {
            const clean = {
                domestic: deepSanitizeSettings(settingsGroup.domestic) as PdfCustomizerSettings,
                international: deepSanitizeSettings(settingsGroup.international) as PdfCustomizerSettings,
            }
            await savePdfCustomizerSettings(clean)
            toast.success('PDF Customizer settings saved for both Travel types.')
        } catch (err: any) {
            toast.error(err.message || 'Failed to save settings.')
        } finally {
            setSaving(false)
        }
    }

    const handlePreview = async () => {
        setPreviewing(true)
        try {
            const clean = deepSanitizeSettings(settings) as PdfCustomizerSettings

            // Try fetching first package ID for rendering package-driven data in preview
            let packageId: string | null = null
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                const hostname = typeof window !== 'undefined'
                    ? (localStorage.getItem('debug_domain') || window.location.hostname)
                    : 'localhost'
                const res = await fetch(`${API_URL}/api/v1/agent/packages?limit=1`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        'X-Domain': hostname,
                    }
                })
                if (res.ok) {
                    const data = await res.json()
                    const pkgs = data.items || data.packages || []
                    if (pkgs.length > 0 && pkgs[0].id) {
                        packageId = pkgs[0].id
                    }
                }
            } catch (err) {
                console.error('Failed to pre-fetch package ID for preview', err)
            }

            const blob = await previewPdfCustomizer(clean, packageId, activeTab)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `quote-preview-${activeTab}.pdf`
            a.click()
            URL.revokeObjectURL(url)
            toast.success(`Preview PDF generated for ${activeTab === 'domestic' ? 'Domestic' : 'International'} layout.`)
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate preview.')
        } finally {
            setPreviewing(false)
        }
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    const cardCls = 'glass-agent overflow-hidden transition-all duration-300'
    const inputCls = 'glass-input h-11 font-medium rounded-lg text-[var(--color-primary-font)]'
    const labelCls = 'text-sm font-bold text-[var(--color-primary-font)]/70'

    return (
        <div className="space-y-6 pb-16">

            {/* Travel Type Selector Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur rounded-2xl border border-slate-200/50 max-w-md shadow-sm">
                <button
                    type="button"
                    onClick={() => setActiveTab('domestic')}
                    className={cn(
                        "flex-1 py-3 px-6 text-sm font-extrabold rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
                        activeTab === 'domestic'
                            ? "bg-white text-[var(--primary)] shadow-sm scale-[1.02]"
                            : "text-slate-600 hover:text-slate-800 hover:bg-white/40"
                    )}
                >
                    🗺️ Domestic Travel
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('international')}
                    className={cn(
                        "flex-1 py-3 px-6 text-sm font-extrabold rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
                        activeTab === 'international'
                            ? "bg-white text-[var(--primary)] shadow-sm scale-[1.02]"
                            : "text-slate-600 hover:text-slate-800 hover:bg-white/40"
                    )}
                >
                    ✈️ International Travel
                </button>
            </div>

            {/* ─── Section 1 — Branding & Layout ─────────────────────────────── */}
            <Card id="pdf-branding" className={cardCls}>
                <SectionHeader
                    icon={Palette}
                    title="Branding & Layout"
                    description="Customise your agency logo, brand colours, typography, and footer visibility on all quote PDFs."
                />
                <Separator className="bg-white/10" />
                <CardContent className="px-7 pb-7 pt-6 space-y-7">

                    {/* Logo position + upload */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className={labelCls}>Agent Logo Position</Label>
                            <Select
                                value={settings.logo_position}
                                onValueChange={v => update('logo_position', v as any)}
                            >
                                <SelectTrigger className={inputCls}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="top_left">Top Left</SelectItem>
                                    <SelectItem value="top_center">Top Center</SelectItem>
                                    <SelectItem value="top_right">Top Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className={labelCls}>Logo Upload <span className="font-normal text-[var(--color-primary-font)]/50">(PNG/JPG · max 2 MB)</span></Label>
                            <div className="flex items-center gap-3">
                                {settings.logo_url ? (
                                    <div className="h-11 w-11 rounded-lg border border-white/30 bg-white/20 overflow-hidden flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={settings.logo_url}
                                            alt="Agent logo preview"
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-11 w-11 rounded-lg border-2 border-dashed border-white/30 bg-white/10 flex items-center justify-center text-[var(--color-primary-font)]/40">
                                        <ImageIcon className="h-5 w-5" />
                                    </div>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-11 font-semibold border-white/30 bg-white/20 hover:bg-white/30 text-[var(--color-primary-font)]"
                                    onClick={() => logoInputRef.current?.click()}
                                    disabled={uploadingLogo}
                                >
                                    {uploadingLogo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                    {uploadingLogo ? 'Uploading…' : settings.logo_url ? 'Replace Logo' : 'Upload Logo'}
                                </Button>
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                />
                                {settings.logo_url && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => update('logo_url', '')}
                                        title="Remove logo"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-slate-100/50" />

                    {/* Colors + Font */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className={labelCls}>Primary Color</Label>
                            <div className="flex items-center gap-3 glass-input h-11 rounded-lg px-3">
                                <div
                                    className="h-6 w-6 rounded border border-white/40 shadow-sm shrink-0"
                                    style={{ backgroundColor: settings.primary_color }}
                                />
                                <input
                                    type="color"
                                    id="pdf-primary-color"
                                    className="sr-only"
                                    value={settings.primary_color}
                                    onChange={e => update('primary_color', sanitizeColor(e.target.value))}
                                />
                                <label htmlFor="pdf-primary-color" className="text-sm font-medium text-[var(--color-primary-font)] cursor-pointer flex-1">
                                    {settings.primary_color}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('pdf-primary-color')?.click()}
                                    className="text-xs font-bold text-[var(--primary)] hover:underline"
                                >
                                    Change
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className={labelCls}>Accent Color</Label>
                            <div className="flex items-center gap-3 glass-input h-11 rounded-lg px-3">
                                <div
                                    className="h-6 w-6 rounded border border-white/40 shadow-sm shrink-0"
                                    style={{ backgroundColor: settings.accent_color }}
                                />
                                <input
                                    type="color"
                                    id="pdf-accent-color"
                                    className="sr-only"
                                    value={settings.accent_color}
                                    onChange={e => update('accent_color', sanitizeColor(e.target.value))}
                                />
                                <label htmlFor="pdf-accent-color" className="text-sm font-medium text-[var(--color-primary-font)] cursor-pointer flex-1">
                                    {settings.accent_color}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('pdf-accent-color')?.click()}
                                    className="text-xs font-bold text-[var(--primary)] hover:underline"
                                >
                                    Change
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className={labelCls}>Font Style</Label>
                            <Select value={settings.font_style} onValueChange={v => update('font_style', v as any)}>
                                <SelectTrigger className={inputCls}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default</SelectItem>
                                    <SelectItem value="modern">Modern</SelectItem>
                                    <SelectItem value="classic">Classic</SelectItem>
                                    <SelectItem value="minimal">Minimal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator className="bg-slate-100/50" />

                    {/* Contact Footer toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-[var(--color-primary-font)]">Show Agent Contact Footer</p>
                            <p className="text-xs text-[var(--color-primary-font)]/60">Display your phone, email, and website at the bottom of every PDF page.</p>
                        </div>
                        <Toggle
                            id="pdf-show-footer"
                            checked={settings.show_footer}
                            onChange={v => update('show_footer', v)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ─── Section 2 — Time-of-Day Slots ──────────────────────────────── */}
            <Card id="pdf-time-slots" className={cardCls}>
                <SectionHeader
                    icon={Clock}
                    title="Itinerary Time-of-Day Slots"
                    description="Enable/disable slot labels globally. Disabled slots are hidden from the PDF even if activities are assigned."
                />
                <Separator className="bg-white/10" />
                <CardContent className="px-7 pb-7 pt-5">
                    {/* Itinerary Display Layout */}
                    <div className="space-y-2 mb-5">
                        <Label className={labelCls}>Itinerary Display Layout</Label>
                        <div className="flex gap-3">
                            {[
                                {
                                    value: 'vertical',
                                    label: 'Vertical',
                                    desc: 'Each day stacked top to bottom. Time slots listed sequentially.',
                                    icon: '☰'
                                },
                                {
                                    value: 'horizontal',
                                    label: 'Horizontal',
                                    desc: 'Days displayed side by side as columns. Good for short trips.',
                                    icon: '⊞'
                                },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => update('itinerary_layout', opt.value as any)}
                                    className={cn(
                                        'flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all',
                                        settings.itinerary_layout === opt.value
                                            ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm'
                                            : 'border-slate-200/60 bg-white/10 hover:border-slate-300/60'
                                    )}
                                >
                                    <p className="text-lg mb-1">{opt.icon}</p>
                                    <p className="text-sm font-bold text-[var(--color-primary-font)]">{opt.label}</p>
                                    <p className="text-xs text-[var(--color-primary-font)]/60 mt-0.5">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/20 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-white/10 border-b border-white/20">
                                    <th className="text-left py-3 px-4 font-bold text-[var(--color-primary-font)]/70 text-xs uppercase tracking-wider">Slot</th>
                                    <th className="text-left py-3 px-4 font-bold text-[var(--color-primary-font)]/70 text-xs uppercase tracking-wider">Label on PDF</th>
                                    <th className="text-right py-3 px-4 font-bold text-[var(--color-primary-font)]/70 text-xs uppercase tracking-wider">Enabled</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timeSlotKeys.map((key, i) => {
                                    const slot = settings.time_slots[key]
                                    const defaultLabel = (activeTab === 'domestic' ? DEFAULT_DOMESTIC_SETTINGS : DEFAULT_INTERNATIONAL_SETTINGS).time_slots[key].label
                                    return (
                                        <tr key={key} className={cn(
                                            'border-b border-white/10 last:border-0 transition-colors',
                                            !slot.enabled && 'opacity-50'
                                        )}>
                                            <td className="py-3 px-4 font-semibold text-[var(--color-primary-font)] capitalize">
                                                {defaultLabel}
                                            </td>
                                            <td className="py-2 px-4">
                                                <Input
                                                    className="glass-input h-9 text-sm font-medium rounded-lg max-w-xs"
                                                    value={slot.label}
                                                    placeholder={defaultLabel}
                                                    onChange={e => updateTimeSlot(key, 'label', e.target.value)}
                                                    maxLength={30}
                                                />
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Toggle
                                                    id={`slot-${key}`}
                                                    checked={slot.enabled}
                                                    onChange={v => updateTimeSlot(key, 'enabled', v)}
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Quote Content Visibility ───────────────────────────────────── */}
            <Card id="pdf-content-visibility" className={cardCls}>
                <SectionHeader
                    icon={Eye}
                    title="Quote Content Visibility"
                    description="Toggle visibility of package-level details in the generated PDF. These details are pulled dynamically from the package record."
                />
                <Separator className="bg-white/10" />
                <CardContent className="px-7 pb-7 pt-6 space-y-6">
                    {[
                        {
                            key: 'show_inclusions',
                            label: 'Show Inclusions',
                            desc: 'Include the package inclusions section in the PDF.',
                        },
                        {
                            key: 'show_exclusions',
                            label: 'Show Exclusions',
                            desc: 'Include the package exclusions section in the PDF.',
                        },
                        {
                            key: 'show_cancellation',
                            label: 'Show Cancellation Policy',
                            desc: 'Include the package cancellation policy in the PDF.',
                        },
                        {
                            key: 'show_activity_images',
                            label: 'Show Activity Images',
                            desc: 'Display activity images in the itinerary section if available.',
                        },
                    ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor={`toggle-${item.key}`} className="text-sm font-bold text-[var(--color-primary-font)]">
                                    {item.label}
                                </Label>
                                <p className="text-xs text-[var(--color-primary-font)]/60 font-semibold">{item.desc}</p>
                            </div>
                            <Toggle
                                id={`toggle-${item.key}`}
                                checked={settings.content_visibility[item.key as keyof ContentVisibility]}
                                onChange={v => setSettingsGroup(prev => ({
                                    ...prev,
                                    [activeTab]: {
                                        ...prev[activeTab],
                                        content_visibility: {
                                            ...prev[activeTab].content_visibility,
                                            [item.key]: v
                                        }
                                    }
                                }))}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ─── Section 5 — Section Visibility & Order ─────────────────────── */}
            <Card id="pdf-section-order" className={cardCls}>
                <SectionHeader
                    icon={Layout}
                    title="Section Visibility & Order"
                    description="Show or hide each PDF section and drag them into the order you want."
                />
                <Separator className="bg-white/10" />
                <CardContent className="px-7 pb-7 pt-5">
                    <div className="space-y-2">
                        {settings.sections.map((section, idx) => (
                            <div
                                key={section.id}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
                                    section.visible
                                        ? 'bg-white/20 border-white/30 shadow-sm'
                                        : 'bg-white/5 border-white/10 opacity-60'
                                )}
                            >
                                {/* Up/Down arrows */}
                                <div className="flex flex-col gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => moveSectionUp(idx)}
                                        disabled={idx === 0}
                                        className="h-5 w-5 flex items-center justify-center rounded text-[var(--color-primary-font)]/40 hover:text-[var(--primary)] hover:bg-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                        aria-label={`Move ${section.label} up`}
                                    >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveSectionDown(idx)}
                                        disabled={idx === settings.sections.length - 1}
                                        className="h-5 w-5 flex items-center justify-center rounded text-[var(--color-primary-font)]/40 hover:text-[var(--primary)] hover:bg-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                        aria-label={`Move ${section.label} down`}
                                    >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* Position badge */}
                                <span className="text-xs font-black text-[var(--color-primary-font)]/30 w-5 text-center">
                                    {idx + 1}
                                </span>

                                {/* Label */}
                                <span className="flex-1 text-sm font-semibold text-[var(--color-primary-font)]">
                                    {section.label}
                                </span>

                                {/* Visibility badge + toggle */}
                                <span className={cn(
                                    'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                                    section.visible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                )}>
                                    {section.visible ? 'Visible' : 'Hidden'}
                                </span>
                                <Toggle
                                    id={`section-vis-${section.id}`}
                                    checked={section.visible}
                                    onChange={() => toggleSectionVisible(idx)}
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ─── Type-Specific Travel Information ───────────────────────────── */}
            {activeTab === 'domestic' ? (
                <Card id="pdf-domestic-info" className={cardCls}>
                    <SectionHeader
                        icon={AlignLeft}
                        title="Domestic Travel Guidelines"
                        description="Customise the helpful domestic travel information to display on the generated PDF."
                    />
                    <Separator className="bg-white/10" />
                    <CardContent className="px-7 pb-7 pt-6">
                        <ExtraSectionsEditor
                            sections={settings.extra_sections || []}
                            onChange={updated => update('extra_sections', updated)}
                        />
                    </CardContent>
                </Card>
            ) : (
                <Card id="pdf-international-info" className={cardCls}>
                    <SectionHeader
                        icon={AlignLeft}
                        title="International Travel Guidelines"
                        description="Customise the travel notes, warnings, and regulations for international quote PDFs."
                    />
                    <Separator className="bg-white/10" />
                    <CardContent className="px-7 pb-7 pt-6">
                        <ExtraSectionsEditor
                            sections={settings.extra_sections || []}
                            onChange={updated => update('extra_sections', updated)}
                        />
                    </CardContent>
                </Card>
            )}

            {/* ─── Section 6 — Terms & Conditions ─────────────────────────────── */}
            <Card id="pdf-terms" className={cardCls}>
                <SectionHeader
                    icon={AlignLeft}
                    title="Terms & Conditions"
                    description="Include standard T&C at the end of every quote PDF. Use a global template or write custom text."
                />
                <Separator className="bg-white/10" />
                <CardContent className="px-7 pb-7 pt-6 space-y-5">

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-sm font-bold text-[var(--color-primary-font)]">Show Terms & Conditions on PDF</p>
                        </div>
                        <Toggle
                            id="pdf-terms-show"
                            checked={settings.terms.show}
                            onChange={v => setSettingsGroup(prev => ({
                                ...prev,
                                [activeTab]: {
                                    ...prev[activeTab],
                                    terms: { ...prev[activeTab].terms, show: v }
                                }
                            }))}
                        />
                    </div>

                    <Separator className="bg-slate-100/50" />

                    {/* Global vs Custom radio */}
                    <div className="space-y-3">
                        <Label className={labelCls}>Template Source</Label>
                        <div className="flex gap-3">
                            {[
                                { value: true, label: 'Use Global T&C', desc: 'From your saved global setting' },
                                { value: false, label: 'Custom per Quote', desc: 'Write your own text below' },
                            ].map(opt => (
                                <button
                                    key={String(opt.value)}
                                    type="button"
                                    onClick={() => setSettingsGroup(prev => ({
                                        ...prev,
                                        [activeTab]: {
                                            ...prev[activeTab],
                                            terms: { ...prev[activeTab].terms, use_global: opt.value }
                                        }
                                    }))}
                                    className={cn(
                                        'flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all',
                                        settings.terms.use_global === opt.value
                                            ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm'
                                            : 'border-slate-200/60 bg-white/10 hover:border-slate-300/60'
                                    )}
                                >
                                    <p className="text-sm font-bold text-[var(--color-primary-font)]">{opt.label}</p>
                                    <p className="text-xs text-[var(--color-primary-font)]/60 mt-0.5">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom T&C text */}
                    {!settings.terms.use_global && (
                        <div className="space-y-2">
                            <Label className={labelCls}>Custom T&C Text</Label>
                            <textarea
                                className="glass-input w-full rounded-xl p-3.5 text-sm font-medium text-[var(--color-primary-font)] min-h-[140px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                                value={settings.terms.custom_text}
                                placeholder="Type your terms and conditions here…"
                                maxLength={5000}
                                onChange={e => setSettingsGroup(prev => ({
                                    ...prev,
                                    [activeTab]: {
                                        ...prev[activeTab],
                                        terms: { ...prev[activeTab].terms, custom_text: sanitizeText(e.target.value) }
                                    }
                                }))}
                            />
                            <p className="text-xs text-[var(--color-primary-font)]/50 text-right">
                                {settings.terms.custom_text.length} / 5000
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── Action Bar ─────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Button
                    id="pdf-preview-btn"
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-8 font-bold border-white/30 bg-white/20 hover:bg-white/30 text-[var(--color-primary-font)] rounded-full shadow-sm transition-all active:scale-95"
                    onClick={handlePreview}
                    disabled={previewing || saving}
                >
                    {previewing
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                        : <><Eye className="h-4 w-4 mr-2" />Preview Sample PDF</>
                    }
                </Button>

                <Button
                    id="pdf-save-btn"
                    type="button"
                    className="w-full sm:w-auto h-12 px-10 font-bold rounded-full shadow-lg bg-gradient-to-r from-[var(--button-bg)] to-[var(--button-bg-light)] text-white shadow-[var(--button-glow)] transition-all active:scale-95 hover:-translate-y-0.5"
                    onClick={handleSave}
                    disabled={saving || previewing}
                >
                    {saving
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                        : <><Save className="h-4 w-4 mr-2" />Save Settings</>
                    }
                </Button>

                <p className="text-xs text-[var(--color-primary-font)]/50 flex items-center gap-1.5 ml-2">
                    <Info className="h-3 w-3" />
                    Changes apply to new quotes only. Existing quotes are not affected.
                </p>
            </div>
        </div>
    )
}
