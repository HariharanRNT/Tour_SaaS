/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        // If you are exporting statically for IIS (output: 'export'), 
        // you MUST add `unoptimized: true` because Next.js's default image optimization requires a Node.js server.
        // unoptimized: true,
        
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'toursaas1.s3.ap-southeast-2.amazonaws.com' },
            { protocol: 'https', hostname: 'toursaas.s3.us-east-1.amazonaws.com' },
            { protocol: 'https', hostname: 'upload.wikimedia.org' },
            { protocol: 'https', hostname: '**.trycloudflare.com' },
            { protocol: 'http', hostname: 'localhost' },
            { protocol: 'https', hostname: 'i.pravatar.cc' },
            { protocol: 'https', hostname: 'cdn-icons-png.flaticon.com' },
            { protocol: 'https', hostname: 'images.holibob.tech' },
        ],
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    },
    allowedDevOrigins: ['abc.local:3000', 'rnt.local:3000', 'abc.local', 'rnt.local', 'localhost:3000'],
    eslint: {
        ignoreDuringBuilds: true,
    },
    
    // For hosting purely on IIS without a Node.js proxy, you will need to add this:
    // output: 'export',

    // Note: `allowedDevOrigins` is not a standard Next.js configuration property. 
    // If you meant to allow Server Actions from specific origins, it should be under experimental:
    /*
    experimental: {
        serverActions: {
            allowedOrigins: ['rnt.local', 'localhost:3000'],
        }
    }
    */
}

module.exports = nextConfig
