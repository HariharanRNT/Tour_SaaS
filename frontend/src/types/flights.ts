

// Flight types
export interface Flight {
    id: string
    airline: string
    airline_code: string
    flight_number: string
    origin: string
    destination: string
    departure_time: string
    arrival_time: string
    duration: string
    duration_minutes: number
    price: number
    base_fare: number
    tax: number
    currency: string
    cabin_class: string
    stops: number
    segments: number
    is_refundable: boolean
    baggage: string
}

export interface FlightSearchParams {
    origin: string
    destination: string
    departure_date: string
    return_date?: string
    adults?: number
    children?: number
    infants?: number
    cabin_class?: string
}
