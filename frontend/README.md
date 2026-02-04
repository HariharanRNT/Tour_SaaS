# Tour SaaS Frontend

Next.js 14 frontend for the Tour SaaS B2C booking platform.

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Authentication (Login/Register)
- ✅ Package Browsing
- ✅ Package Details
- ✅ Booking Flow
- ✅ User Dashboard
- ✅ Responsive Design

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_1234567890
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Homepage
│   │   ├── login/              # Login page
│   │   ├── register/           # Register page
│   │   ├── packages/           # Package listing & details
│   │   └── bookings/           # User bookings
│   ├── components/
│   │   ├── ui/                 # UI components
│   │   └── Navbar.tsx          # Navigation
│   ├── lib/
│   │   ├── api.ts              # API client
│   │   └── utils.ts            # Utilities
│   └── types/
│       └── index.ts            # TypeScript types
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## API Integration

The frontend connects to the FastAPI backend running on `http://localhost:8000`.

### Available Endpoints

- **Auth**: `/api/v1/auth/login`, `/api/v1/auth/register`
- **Packages**: `/api/v1/packages`
- **Bookings**: `/api/v1/bookings`
- **Payments**: `/api/v1/payments`

## Test Credentials

- **Email**: john.doe@example.com
- **Password**: password123

## Pages

### Homepage (`/`)
- Hero section
- Features showcase
- CTA to browse packages

### Packages (`/packages`)
- List all tour packages
- Search functionality
- Package cards with details

### Package Detail (`/packages/[id]`)
- Full package information
- Itinerary
- Included/Excluded items
- Booking form

### Bookings (`/bookings`)
- List user's bookings
- Booking status
- View details

### Login/Register
- User authentication
- Form validation
- Error handling

## Build for Production

```bash
npm run build
npm start
```

## Deploy to Vercel

```bash
vercel
```

## Technologies

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **State**: React Hooks

## License

MIT
