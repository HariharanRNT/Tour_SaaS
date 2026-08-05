import AboutClient from './AboutClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Us',
    description: 'Learn more about our agency and our mission.',
};

export default function AboutPage() {
    return <AboutClient />;
}
