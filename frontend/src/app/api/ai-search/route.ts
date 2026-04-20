import { GoogleGenerativeAI } from '@google/generative-ai'
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
// System prompt — deterministic JSON extraction
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a travel package filter extraction engine for a tour booking platform.
Your ONLY job is to parse a user's natural-language travel query and return a single valid JSON object — no markdown, no explanation, no extra text, just the raw JSON.

Extract the following fields. Use null for any field not mentioned or unclear:

{
  "destination": string | null,
  "country": string | null,
  "minBudget": number | null,
  "maxBudget": number | null,
  "minDays": number | null,
  "maxDays": number | null,
  "nights": number | null,
  "tripStyle": string[] | null,
  "activities": string[] | null,
  "packageType": "single_city" | "multi_city" | null,
  "travelMonth": string | null,
  "groupSize": number | null
}

Rules:
- If user says "4 days", set minDays=4 and maxDays=4.
- If user says "4-6 days", set minDays=4 and maxDays=6.
- If user says "minimum ₹17000 budget", set minBudget=17000 and maxBudget=null.
- If user says "5-7 nights", set minDays=5 and maxDays=7 (treat nights as days).
- Always return valid JSON. Never return explanatory prose.
- If the entire query is unrelated to travel, return: {"error": "not_travel_query"}`

// ─────────────────────────────────────────────────────────────────────────────
// Safe JSON parsing — handles Gemini's occasional markdown fences / extra text
// ─────────────────────────────────────────────────────────────────────────────
function safeParseJSON(text: string): Record<string, any> {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    // Try to extract by finding the outermost {...}
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (match) {
      return JSON.parse(match[0])
    }
    throw new Error('Invalid AI response — could not extract JSON')
  }
}

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

    // ── 2. Gemini API key check ─────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    // ── 3. Call Gemini ──────────────────────────────────────────────────────
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: geminiModel,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      }
    })

    const result = await model.generateContent(query)
    const rawText = result.response.text()

    // ── 4. Safe parse ───────────────────────────────────────────────────────
    let parsed: Record<string, any>
    try {
      parsed = safeParseJSON(rawText)
    } catch (e) {
      console.error('JSON parse failed:', rawText)
      return NextResponse.json(
        { error: 'AI returned an unreadable response. Please try again.' },
        { status: 502 }
      )
    }

    // ── 5. Not a travel query ───────────────────────────────────────────────
    if (parsed.error === 'not_travel_query') {
      return NextResponse.json({ error: 'not_travel_query' }, { status: 422 })
    }

    // ── 6. Whitelist normalization ──────────────────────────────────────────
    parsed.tripStyle = normalizeArray(parsed.tripStyle, ALLOWED_TRIP_STYLES)
    parsed.activities = normalizeArray(parsed.activities, ALLOWED_ACTIVITIES)

    // ── 7. Budget per-person normalization ──────────────────────────────────
    // Our packages show price_per_person, so if groupSize is given,
    // divide budgets so filters match correctly.
    // Strategy: keep budget as-is (per package) since plan-trip filters
    // compare against price_per_person. Group-size division is optional.
    // We explicitly do NOT divide here — prices on the platform are per-person already.
    // Store groupSize for banner display.

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
