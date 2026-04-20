import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export interface AIFilters {
  destination: string | null
  country: string | null
  minBudget: number | null
  maxBudget: number | null
  minDays: number | null
  maxDays: number | null
  nights: number | null
  tripStyle: string[]
  activities: string[]
  packageType: 'single_city' | 'multi_city' | null
  travelMonth: string | null
  groupSize: number | null
}

export interface AIMeta {
  originalQuery: string
  travelMonth: string | null
  groupSize: number | null
}

/**
 * Calls the /api/ai-search endpoint to parse a natural-language travel query
 * into structured filter params, then pushes to /plan-trip with those params.
 *
 * @param userQuery  The raw text typed by the user
 * @param router     Next.js router instance (from useRouter)
 * @throws string    User-visible error message
 */
export async function parseAISearchAndRedirect(
  userQuery: string,
  router: AppRouterInstance
): Promise<void> {
  const res = await fetch('/api/ai-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: userQuery })
  })

  const data = await res.json()

  // ── Handle API-level errors ─────────────────────────────────────────────
  if (!res.ok || data.error) {
    if (data.error === 'not_travel_query') {
      throw 'Please describe a travel plan (e.g. "Beach trip to Goa for 5 days under ₹30,000").'
    }
    throw data.error || 'Failed to process your query. Please try again.'
  }

  const filters: AIFilters = data.filters

  // ── Build URL query params ──────────────────────────────────────────────
  const params = new URLSearchParams()
  params.set('search', 'all')

  if (filters.destination) params.set('destination', filters.destination)
  if (filters.country && !filters.destination) params.set('country', filters.country)
  if (filters.country) params.set('country', filters.country)
  if (filters.minBudget != null) params.set('minPrice', String(filters.minBudget))
  if (filters.maxBudget != null) params.set('maxPrice', String(filters.maxBudget))
  if (filters.minDays != null) params.set('minDays', String(filters.minDays))
  if (filters.maxDays != null) params.set('maxDays', String(filters.maxDays))

  // Arrays — repeat the key (proper URL encoding)
  filters.tripStyle?.forEach(ts => params.append('tripStyle', ts))
  filters.activities?.forEach(act => params.append('activities', act))

  if (filters.packageType) params.set('packageType', filters.packageType)
  if (filters.travelMonth) params.set('month', filters.travelMonth)
  if (filters.groupSize != null) params.set('groupSize', String(filters.groupSize))

  // Encoded original query so the banner can display it
  params.set('aiQuery', encodeURIComponent(userQuery.slice(0, 120)))

  router.push(`/plan-trip?${params.toString()}`)
}
