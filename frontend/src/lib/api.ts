import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json' } })

// Add auth token and domain to requests
api.interceptors.request.use((config) => {
    let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    // Sanity check: If token is string "null" or "undefined", treat as null
    if (token === 'null' || token === 'undefined') {
        token = null
    }

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

// Add response interceptor to handle 401s
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                // Avoid infinite redirect if already on login
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login'
                }
            }
        }
        return Promise.reject(error)
    }
)

// Auth API
export const authAPI = {
    login: async (email: string, password: string) => {
        const params = new URLSearchParams()
        params.append('username', email)
        params.append('password', password)

        const response = await api.post('/auth/login', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
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
    } }

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
    } }

// Flat named exports as requested
export const fetchDashboardStats = async (filter_type: string = 'ALL') => {
    const response = await api.get('/admin-simple/dashboard-stats', {
        params: { filter_type }
    })
    return response.data
}

export const fetchAgents = async (status: string = 'all') => {
    const params = status !== 'all' ? { status } : {}
    const response = await api.get('/admin/agents', { params })
    return response.data
}

export const createAgent = async (data: any) => {
    const response = await api.post('/admin/agents', data)
    return response.data
}

export const updateAgent = async (id: string, data: any) => {
    const response = await api.put(`/admin/agents/${id}`, data)
    return response.data
}

export const deleteAgent = async (id: string) => {
    const response = await api.delete(`/admin/agents/${id}`)
    return response.data
}

export const approveAgent = async (id: string) => {
    const response = await api.patch(`/admin/agents/${id}/approve`)
    return response.data
}

export const rejectAgent = async (id: string, reason: string = "") => {
    const response = await api.patch(`/admin/agents/${id}/reject`, { reason })
    return response.data
}

export const updateAgentStatus = async (id: string, is_active: boolean) => {
    const response = await api.patch(`/admin/agents/${id}/status`, null, {
        params: { is_active }
    })
    return response.data
}

export const bulkDeleteAgents = async (ids: string[]) => {
    const response = await api.post('/admin/agents/bulk-delete', { ids });
    return response.data;
};

export const bulkUpdateAgentsStatus = async (ids: string[], is_active: boolean) => {
    const response = await api.post('/admin/agents/bulk-status', { ids, is_active });
    return response.data;
};

export const fetchPackagesSimple = async () => {
    const response = await api.get('/admin-simple/packages-simple')
    return response.data
}

export const deletePackageSimple = async (id: string) => {
    const response = await api.delete(`/admin-simple/packages-simple/${id}`)
    return response.data
}

export const updatePackageStatus = async (id: string, new_status: string) => {
    const response = await api.patch(`/admin/packages/${id}/status`, null, {
        params: { new_status }
    })
    return response.data
}

// Agent Packages API
export const fetchAgentPackages = async (params: any) => {
    const response = await api.get('/agent/packages', { params })
    return response.data
}

export const deleteAgentPackage = async (id: string) => {
    const response = await api.delete(`/agent/packages/${id}`)
    return response.data
}

export const updateAgentPackageStatus = async (id: string, new_status: string) => {
    const response = await api.patch(`/agent/packages/${id}/status`, null, {
        params: { new_status }
    })
    return response.data
}

export const fetchAgentDashboardStats = async (params: any) => {
    const response = await api.get('/agent-dashboard/stats', { params })
    return response.data
}

// AI Assistant API
export const sendAIChatMessage = async (data: { message: string, conversation_id: string | null }) => {
    const response = await api.post('/ai-assistant/chat', data)
    return response.data
}

export const generateAIPackage = async (conversation_id: string) => {
    const response = await api.post('/ai-assistant/generate-package', { conversation_id })
    return response.data
}

export const fetchAdminPlans = async () => {
    const response = await api.get('/subscriptions/admin/plans')
    return response.data
}

export const fetchAdminSubscriptions = async () => {
    const response = await api.get('/subscriptions/admin/subscriptions')
    return response.data
}

export const createSubscriptionPlan = async (data: any) => {
    const response = await api.post('/subscriptions/plans', data)
    return response.data
}

export const updateSubscriptionPlan = async (id: string, data: any) => {
    const response = await api.put(`/subscriptions/plans/${id}`, data)
    return response.data
}

