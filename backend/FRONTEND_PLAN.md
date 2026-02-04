# Tour SaaS Frontend - Next.js Implementation Plan

## Project Overview

This document outlines the frontend implementation for the Tour SaaS B2C portal using **Next.js 14** with **App Router**, **TypeScript**, and **Tailwind CSS**. The frontend will consume the FastAPI backend REST API.

---

## Technology Stack

### Core Framework
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5+
- **Runtime**: Node.js 18+

### Styling & UI
- **CSS Framework**: Tailwind CSS 3+
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Fonts**: Google Fonts (Inter, Outfit)

### State Management
- **Server State**: TanStack Query (React Query)
- **Client State**: React Context API / Zustand (if needed)
- **Forms**: React Hook Form
- **Validation**: Zod

### Data Fetching
- **HTTP Client**: Axios
- **API Integration**: Custom API client with interceptors

### Payment Integration
- **Payment Gateway**: Razorpay Checkout (client-side)
- **SDK**: razorpay-checkout.js (CDN)

### Date & Time
- **Date Library**: date-fns
- **Calendar**: react-day-picker

### Image Optimization
- **Image Component**: Next.js Image (built-in)
- **Image Gallery**: yet-another-react-lightbox

### SEO & Analytics
- **Meta Tags**: Next.js Metadata API
- **Analytics**: Vercel Analytics / Google Analytics
- **Sitemap**: next-sitemap

### Development Tools
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode

---

## Project Structure

```
tour-saas-frontend/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth layout group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   │
│   ├── (main)/                 # Main layout group
│   │   ├── layout.tsx          # Main layout with header/footer
│   │   ├── page.tsx            # Homepage
│   │   ├── packages/
│   │   │   ├── page.tsx        # Package listing
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Package detail
│   │   ├── booking/
│   │   │   └── [packageId]/
│   │   │       └── page.tsx    # Booking flow
│   │   ├── profile/
│   │   │   ├── page.tsx        # User profile
│   │   │   └── bookings/
│   │   │       └── page.tsx    # Booking history
│   │   └── about/
│   │       └── page.tsx
│   │
│   ├── admin/                  # Admin dashboard
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Dashboard home
│   │   ├── packages/
│   │   │   ├── page.tsx        # Package management
│   │   │   ├── create/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   ├── bookings/
│   │   │   └── page.tsx
│   │   └── users/
│   │       └── page.tsx
│   │
│   ├── api/                    # API routes (if needed)
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   │
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Global styles
│   └── not-found.tsx           # 404 page
│
├── components/                 # Reusable components
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   ├── layout/                 # Layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileNav.tsx
│   │
│   ├── packages/               # Package-related components
│   │   ├── PackageCard.tsx
│   │   ├── PackageGrid.tsx
│   │   ├── PackageFilters.tsx
│   │   ├── PackageDetail.tsx
│   │   └── ItineraryTimeline.tsx
│   │
│   ├── booking/                # Booking components
│   │   ├── BookingForm.tsx
│   │   ├── TravelerForm.tsx
│   │   ├── BookingSummary.tsx
│   │   └── PaymentForm.tsx
│   │
│   ├── auth/                   # Auth components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   └── common/                 # Common components
│       ├── SearchBar.tsx
│       ├── DatePicker.tsx
│       ├── ImageUpload.tsx
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
│
├── lib/                        # Utility libraries
│   ├── api/                    # API client
│   │   ├── client.ts           # Axios instance
│   │   ├── auth.ts             # Auth API calls
│   │   ├── packages.ts         # Package API calls
│   │   ├── bookings.ts         # Booking API calls
│   │   └── payments.ts         # Payment API calls
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePackages.ts
│   │   ├── useBookings.ts
│   │   └── useRazorpay.ts
│   │
│   ├── utils/                  # Utility functions
│   │   ├── format.ts           # Formatting helpers
│   │   ├── validation.ts       # Validation schemas
│   │   └── constants.ts        # App constants
│   │
│   └── context/                # React contexts
│       └── AuthContext.tsx
│
├── types/                      # TypeScript types
│   ├── api.ts                  # API response types
│   ├── package.ts
│   ├── booking.ts
│   ├── user.ts
│   └── payment.ts
│
├── public/                     # Static assets
│   ├── images/
│   ├── icons/
│   └── favicon.ico
│
├── .env.local                  # Environment variables
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Key Pages & Components

### 1. Homepage (`app/(main)/page.tsx`)
- Hero section with search bar
- Featured packages grid
- Destination highlights
- Customer testimonials
- Call-to-action sections

### 2. Package Listing (`app/(main)/packages/page.tsx`)
- Filter sidebar (destination, price, duration)
- Package grid with cards
- Pagination
- Sort options
- Search functionality

### 3. Package Detail (`app/(main)/packages/[id]/page.tsx`)
- Image gallery
- Package overview
- Day-by-day itinerary
- Inclusions/exclusions
- Pricing details
- Availability calendar
- Book now button

### 4. Booking Flow (`app/(main)/booking/[packageId]/page.tsx`)
**Multi-step form:**
- Step 1: Select date and travelers
- Step 2: Traveler information
- Step 3: Review and payment
- Step 4: Confirmation

### 5. Admin Dashboard (`app/admin/page.tsx`)
- Overview metrics (bookings, revenue)
- Recent bookings table
- Quick actions
- Charts and graphs

### 6. Package Management (`app/admin/packages/page.tsx`)
- Package list table
- Create/edit/delete actions
- Search and filters
- Status management

---

## API Integration

### API Client Setup
```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Package API
```typescript
// lib/api/packages.ts
import apiClient from './client';
import { Package, PackageListResponse } from '@/types/package';

export const packageApi = {
  getAll: async (params?: {
    destination?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
  }): Promise<PackageListResponse> => {
    const { data } = await apiClient.get('/packages', { params });
    return data;
  },

  getById: async (id: string): Promise<Package> => {
    const { data } = await apiClient.get(`/packages/${id}`);
    return data;
  },

  create: async (packageData: Partial<Package>): Promise<Package> => {
    const { data } = await apiClient.post('/packages', packageData);
    return data;
  },

  update: async (id: string, packageData: Partial<Package>): Promise<Package> => {
    const { data } = await apiClient.put(`/packages/${id}`, packageData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/packages/${id}`);
  },
};
```

---

## Razorpay Integration (Frontend)

### Razorpay Hook
```typescript
// lib/hooks/useRazorpay.ts
import { useCallback } from 'react';

