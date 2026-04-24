import { Suspense } from 'react'
import BuildTripClient from './BuildTripClient'
import { Metadata, ResolvingMetadata } from 'next'
import { cookies } from 'next/headers'
import { API_URL } from '@/lib/api'

type Props = {
    params: { slug: string }
    searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = params

    // Default fallback metadata
    let title = 'Plan Your Dream Vacation | TourSaaS'
    let description = 'Plan your perfect trip with our AI-powered itinerary builder. Discover amazing destinations and create unforgettable memories.'
    let keywords = 'tour package, trip planner, vacation, travel'
    let featureImage = ''

    try {
        // Fetch package data by slug for SEO metadata
        const res = await fetch(`${API_URL}/api/v1/packages/slug/${slug}`, {
            next: { revalidate: 0 } // Always fetch fresh metadata
        });

        if (res.ok) {
            const pkg = await res.json();

            if (pkg) {
                title = pkg.meta_title || `${pkg.title || 'Tour Package'} | TourSaaS`
                description = pkg.meta_description || pkg.description?.substring(0, 160) || description
                keywords = pkg.meta_keywords || keywords
                featureImage = pkg.feature_image_url || ''
            }
        }
    } catch (error) {
        console.error('Error fetching package metadata:', error)
    }

    return {
        title,
        description,
        keywords,
        openGraph: {
            title,
            description,
            type: 'website',
            siteName: 'TourSaaS',
            ...(featureImage ? { images: [featureImage] } : {})
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            ...(featureImage ? { images: [featureImage] } : {})
        }
    }
}

export default function Page({ params }: Props) {
    // Pass slug to client so it can load the package if no session exists
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading trip details...</div>}>
            <BuildTripClient slug={params.slug} />
        </Suspense>
    )
}
