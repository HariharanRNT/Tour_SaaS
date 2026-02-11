export interface User {
    id: string
    email: string
    first_name: string
    last_name: string
    phone?: string
    role: 'admin' | 'agent' | 'customer'
    email_verified: boolean
    is_active: boolean
    created_at: string
}

export interface Package {
    id: string
    title: string
    slug: string
    description: string
    destination: string
    duration_days: number
    duration_nights: number
    category: string
    price_per_person: number
    max_group_size: number
    included_items: string[]
    excluded_items: string[]
    status: 'draft' | 'published' | 'archived'
    created_at: string
    images: PackageImage[]
    itinerary_items: ItineraryItem[]
    availability: PackageAvailability[]
}

export interface PackageImage {
    id: string
    image_url: string
    display_order: number
    created_at: string
}

export interface ItineraryItem {
    id: string
    day_number: number
    title: string
    description: string
    activities: string[]
    meals_included: string[]
}

export interface PackageAvailability {
    id: string
    available_from: string
    available_to: string
    max_bookings: number
    current_bookings: number
    is_blackout: boolean
}

export interface Booking {
    id: string
    booking_reference: string
    package_id: string
    user_id: string
    travel_date: string
    number_of_travelers: number
    total_amount: number
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
    payment_status: 'pending' | 'succeeded' | 'failed' | 'refunded'
    special_requests?: string
    created_at: string
    travelers: Traveler[]
    package?: Package
}

export interface Traveler {
    id: string
    first_name: string
    last_name: string
    date_of_birth: string
    gender: string
    passport_number?: string
    nationality: string
    is_primary: boolean
}

export interface Payment {
    id: string
    booking_id: string
    razorpay_order_id: string
    razorpay_payment_id?: string
    amount: number
    currency: string
    status: 'pending' | 'succeeded' | 'failed' | 'refunded'
    created_at: string
}

// Itinerary Builder Types
export type TimeSlot = 'morning' | 'evening' | 'full_day'

export interface Activity {
    id: string
    supplier: string
    title: string
    description: string
    price_per_person: number
    currency: string
    duration: string
    duration_days?: number
    duration_nights?: number
    category?: string
    destination?: string
    rating: number;
    reviews_count?: number;
    images: string[];
    location?: {
        latitude: number
        longitude: number
    }
    supplier_reference: string
    booking_link?: string
    max_group_size?: number
    included_items?: string[]
    excluded_items?: string[]
    status?: string
}

export interface AssignedActivity {
    activity: Activity
    timeSlot: TimeSlot
}

export interface ItineraryDay {
    dayNumber: number
    date?: string
    activities: {
        morning?: Activity
        evening?: Activity
        full_day?: Activity
    }
}

export interface Itinerary {
    destination: string
    locationInfo?: {
        city: string
        country: string
        country_code: string
        latitude: number
        longitude: number
        formatted_address: string
    }
    numberOfDays: number
    startDate?: string
    days: ItineraryDay[]
    createdAt: string
    updatedAt: string
}
