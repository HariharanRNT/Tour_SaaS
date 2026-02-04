export interface PackageItineraryItem {
    id: string
    day_number: number
    time_slot: string | null
    title: string
    description: string
    activities: string[]
    display_order: number
}

export interface PackageDayItinerary {
    day_number: number
    morning: PackageItineraryItem[]
    afternoon: PackageItineraryItem[]
    evening: PackageItineraryItem[]
    night: PackageItineraryItem[]
    unassigned: PackageItineraryItem[]
}

export interface PackageWithItinerary {
    id: string
    title: string
    destination: string
    duration_days: number
    price_per_person: number
    description: string
    itinerary_by_day: PackageDayItinerary[]
}

export interface BookingCustomization {
    day_number: number
    time_slot?: string
    activity_title: string
    activity_description?: string
    activity_price?: number
    is_removed: boolean
    is_custom: boolean
    original_item_id?: string
    display_order?: number
}

export interface BookingWithCustomizations {
    package_id: string
    travel_date: string
    number_of_travelers: number
    customizations: BookingCustomization[]
}
