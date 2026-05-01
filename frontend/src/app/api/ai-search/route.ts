import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// Allowed filter values (must match the /plan-trip page filter constants)
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_TRIP_STYLES = [
  'Adventure', 'Leisure', 'Cultural', 'Family', 'Honeymoon',
  'Luxury', 'Wellness', 'Group Tour', 'Corporate', 'Beach',
  'Romantic', 'Budget', 'Nature', 'Solo'
]

const ALLOWED_ACTIVITIES = [
  'Beach', 'Mountain', 'Trekking', 'Heritage', 'Nature',
  'Food & Culinary', 'City Tour', 'Snow', 'Pilgrimage',
  'Water Sports', 'Safari', 'Cycling', 'Wine Tour',
  'Photography', 'Festivals', 'Sightseeing', 'Shopping',
  'Cruise', 'Wildlife', 'Adventure Sports', 'Hiking'
]

// ─────────────────────────────────────────────────────────────────────────────
// Whitelist normalizer — filters out values not in our allowed lists
// ─────────────────────────────────────────────────────────────────────────────
function normalizeArray(input: string[] | null | undefined, allowed: string[]): string[] {
  if (!input || !Array.isArray(input)) return []
  return input.filter(v =>
    allowed.some(a => a.toLowerCase() === v.toLowerCase())
  ).map(v => allowed.find(a => a.toLowerCase() === v.toLowerCase()) as string)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai-search
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query } = body

    // ── 1. Input validation ─────────────────────────────────────────────────
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }
    if (query.trim().length === 0) {
      return NextResponse.json({ error: 'query cannot be empty' }, { status: 400 })
    }
    if (query.length > 500) {
      return NextResponse.json({ error: 'Query too long (max 500 characters)' }, { status: 400 })
    }

    // ── 2. Call Backend Gemini ──────────────────────────────────────────────
    // Instead of calling Google SDK directly here, we call our backend
    // which has the API key and logic.
    let parsed: any;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/ai-assistant/extract-filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Backend extraction failed')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'AI extraction failed')
      }

      parsed = result.filters
    } catch (e: any) {
      console.error('AI extraction error:', e)
      return NextResponse.json(
        { error: e.message || 'Failed to process AI request' },
        { status: 502 }
      )
    }

    // ── 3. Not a travel query ───────────────────────────────────────────────
    if (parsed.error === 'not_travel_query') {
      return NextResponse.json({ error: 'not_travel_query' }, { status: 422 })
    }

    // ── 4. Whitelist normalization ──────────────────────────────────────────
    parsed.tripStyle = normalizeArray(parsed.tripStyle, ALLOWED_TRIP_STYLES)
    parsed.activities = normalizeArray(parsed.activities, ALLOWED_ACTIVITIES)

    return NextResponse.json({ filters: parsed })
  } catch (err: any) {
    console.error('AI search error:', err)
    const isQuota = err?.status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED')
    return NextResponse.json(
      {
        error: isQuota
          ? 'AI quota exceeded. Please try again in a moment.'
          : (err?.message || 'Failed to process your query. Please try again.')
      },
      { status: isQuota ? 429 : 500 }
    )
  }
}
