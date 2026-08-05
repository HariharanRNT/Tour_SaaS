import PackagesClient from './PackagesClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Package Management',
    description: 'Create and manage tour packages',
};

export default function AdminPackagesPage() {
    return <PackagesClient />;
}
