import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "TourSaaS - Book Your Dream Vacation",
    description: "Discover and book amazing tour packages worldwide",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Navbar />
                <main className="min-h-screen bg-gray-50">
                    {children}
                </main>
                <footer className="border-t bg-white py-8">
                    <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                        © 2026 RNT TourSaaS. All rights reserved.
                    </div>
                </footer>
                <ToastContainer position="top-right" autoClose={3000} />
            </body>
        </html>
    );
}
