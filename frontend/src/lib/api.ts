import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add auth token and domain to requests
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    // Inject current domain for multi-tenancy
    if (typeof window !== 'undefined') {
        // ALLOW OVERRIDE FOR TESTING: Check localStorage first
        const debugDomain = localStorage.getItem('debug_domain');
        // If debug_domain exists, use it. Otherwise use real hostname.
        const hostname = debugDomain || window.location.hostname;

        config.headers['X-Domain'] = hostname;
    }

    return config
})

// Auth API
export const authAPI = {
    login: async (email: string, password: string) => {
        const params = new URLSearchParams()
        params.append('username', email)
        params.append('password', password)

        const response = await api.post('/auth/login', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        return response.data
    },

    googleLogin: async (token: string, role: string = 'customer') => {
        const response = await api.post('/auth/google-login', { token, role })
        return response.data
    },

    register: async (data: {
        email: string
        password: string
        first_name: string
        last_name: string
        phone?: string
    }) => {
        const response = await api.post('/auth/register', data)
        return response.data
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/me')
        return response.data
    },

    getPublicAgentInfo: async () => {
        const response = await api.get('/auth/agent-info')
        return response.data
    },

    forgotPassword: async (email: string) => {
        const response = await api.post('/auth/forgot-password', { email })
        return response.data
    },

    verifyOTP: async (email: string, otp: string) => {
        const response = await api.post('/auth/verify-otp', { email, otp })
        return response.data
    },

    resetPassword: async (data: {
        token: string
        email: string
        new_password: string
        confirm_password: string
    }) => {
        const response = await api.post('/auth/reset-password', data)
        return response.data
    },

    // Agent Login OTP Methods
    sendLoginOTP: async (email: string, password: string) => {
        const response = await api.post('/auth/send-login-otp', { email, password })
        return response.data
    },

    verifyLoginOTP: async (email: string, otp: string) => {
        const response = await api.post('/auth/verify-login-otp', { email, otp })
        return response.data
    },
}

// Packages API
export const packagesAPI = {
    getAll: async (params?: {
        destination?: string
        category?: string
        min_price?: number
        max_price?: number
        search?: string
        page?: number
        page_size?: number
    }) => {
        const response = await api.get('/packages', { params })
        return response.data
    },

    getById: async (id: string) => {
        const response = await api.get(`/packages/${id}`)
        return response.data
    },
}

// Bookings API
export const bookingsAPI = {
    create: async (data: {
        package_id: string
        travel_date: string
        number_of_travelers: number
        travelers: Array<{
            first_name: string
            last_name: string
            date_of_birth: string
            gender: string
            passport_number?: string
            nationality: string
            is_primary: boolean
        }>
        special_requests?: string
    }) => {
        const response = await api.post('/bookings', data)
        return response.data
    },

    getAll: async () => {
        const response = await api.get('/bookings')
        return response.data
    },

    getAgentBookings: async () => {
        const response = await api.get('/agent/bookings')
        return response.data
    },

    getById: async (id: string) => {
        const response = await api.get(`/bookings/${id}`)
        return response.data
    },

    cancel: async (id: string) => {
        const response = await api.put(`/bookings/${id}/cancel`)
        return response.data
    },

    downloadInvoice: async (id: string) => {
        const response = await api.get(`/bookings/${id}/invoice`, {
            responseType: 'blob',
        })
        return response.data
    },
}

// Payments API
export const paymentsAPI = {
    createOrder: async (booking_id: string) => {
        const response = await api.post('/payments/create-order', { booking_id })
        return response.data
    },

    verifyPayment: async (data: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
    }) => {
        const response = await api.post('/payments/verify', data)
        return response.data
    },
}

// Tours API (Amadeus Integration)
export const toursAPI = {
    search: async (destination: string, radius: number = 50) => {
        const response = await api.get('/tours/search', {
            params: { destination, radius }
        })
        return response.data
    },

    getActivityDetails: async (activityId: string) => {
        const response = await api.get(`/tours/activity/${activityId}`)
        return response.data
    }
}

// Flights API (TripJack Integration)
export const flightsAPI = {
    search: async (params: any) => {
        const response = await api.get('/flights/search', { params })
        return response.data
    },

    searchAirports: async (query: string) => {
        const response = await api.get('/flights/airports/search', {
            params: { query }
        })
        return response.data
    }
}

// Enhanced Packages API (with itinerary support)
export const packagesEnhancedAPI = {
    searchByDestination: async (destination: string, limit: number = 10) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const headers: HeadersInit = {}
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(
            `${API_URL}/api/v1/packages/search?destination=${encodeURIComponent(destination)}&limit=${limit}`,
            { headers }
        )
        if (!response.ok) throw new Error('Failed to search packages')
        return response.json()
    },

    getWithItinerary: async (packageId: string) => {
        const response = await fetch(`${API_URL}/api/v1/packages/${packageId}/itinerary`)
        if (!response.ok) throw new Error('Failed to fetch package details')
        return response.json()
    },

    addItineraryItem: async (packageId: string, itemData: any, token: string) => {
        const response = await fetch(`${API_URL}/api/v1/packages/${packageId}/itinerary-items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(itemData)
        })
        if (!response.ok) throw new Error('Failed to add itinerary item')
        return response.json()
    }
}

// Custom Bookings API
export const bookingsCustomAPI = {
    createWithCustomizations: async (bookingData: any) => {
        const response = await api.post('/bookings-custom', bookingData)
        return response.data
    },

    getWithCustomizations: async (bookingId: string) => {
        const response = await api.get(`/bookings-custom/${bookingId}`)
        return response.data
    }
}

// Trip Planner API
export const tripPlannerAPI = {
    getUserSessions: async () => {
        const response = await api.get('/trip-planner/user-sessions')
        return response.data
    },
    deleteSession: async (sessionId: string) => {
        const response = await api.delete(`/trip-planner/session/${sessionId}`)
        return response.data
    }
}

// Activities API
export const activitiesAPI = {
    getAll: async (params?: { city?: string; category?: string }) => {
        const response = await api.get('/activities', { params })
        return response.data
    },

    getDestinations: async () => {
        const response = await api.get('/activities/destinations')
        return response.data
    },

    create: async (data: any) => {
        const response = await api.post('/activities', data)
        return response.data
    },

    getById: async (id: string) => {
        const response = await api.get(`/activities/${id}`)
        return response.data
    },

    update: async (id: string, data: any) => {
        const response = await api.put(`/activities/${id}`, data)
        return response.data
    },

    delete: async (id: string) => {
        const response = await api.delete(`/activities/${id}`)
        return response.data
    },

    deleteDestination: async (city: string) => {
        const response = await api.delete(`/activities/destination/${city}`)
        return response.data
    }
}

export default api