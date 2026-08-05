import HomeClient from './HomeClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Tour Packages & Travel Agency',
    description: 'Plan, customize, and book your dream trip effortlessly.',
};

export default function HomePage({ searchParams }: { searchParams: { site?: string } }) {
    return <HomeClient searchParams={searchParams} />;
}
