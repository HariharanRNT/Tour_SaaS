import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/MainLayout";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: '--font-jakarta' });
const fraunces = Fraunces({ subsets: ["latin"], variable: '--font-fraunces', display: 'swap' });
const dmSans = DM_Sans({ subsets: ["latin"], variable: '--font-dm-sans', display: 'swap' });

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
            <body className={`${dmSans.className} ${fraunces.variable} ${dmSans.variable} ${inter.variable} ${jakarta.variable}`}>
                <Providers>
                    <MainLayout>
                        {children}
                    </MainLayout>
                    <ToastContainer position="top-right" autoClose={3000} />
                </Providers>
            </body>
        </html>
    );
}
