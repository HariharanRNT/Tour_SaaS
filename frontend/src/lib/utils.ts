import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount)
}

export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric' }).format(new Date(date))
}

export function formatDuration(days: number): string {
    const d = Math.max(1, days || 1);
    const n = d - 1;
    return `${n}N/${d}D`;
}

export function formatError(err: any): string {
    if (typeof err === 'string') return err;
    
    // Handle Pydantic/FastAPI validation errors
    const detail = err?.response?.data?.detail || err?.detail || err;
    if (Array.isArray(detail)) {
        // Return the first error message or join them
        return detail.map((d: any) => d.msg || d).join(', ');
    }
    
    if (typeof detail === 'string') return detail;
    
    return err?.message || 'An unexpected error occurred';
}

import { API_URL } from "./api"

/**
 * Ensures an image URL is absolute by prefixing relative paths with API_URL
 */
export function resolveImageUrl(path: string | null | undefined): string {
    if (!path) return "/placeholder.jpg"
    
    // If it's already an absolute URL, return as is
    if (path.startsWith('http')) return path
    
    // Ensure API_URL is defined
    const base = API_URL || 'http://localhost:8000'
    
    // Prefix relative path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${base}${normalizedPath}`
}
/**
 * Checks if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
    if (!url) return false
    try {
        const parsed = new URL(url)
        return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
        return false
    }
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
export const NAME_REGEX = /^[a-zA-Z\s\-']+$/

export function decodeHtmlEntities(text: string | null | undefined): string {
    if (!text) return '';
    
    let current = text;
    let decoded = '';
    
    // Run recursive unescaping (up to 10 iterations) to handle multi-nested entities (e.g., &amp;amp;amp;)
    for (let i = 0; i < 10; i++) {
        if (typeof document !== 'undefined') {
            try {
                const textarea = document.createElement('textarea');
                textarea.innerHTML = current;
                decoded = textarea.value;
            } catch (e) {
                decoded = current
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&#x27;/g, "'")
                    .replace(/&rsquo;/g, "'")
                    .replace(/&lsquo;/g, "'")
                    .replace(/&ndash;/g, '-')
                    .replace(/&mdash;/g, '—')
                    .replace(/&nbsp;/g, ' ');
            }
        } else {
            decoded = current
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&#x27;/g, "'")
                .replace(/&rsquo;/g, "'")
                .replace(/&lsquo;/g, "'")
                .replace(/&ndash;/g, '-')
                .replace(/&mdash;/g, '—')
                .replace(/&nbsp;/g, ' ');
        }
        
        if (decoded === current) {
            break;
        }
        current = decoded;
    }
    
    return current;
}