interface RazorpayOptions {
  amount: number;
  currency: string;
  orderId: string;
  onSuccess: (response: any) => void;
  onFailure: (error: any) => void;
}

export const useRazorpay = () => {
  const openRazorpay = useCallback(({
    amount,
    currency,
    orderId,
    onSuccess,
    onFailure,
  }: RazorpayOptions) => {
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: amount,
      currency: currency,
      name: 'Tour SaaS',
      description: 'Tour Package Booking',
      order_id: orderId,
      handler: function (response: any) {
        onSuccess(response);
      },
      prefill: {
        name: '',
        email: '',
        contact: '',
      },
      theme: {
        color: '#3B82F6',
      },
      modal: {
        ondismiss: function () {
          onFailure(new Error('Payment cancelled'));
        },
      },
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  }, []);

  return { openRazorpay };
};
```

### Payment Component
```typescript
// components/booking/PaymentForm.tsx
'use client';

import { useState } from 'react';
import { useRazorpay } from '@/lib/hooks/useRazorpay';
import { paymentApi } from '@/lib/api/payments';
import { Button } from '@/components/ui/button';

export default function PaymentForm({ bookingId, amount }: Props) {
  const [loading, setLoading] = useState(false);
  const { openRazorpay } = useRazorpay();

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Create Razorpay order
      const order = await paymentApi.createOrder(bookingId);

      // Open Razorpay checkout
      openRazorpay({
        amount: order.amount,
        currency: order.currency,
        orderId: order.order_id,
        onSuccess: async (response) => {
          // Verify payment on backend
          await paymentApi.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          // Redirect to success page
          window.location.href = `/booking/success?ref=${bookingId}`;
        },
        onFailure: (error) => {
          console.error('Payment failed:', error);
          alert('Payment failed. Please try again.');
        },
      });
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handlePayment} disabled={loading}>
      {loading ? 'Processing...' : `Pay ₹${amount}`}
    </Button>
  );
}
```

---

## Authentication Flow

### Auth Context
```typescript
// lib/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/lib/api/auth';
import { User } from '@/types/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    if (token) {
      authApi.getCurrentUser()
        .then(setUser)
        .catch(() => localStorage.removeItem('access_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    localStorage.setItem('access_token', response.access_token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  const register = async (data: RegisterData) => {
    const response = await authApi.register(data);
    localStorage.setItem('access_token', response.access_token);
    setUser(response.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

## Development Phases (Frontend Only)

### Phase 1: Project Setup (Week 1)
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Tailwind CSS
- [ ] Install and configure shadcn/ui
- [ ] Set up project structure
- [ ] Configure ESLint and Prettier
- [ ] Set up environment variables

### Phase 2: Layout & Navigation (Week 2)
- [ ] Create root layout
- [ ] Build header component
- [ ] Build footer component
- [ ] Create mobile navigation
- [ ] Implement responsive design
- [ ] Add loading states

### Phase 3: Authentication UI (Week 3)
- [ ] Create login page
- [ ] Create registration page
- [ ] Create forgot password page
- [ ] Implement auth context
- [ ] Build protected route wrapper
- [ ] Add form validation

### Phase 4: Package Pages (Week 4)
- [ ] Create homepage with featured packages
- [ ] Build package listing page
- [ ] Create package detail page
- [ ] Implement search functionality
- [ ] Add filter sidebar
- [ ] Create image gallery component

### Phase 5: Booking Flow (Week 5)
- [ ] Create booking page
- [ ] Build multi-step form
- [ ] Create traveler form
- [ ] Implement date picker
- [ ] Add booking summary
- [ ] Create confirmation page

### Phase 6: Payment Integration (Week 6)
- [ ] Integrate Razorpay SDK
- [ ] Create payment form component
- [ ] Implement payment flow
- [ ] Add payment success/failure pages
- [ ] Test payment integration

### Phase 7: Admin Dashboard (Week 7)
- [ ] Create admin layout
- [ ] Build dashboard overview
- [ ] Create package management UI
- [ ] Build booking management UI
- [ ] Add user management UI
- [ ] Implement admin authentication

### Phase 8: Testing & Deployment (Week 8)
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Deploy to Vercel
- [ ] Configure custom domain

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Deployment (Vercel)

### Deployment Steps
1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy

### Vercel Configuration
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "pnpm install"
}
```

---

## Performance Optimization

- Use Next.js Image component for optimized images
- Implement lazy loading for components
- Use React Query for caching API responses
- Enable static generation for public pages
- Minimize bundle size with code splitting
- Use CDN for static assets

---

## SEO Optimization

- Dynamic meta tags for each page
- Structured data (JSON-LD)
- Sitemap generation
- Robots.txt configuration
- Open Graph tags for social sharing
- Canonical URLs

---

## Next Steps

1. Review and approve this frontend implementation plan
2. Set up Next.js project
3. Begin Phase 1 implementation
4. Coordinate with backend team for API integration
