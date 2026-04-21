'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { parseAISearchAndRedirect } from '@/lib/aiSearch'

interface AISearchModalProps {
  open: boolean
  onClose: () => void
}

const EXAMPLE_QUERIES = [
  'Beach honeymoon in Maldives for 5 days under ₹80,000',
  'Family trip to Manali for 6 days with adventure activities',
  'Budget solo trip to Goa next month under ₹15,000',
  'Luxury 7-day Japan tour for 2 people',
]

export default function AISearchModal({ open, onClose }: AISearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exampleIdx, setExampleIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus textarea and cycle example placeholder
  useEffect(() => {
    if (open) {
      setError(null)
      setQuery('')
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = setInterval(() => {
      setExampleIdx(i => (i + 1) % EXAMPLE_QUERIES.length)
    }, 3000)
    return () => clearInterval(t)
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSearch = async () => {
    // ── Duplicate-click guard ────────────────────────────────────────────
    if (loading) return

    const trimmed = query.trim()
    if (!trimmed) {
      setError('Please enter a travel plan description.')
      return
    }
    if (trimmed.length > 500) {
      setError('Query is too long. Please keep it under 500 characters.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await parseAISearchAndRedirect(trimmed, router)
      onClose()
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSearch()
    }
  }

  const charCount = query.length
  const isNearLimit = charCount > 400

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="ai-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[1101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-[28px] shadow-[0_32px_80px_rgba(0,0,0,0.25)] border border-white/50"
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(24px)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header gradient */}
              <div
                className="relative px-7 pt-7 pb-5"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light, #ff9966))' }}
              >
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all"
                  aria-label="Close AI search"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Icon + Title */}
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm shadow-inner border border-white/20">
                    <Sparkles className="h-6 w-6 text-white drop-shadow" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight leading-none">
                      Search with AI
                    </h2>
                    <p className="text-white/80 text-[12px] font-medium mt-0.5">
                      Describe your trip — budget, destination, dates, interests
                    </p>
                  </div>
                </div>

                {/* Decorative orb */}
                <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
              </div>

              {/* Body */}
              <div className="px-7 py-6 space-y-4">
                {/* Textarea */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    id="ai-search-query"
                    value={query}
                    onChange={e => {
                      setQuery(e.target.value)
                      if (error) setError(null)
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    rows={4}
                    maxLength={500}
                    placeholder={EXAMPLE_QUERIES[exampleIdx]}
                    className={`w-full resize-none rounded-2xl border px-4 py-3.5 text-[14px] font-medium leading-relaxed text-[#1a1a1a] placeholder:text-black/30 focus:outline-none focus:ring-2 transition-all duration-200 bg-white/70 backdrop-blur-sm ${error
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-black/10 focus:ring-[var(--primary)]/25 focus:border-[var(--primary)]/40'
                      } disabled:opacity-60`}
                  />
                  {/* Character counter */}
                  <span
                    className={`absolute bottom-3 right-4 text-[10px] font-bold tabular-nums transition-colors ${isNearLimit ? 'text-orange-500' : 'text-black/25'
                      }`}
                  >
                    {charCount}/500
                  </span>
                </div>

                {/* Inline error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="ai-error"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200"
                    >
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[13px] text-red-700 font-medium leading-snug">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hint chips */}
                <div className="flex flex-wrap gap-2">
                  {['Budget', 'Honeymoon', 'Adventure', 'Family'].map(tag => (
                    <button
                      key={tag}
                      disabled={loading}
                      onClick={() => setQuery(q => q ? q + `, ${tag.toLowerCase()} trip` : `${tag} trip`)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold border border-black/10 bg-white/70 text-black/60 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* CTA row */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 h-12 rounded-full border border-black/10 bg-transparent text-[13px] font-bold text-black/60 hover:bg-black/5 transition-all disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    id="ai-search-submit"
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    className="flex-[2] h-12 rounded-full text-white text-[14px] font-extrabold tracking-wide transition-all hover:-translate-y-[1px] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-light, #ff9966))',
                      boxShadow: '0 6px 20px var(--primary-glow, rgba(255,120,80,0.35))',
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </div>


              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