export const deleteSubscriptionPlan = async (id: string) => {
    const response = await api.delete(`/subscriptions/plans/${id}`)
    return response.data
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

    getAgentBookings: async (params?: any) => {
        const response = await api.get('/agent/bookings', { params })
        return response.data
    },

    getById: async (id: string) => {
        const response = await api.get(`/bookings/${id}`)
        return response.data
    },

    cancel: async (id: string) => {
        const response = await api.post(`/bookings/${id}/cancel`)
        return response.data
    },

    getCancelPreview: async (id: string) => {
        const response = await api.get(`/bookings/${id}/cancel-preview`)
        return response.data
    },

    downloadInvoice: async (id: string) => {
        const response = await api.get(`/bookings/${id}/invoice`, {
            responseType: 'blob'
        })
        return response.data
    },

    confirm: async (id: string, data: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
    }) => {
        const response = await api.post(`/bookings/${id}/confirm`, data)
        return response.data
    }
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
    } }

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
    getSession: async (sessionId: string) => {
        const response = await api.get(`/trip-planner/session/${sessionId}`)
        return response.data
    },
    deleteSession: async (sessionId: string) => {
        const response = await api.delete(`/trip-planner/session/${sessionId}`)
        return response.data
    }
}

// Activities API
export const activitiesAPI = {
    getAll: async (params?: { city?: string; category?: string; search?: string }) => {
        const response = await api.get('/activities', { params })
        return response.data
    },

    getDestinations: async (params?: { page?: number; limit?: number; search?: string }) => {
        const response = await api.get('/activities/destinations', { params })
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
    },

    saveDestinationMetadata: async (data: {
        name: string
        country: string
        image_url?: string
        description?: string
    }) => {
        const response = await api.post('/activities/destinations/metadata', data)
        return response.data
    },

    updateDestinationMetadata: async (oldName: string, data: {
        name?: string
        country?: string
        image_url?: string
        description?: string
    }) => {
        const response = await api.put(`/activities/destination/${encodeURIComponent(oldName)}`, data)
        return response.data
    }
}

// Agent Settings API
export const fetchAgentSettings = async () => {
    const response = await api.get('/agent/settings')
    return response.data
}

export const updateAgentSettingsGeneral = async (data: any) => {
    const response = await api.put('/agent/settings/general', data)
    return response.data
}

export const updateAgentSettingsSmtp = async (data: any) => {
    const response = await api.put('/agent/settings/smtp', data)
    return response.data
}

export const updateAgentSettingsRazorpay = async (data: any) => {
    const response = await api.put('/agent/settings/razorpay', data)
    return response.data
}

export const testSmtpSettings = async (data: any) => {
    const response = await api.post('/agent/settings/smtp/test', data)
    return response.data
}

export const fetchAdminNotifications = async () => {
    const response = await api.get('/admin/notifications')
    return response.data
}

export const markNotificationAsRead = async (id: string) => {
    const response = await api.patch(`/admin/notifications/${id}/read`)
    return response.data
}

export const deleteNotification = async (id: string) => {
    const response = await api.delete(`/admin/notifications/${id}`)
    return response.data
}

// Agent Notifications API
export const fetchAgentNotifications = async () => {
    const response = await api.get('/agent/notifications')
    return response.data
}

export const markAgentNotificationAsRead = async (id: string) => {
    const response = await api.patch(`/agent/notifications/${id}/read`)
    return response.data
}

export const deleteAgentNotification = async (id: string) => {
    const response = await api.delete(`/agent/notifications/${id}`)
    return response.data
}

// Agent Reports API
export const agentReportsAPI = {
    getSummary: async (params: { period: string; start_date?: string; end_date?: string }) => {
        const response = await api.get('/agent/reports/summary', { params })
        return response.data
    },
    getCharts: async (params: { period: string; start_date?: string; end_date?: string }) => {
        const response = await api.get('/agent/reports/charts', { params })
        return response.data
    },
    getPackagePerformance: async (params: { 
        period: string; 
        start_date?: string; 
        end_date?: string;
        page?: number;
        limit?: number;
        sort_by?: string;
        sort_dir?: 'asc' | 'desc';
    }) => {
        const response = await api.get('/agent/reports/packages', { params })
        return response.data
    },
    getFinancialReports: async (params: { period: string; start_date?: string; end_date?: string }) => {
        const response = await api.get('/agent/reports/financial', { params })
        return response.data
    }
}

export default api