import AdminDashboardClient from './AdminDashboardClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Dashboard',
    description: 'System Administrator Portal',
};

export default function AdminDashboardPage() {
    return <AdminDashboardClient />;
}
