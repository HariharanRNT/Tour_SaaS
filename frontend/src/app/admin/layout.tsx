import AdminLayoutClient from './AdminLayoutClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Portal',
    description: 'System Administrator Portal',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
