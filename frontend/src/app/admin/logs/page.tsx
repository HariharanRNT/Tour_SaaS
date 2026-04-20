'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Activity, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
    Eye, Trash2, CheckCircle2, XCircle, Clock, Globe,
    AlertTriangle, Shield, Server, FileX, Zap, X, ChevronDown,
    BarChart2, TrendingUp, Wifi, Code, Download, ArrowUp, ArrowDown, CreditCard, LayoutDashboard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { Card, CardContent, CardDescription } from '@/components/ui/card'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────
interface LogEntry {
    id: string
    method: string
    endpoint: string
    status_code: number
    status: 'success' | 'error'
    duration_ms: number | null
    error_type: string | null
    error_message: string | null
    user_role: string | null
    ip_address: string | null
    created_at: string
}

interface LogDetail extends LogEntry {
    query_params: Record<string, string> | null
    request_body: unknown
    request_headers: Record<string, string> | null
    response_body: unknown
    stack_trace: string | null
    user_id: string | null
    user_agent: string | null
}

interface Stats {
    total: number
    success_count: number
    error_count: number
    success_rate: number
    avg_duration_ms: number
    method_breakdown: { method: string; count: number }[]
    error_breakdown: { error_type: string; count: number }[]
    trend: { date: string; total: number; success: number; error: number }[]
}

// ─────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────
const ERROR_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    validation: { label: 'Validation',  icon: AlertTriangle, color: 'text-amber-400' },
    auth:       { label: 'Auth Error',  icon: Shield,        color: 'text-red-400' },
    server:     { label: 'Server Error',icon: Server,        color: 'text-rose-400' },
    not_found:  { label: 'Not Found',   icon: FileX,         color: 'text-slate-400' },
    rate_limit: { label: 'Rate Limit',  icon: Zap,           color: 'text-orange-400' },
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
function fmt(iso: string) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
}

function StatusBadge({ status, code }: { status: string; code: number }) {
    return status === 'success'
        ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-emerald-500/12 border border-emerald-500/20 text-emerald-600">
            <CheckCircle2 className="w-3 h-3" /> {code}
          </span>
        : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-rose-500/12 border border-rose-500/20 text-rose-600">
            <XCircle className="w-3 h-3" /> {code}
          </span>
}

function MethodBadge({ method }: { method: string }) {
    const colors: Record<string, string> = {
        GET:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        POST:   'bg-blue-500/10 text-blue-600 border-blue-500/20',
        PUT:    'bg-amber-500/10 text-amber-600 border-amber-500/20',
        PATCH:  'bg-violet-500/10 text-violet-600 border-violet-500/20',
        DELETE: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    }
    const cls = colors[method] ?? 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    return <span className={cn("inline-block px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest border uppercase", cls)}>{method}</span>
}

function DurationBadge({ ms }: { ms: number | null }) {
    if (ms === null) return <span className="text-slate-400 text-xs">—</span>
    const color = ms < 200 ? 'text-emerald-600' : ms < 800 ? 'text-amber-600' : 'text-rose-600'
    return <span className={cn("text-[11px] font-bold", color)}>{ms.toFixed(0)} ms</span>
}

function ErrorTypeBadge({ type }: { type: string | null }) {
    if (!type) return <span className="text-slate-400 text-xs">—</span>
    const meta = ERROR_TYPE_META[type]
    if (!meta) return <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{type}</span>
    const Icon = meta.icon
    const colorClass = meta.color.replace('text-', 'text-').replace('400', '600')
    return (
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight", colorClass)}>
            <Icon className="w-3 h-3" />{meta.label}
        </span>
    )
}

