import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: '--font-jakarta' });

export const metadata: Metadata = {
    title: "TourSaaS - Book Your Dream Vacation",
    description: "Discover and book amazing tour packages worldwide",
};

import { Providers } from "@/components/Providers";

// ...

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} ${jakarta.variable}`}>
                <Providers>
                    <Navbar />
                    <main className="min-h-screen bg-gray-50">
                        {children}
                    </main>
                    <Footer />
                    <ToastContainer position="top-right" autoClose={3000} />
                </Providers>
            </body>
        </html>
    );
}