function JsonViewer({ data, label }: { data: unknown; label: string }) {
    const [open, setOpen] = useState(true)
    if (data === null || data === undefined) return (
        <div className="rounded-xl border border-orange-100/50 bg-white/50 p-4">
            <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1">{label}</p>
            <p className="text-slate-400 text-sm italic">No data</p>
        </div>
    )
    return (
        <div className="rounded-xl border border-orange-100/50 bg-white/50 overflow-hidden">
            <button onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50/50 transition-colors">
                <span className="text-[10px] font-black text-black uppercase tracking-widest">{label}</span>
                <ChevronDown className={cn("w-4 h-4 text-black transition-transform", open ? 'rotate-180' : '')} />
            </button>
            {open && (
                <pre className="px-4 pb-4 text-xs text-slate-700 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all border-t border-orange-50/50 pt-3">
                    {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    )
}

function StatsBar({ stats }: { stats: Stats | null }) {
    if (!stats) return null
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { label: 'Total Requests', value: stats.total.toLocaleString(), icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
                { label: 'Success Rate', value: `${stats.success_rate}%`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                { label: 'Avg Response', value: `${stats.avg_duration_ms.toFixed(0)} ms`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                { label: 'Error Count', value: stats.error_count.toLocaleString(), icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-500/10' },
            ].map(c => (
                <GlassCard key={c.label} className="p-5 flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-black">{c.label}</h3>
                        <div className={cn("p-2 rounded-xl border border-white/40 shadow-sm backdrop-blur-sm transition-transform group-hover:scale-110", c.bg, c.color)}>
                            <c.icon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-black tracking-tight">{c.value}</div>
                </GlassCard>
            ))}
        </div>
    )
}

function DetailDrawer({ logId, onClose }: { logId: string; onClose: () => void }) {
    const [detail, setDetail] = useState<LogDetail | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch(`${API_BASE}/api/v1/admin-simple/logs/${logId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) setDetail(await res.json())
            } finally { setLoading(false) }
        }
        load()
    }, [logId])

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 md:p-6" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.3)' }}>
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="relative h-full w-full max-w-2xl bg-white/95 backdrop-blur-xl border border-orange-100 shadow-2xl rounded-[32px] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="bg-white/50 border-b border-orange-50 px-8 py-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-black tracking-tight">Log Detail</h2>
                        {detail && <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">{detail.id}</p>}
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 transition-colors shadow-sm">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                            <p className="text-[10px] font-black text-black uppercase tracking-widest animate-pulse">Fetching details...</p>
                        </div>
                    )}

                    {detail && !loading && (
                        <div className="space-y-6">
                            {/* Summary row */}
                            <div className="flex flex-wrap gap-3 items-center">
                                <MethodBadge method={detail.method} />
                                <StatusBadge status={detail.status} code={detail.status_code} />
                                <DurationBadge ms={detail.duration_ms} />
                                {detail.error_type && <ErrorTypeBadge type={detail.error_type} />}
                            </div>

                            {/* Endpoint */}
                            <div className="rounded-2xl border border-orange-100 bg-orange-50/30 px-5 py-4">
                                <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1.5 opacity-60">Endpoint</p>
                                <code className="text-sm text-indigo-600 font-mono break-all font-bold">{detail.endpoint}</code>
                            </div>

                            {/* Timestamp & Caller */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm">
                                    <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1.5 opacity-60">Timestamp</p>
                                    <p className="text-black font-bold text-xs">{fmt(detail.created_at)}</p>
                                </div>
                                <div className="rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm">
                                    <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1.5 opacity-60">Caller</p>
                                    <p className="text-black font-bold text-xs">{detail.ip_address || '—'}</p>
                                    <p className="text-orange-600 text-[10px] font-black uppercase tracking-tight mt-0.5">{detail.user_role || 'anonymous'}</p>
                                </div>
                            </div>

                            {/* Error info */}
                            {detail.status === 'error' && (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5 space-y-2 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-5 h-5 text-rose-600" />
                                        <span className="text-[13px] font-black text-rose-700 uppercase tracking-tight">
                                            Error: {detail.error_type || 'unknown'}
                                        </span>
                                    </div>
                                    {detail.error_message && (
                                        <p className="text-sm text-rose-600/80 font-medium leading-relaxed break-all bg-white/50 p-3 rounded-xl border border-rose-100/50">
                                            {detail.error_message}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Request / Response bodies */}
                            <div className="space-y-4 pt-2">
                                <JsonViewer data={detail.query_params}    label="Query Params" />
                                <JsonViewer data={detail.request_headers}  label="Request Headers" />
                                <JsonViewer data={detail.request_body}     label="Request Body" />
                                <JsonViewer data={detail.response_body}    label="Response Body" />
                            </div>

                            {/* Stack trace  */}
                            {detail.stack_trace && (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
                                    <div className="px-5 py-3 bg-amber-100/50 border-b border-amber-200 flex items-center gap-2">
                                        <Code className="w-4 h-4 text-amber-700" />
                                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Stack Trace</p>
                                    </div>
                                    <pre className="p-5 text-xs text-amber-900 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed bg-white/30">
                                        {detail.stack_trace}
                                    </pre>
                                </div>
                            )}

                            {/* User agent */}
                            {detail.user_agent && (
                                <div className="rounded-2xl border border-orange-100 bg-slate-50 px-5 py-4">
                                    <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1.5 opacity-60">User Agent</p>
                                    <p className="text-slate-600 text-xs leading-relaxed font-medium">{detail.user_agent}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

// ─────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────
export default function AdminLogsPage() {
    // Filter state
    const [status,     setStatus]     = useState('')
    const [method,     setMethod]     = useState('')
    const [errorType,  setErrorType]  = useState('')
    const [dateFrom,   setDateFrom]   = useState('')
    const [dateTo,     setDateTo]     = useState('')
    const [search,     setSearch]     = useState('')
    const [page,       setPage]       = useState(1)
    const LIMIT = 50

    // Data state
    const [logs,      setLogs]      = useState<LogEntry[]>([])
    const [total,     setTotal]     = useState(0)
    const [totalPages,setTotalPages]= useState(1)
    const [stats,     setStats]     = useState<Stats | null>(null)
    const [loading,   setLoading]   = useState(true)
    const [statsLoad, setStatsLoad] = useState(true)

    // UI state
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
    const headers = { Authorization: `Bearer ${token}` }

    const fetchStats = useCallback(async () => {
        setStatsLoad(true)
        try {
            const params = new URLSearchParams()
            if (dateFrom) params.set('date_from', dateFrom)
            if (dateTo)   params.set('date_to',   dateTo)
            const res = await fetch(`${API_BASE}/api/v1/admin-simple/logs/stats?${params}`, { headers })
            if (res.ok) setStats(await res.json())
        } finally { setStatsLoad(false) }
    }, [dateFrom, dateTo])

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
            if (status)    params.set('status',     status)
            if (method)    params.set('method',     method)
            if (errorType) params.set('error_type', errorType)
            if (dateFrom)  params.set('date_from',  dateFrom)
            if (dateTo)    params.set('date_to',    dateTo)
            if (search)    params.set('search',     search)
            const res = await fetch(`${API_BASE}/api/v1/admin-simple/logs?${params}`, { headers })
            if (res.ok) {
                const data = await res.json()
                setLogs(data.data)
                setTotal(data.total)
                setTotalPages(data.total_pages)
            }
        } finally { setLoading(false) }
    }, [page, status, method, errorType, dateFrom, dateTo, search])

    useEffect(() => { fetchStats() }, [fetchStats])
    useEffect(() => { fetchLogs()  }, [fetchLogs])

    const handleDeleteLog = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!window.confirm('Are you sure you want to delete this log? This action cannot be undone.')) return

        try {
            const res = await fetch(`${API_BASE}/api/v1/admin-simple/logs/${id}`, {
                method: 'DELETE',
                headers
            })
            if (res.ok) {
                // Refresh data
                fetchLogs()
                fetchStats()
            } else {
                const err = await res.json()
                alert(`Error deleting log: ${err.detail || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Delete error:', error)
            alert('Failed to delete log. please try again.')
        }
    }

    function resetFilters() {
        setStatus(''); setMethod(''); setErrorType('')
        setDateFrom(''); setDateTo(''); setSearch('')
        setPage(1)
    }

    function handleFilter() { setPage(1); fetchLogs(); fetchStats() }

    const activeFilterCount = [status, method, errorType, dateFrom, dateTo, search].filter(Boolean).length

    return (
        <div className="min-h-screen noise-overlay relative overflow-hidden p-8 md:p-10 lg:p-12">
            {/* Background Blobs for Depth */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-400/10 blur-[120px] rounded-full animate-blob pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-400/10 blur-[120px] rounded-full animate-blob animation-delay-2000 pointer-events-none" />
            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-rose-400/10 blur-[120px] rounded-full animate-blob animation-delay-4000 pointer-events-none" />

            <div className="max-w-[1536px] mx-auto space-y-10 relative z-10">

                {/* ── Page Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-orange-100/50">
                    <div>
                        <motion.h1
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-[42px] font-[900] text-black tracking-tight leading-none"
                        >
                            API <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B2B] to-[#F59E0B] underline decoration-orange-200 underline-offset-8">Logs</span>
                        </motion.h1>
                        <p className="text-black mt-4 text-[10px] font-black uppercase tracking-[0.3em]">System Activity Audit Trail</p>
                        <p className="text-black mt-1 text-lg font-medium">Monitoring platform-wide <span className="text-orange-600 font-bold underline decoration-orange-200 underline-offset-4">API interactions</span> in real-time.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { fetchLogs(); fetchStats() }}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border-transparent shadow-sm hover:shadow-md transition-all font-black text-[10px] uppercase tracking-widest text-black h-12"
                        >
                            <RefreshCw className={cn("w-4 h-4 text-orange-500", loading ? 'animate-spin' : '')} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowFilters(f => !f)}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-2xl border-transparent shadow-sm hover:shadow-md transition-all font-black text-[10px] uppercase tracking-widest h-12",
                                showFilters || activeFilterCount > 0
                                    ? 'bg-orange-500 text-white shadow-orange-500/20'
                                    : 'bg-white text-black'
                            )}
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-lg bg-white/20 text-[9px] font-black">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Stats Bar ── */}
                <StatsBar stats={stats} />

                {/* ── Filters Panel ── */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <GlassCard className="p-8 space-y-6 !bg-white/40">
                                <div className="flex items-center justify-between border-b border-orange-100/50 pb-4">
                                    <span className="text-[11px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-orange-600" /> Filter Engine
                                    </span>
                                    {activeFilterCount > 0 && (
                                        <button onClick={resetFilters}
                                            className="text-[10px] font-black text-orange-600 hover:text-orange-700 underline decoration-orange-300 underline-offset-4 uppercase tracking-widest">
                                            Reset all filters
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {/* Search */}
                                    <div className="relative col-span-full xl:col-span-2">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Search endpoints or resources…"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleFilter()}
                                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-transparent focus:border-orange-200 text-sm text-black font-medium placeholder-slate-400 shadow-sm focus:shadow-md focus:outline-none transition-all"
                                        />
                                    </div>

                                    {/* Status */}
                                    <div className="relative">
                                        <select value={status} onChange={e => setStatus(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-2xl bg-white border border-transparent text-sm text-black font-bold focus:outline-none shadow-sm appearance-none cursor-pointer">
                                            <option value="">All Statuses</option>
                                            <option value="success">Success Only</option>
                                            <option value="error">Error Only</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 pointer-events-none" />
                                    </div>

                                    {/* Method */}
                                    <div className="relative">
                                        <select value={method} onChange={e => setMethod(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-2xl bg-white border border-transparent text-sm text-black font-bold focus:outline-none shadow-sm appearance-none cursor-pointer">
                                            <option value="">All Methods</option>
                                            {['GET','POST','PUT','PATCH','DELETE'].map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 pointer-events-none" />
                                    </div>

                                    {/* Error type */}
                                    <div className="relative">
                                        <select value={errorType} onChange={e => setErrorType(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-2xl bg-white border border-transparent text-sm text-black font-bold focus:outline-none shadow-sm appearance-none cursor-pointer">
                                            <option value="">All Error Types</option>
                                            <option value="validation">Validation</option>
                                            <option value="auth">Auth</option>
                                            <option value="server">Server Error</option>
                                            <option value="not_found">Not Found</option>
                                            <option value="rate_limit">Rate Limit</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 pointer-events-none" />
                                    </div>

                                    {/* Date range */}
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                        className="px-4 py-3.5 rounded-2xl bg-white border border-transparent text-sm text-black font-bold focus:outline-none shadow-sm" />

                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                        className="px-4 py-3.5 rounded-2xl bg-white border border-transparent text-sm text-black font-bold focus:outline-none shadow-sm" />

                                    {/* Apply button */}
                                    <button onClick={handleFilter}
                                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF692B] to-[#F59E0B] hover:scale-[1.02] active:scale-[0.98] text-white shadow-xl shadow-orange-500/20 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                                        <Search className="w-4 h-4" />
                                        Apply filters
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Logs Table ── */}
                <Card className="rounded-[32px] backdrop-blur-[18px] bg-white/40 border border-white/40 p-0 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all">
                    <div className="bg-white/40 backdrop-blur-md border-b border-orange-50 py-8 px-8 flex flex-row items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-[13px] font-black tracking-[1px] uppercase text-black">Traffic Monitor</h2>
                                {activeFilterCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[9px] font-black text-orange-600 uppercase tracking-tighter">Filtered</span>
                                )}
                            </div>
                            <CardDescription className="text-black font-bold text-[11px] mt-1 uppercase tracking-tight">
                                {total.toLocaleString()} Requests <span className="mx-1 opacity-20">|</span> Page {page} of {totalPages}
                            </CardDescription>
                        </div>
                        <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                            <BarChart2 className="h-5 w-5 text-orange-600" />
                        </div>
                    </div>

                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-orange-50/50">
                                    {['Timestamp','Method','Endpoint','Status','Duration','Error','Role','Actions'].map(h => (
                                        <th key={h} className="text-left px-8 py-5 text-[10px] text-black uppercase tracking-[0.2em] font-black whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-24">
                                            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
                                            <p className="text-[10px] font-black text-black uppercase tracking-widest animate-pulse">Synchronizing logs…</p>
                                        </td>
                                    </tr>
                                )}
                                {!loading && logs.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-24">
                                            <div className="bg-orange-50 w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                                                <Activity className="w-8 h-8 text-orange-200" />
                                            </div>
                                            <p className="text-sm font-black text-black uppercase tracking-widest">No matching logs found</p>
                                            <p className="text-[11px] text-slate-500 font-bold mt-2">Try clarifying your search or adjusting the period</p>
                                        </td>
                                    </tr>
                                )}
                                {!loading && logs.map((log, i) => (
                                    <tr
                                        key={log.id}
                                        onClick={() => setSelectedId(log.id)}
                                        className={cn(
                                            "border-b border-orange-50/50 cursor-pointer transition-all duration-200 group relative",
                                            log.status === 'error' ? 'hover:bg-rose-50/30' : 'hover:bg-emerald-50/30',
                                            selectedId === log.id ? 'bg-orange-500/10' : ''
                                        )}
                                    >
                                        <td className="px-8 py-5">
                                            <p className="text-[11px] font-bold text-black whitespace-nowrap">{fmt(log.created_at)}</p>
                                        </td>
                                        <td className="px-8 py-5"><MethodBadge method={log.method} /></td>
                                        <td className="px-8 py-5">
                                            <code className="text-[11px] text-indigo-600 font-mono font-bold truncate block max-w-[320px]" title={log.endpoint}>
                                                {log.endpoint}
                                            </code>
                                        </td>
                                        <td className="px-8 py-5"><StatusBadge status={log.status} code={log.status_code} /></td>
                                        <td className="px-8 py-5 text-right"><DurationBadge ms={log.duration_ms} /></td>
                                        <td className="px-8 py-5"><ErrorTypeBadge type={log.error_type} /></td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-black text-black uppercase tracking-widest">{log.user_role || '—'}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 text-right">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setSelectedId(log.id) }}
                                                    className="p-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                                                    title="View Detail"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={e => handleDeleteLog(e, log.id)}
                                                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                    title="Delete Log"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ── */}
                    {totalPages > 1 && (
                        <div className="bg-white/20 backdrop-blur-md border-t border-orange-50 px-8 py-6 flex items-center justify-between">
                            <p className="text-[10px] font-black text-black uppercase tracking-[0.2em]">
                                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} <span className="opacity-30">of</span> {total.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="p-3 rounded-2xl bg-white shadow-sm hover:shadow-md disabled:opacity-30 disabled:hover:shadow-sm text-black transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <div className="flex items-center gap-1.5 mx-2">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let p: number
                                        if (totalPages <= 5) { p = i + 1 }
                                        else if (page <= 3) { p = i + 1 }
                                        else if (page >= totalPages - 2) { p = totalPages - 4 + i }
                                        else { p = page - 2 + i }
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => setPage(p)}
                                                className={cn(
                                                    "w-10 h-10 rounded-2xl text-[11px] font-black transition-all shadow-sm",
                                                    p === page
                                                        ? 'bg-orange-500 text-white shadow-orange-500/30 scale-110'
                                                        : 'bg-white text-black hover:bg-orange-50'
                                                )}
                                            >
                                                {p}
                                            </button>
                                        )
                                    })}
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="p-3 rounded-2xl bg-white shadow-sm hover:shadow-md disabled:opacity-30 disabled:hover:shadow-sm text-black transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* ── Method + Error breakdown ── */}
                {stats && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Method breakdown */}
                        <Card className="rounded-[24px] backdrop-blur-[18px] bg-white/40 border border-white/40 p-8 shadow-lg">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[13px] font-black uppercase tracking-[1px] text-black flex items-center gap-2">
                                    <Code className="w-5 h-5 text-indigo-600" /> Requests by Method
                                </h3>
                            </div>
                            <div className="space-y-6">
                                {stats.method_breakdown.map(({ method: m, count }) => {
                                    const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                                    return (
                                        <div key={m} className="space-y-2.5">
                                            <div className="flex justify-between items-center px-1">
                                                <MethodBadge method={m} />
                                                <span className="text-[11px] font-black text-black">{count.toLocaleString()}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full" 
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>

                        {/* Error breakdown */}
                        <Card className="rounded-[24px] backdrop-blur-[18px] bg-white/40 border border-white/40 p-8 shadow-lg">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[13px] font-black uppercase tracking-[1px] text-black flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-rose-600" /> Errors by Classification
                                </h3>
                            </div>
                            <div className="space-y-6">
                                {stats.error_breakdown.map(({ error_type: et, count }) => {
                                    const meta = ERROR_TYPE_META[et] ?? { label: et, icon: AlertTriangle, color: 'text-slate-400' }
                                    const Icon = meta.icon
                                    const pct = stats.error_count > 0 ? (count / stats.error_count) * 100 : 0
                                    return (
                                        <div key={et} className="space-y-2.5">
                                            <div className="flex justify-between items-center px-1">
                                                <span className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest", meta.color.replace('400', '600'))}>
                                                    <Icon className="w-3.5 h-3.5" />{meta.label}
                                                </span>
                                                <span className="text-[11px] font-black text-black">{count.toLocaleString()}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full" 
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    </div>
                )}

                {/* ── 7-day Trend ── */}
                {stats && stats.trend.length > 0 && (
                    <Card className="rounded-[24px] backdrop-blur-[18px] bg-white/40 border border-white/40 p-8 shadow-lg overflow-hidden relative">
                         {/* Subtle Background Pattern for Trend */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/20 pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <h3 className="text-[13px] font-black uppercase tracking-[1px] text-black flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-600" /> Performance Velocity
                            </h3>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-2 text-[10px] font-black text-black uppercase tracking-tighter">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> Success
                                </span>
                                <span className="flex items-center gap-2 text-[10px] font-black text-black uppercase tracking-tighter">
                                    <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" /> Errors
                                </span>
                            </div>
                        </div>

                        <div className="flex items-end gap-3 h-48 relative z-10 px-2">
                            {stats.trend.map(({ date, total: t, success: s, error: e }, idx) => {
                                const maxVal = Math.max(...stats.trend.map(x => x.total), 1)
                                const heightPct = t > 0 ? Math.max(8, (t / maxVal) * 100) : 4
                                return (
                                    <div key={date} className="flex-1 flex flex-col items-center gap-4 group">
                                        <div className="w-full relative rounded-2xl overflow-hidden" style={{ height: `${heightPct}%` }}>
                                            <div className="absolute inset-0 bg-emerald-500 opacity-20" />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-2xl shadow-lg" style={{ height: `${t > 0 ? (s/t)*100 : 0}%` }} />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-rose-500 to-rose-400 rounded-2xl opacity-100" style={{ height: `${t > 0 ? (e/t)*100 : 0}%` }} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-black uppercase tracking-tighter group-hover:text-orange-600 transition-colors">
                                                {new Date(date).toLocaleDateString('en', { weekday: 'short' })}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(date).getDate()}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                )}
            </div>

            {/* ── Detail Drawer ── */}
            <AnimatePresence>
                {selectedId && (
                    <DetailDrawer logId={selectedId} onClose={() => setSelectedId(null)} />
                )}
            </AnimatePresence>
        </div>
    )
}
