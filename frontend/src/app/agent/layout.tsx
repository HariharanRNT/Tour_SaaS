import AgentLayoutClient from './AgentLayoutClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Agent Portal',
    description: 'Travel Agent Portal',
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
    return <AgentLayoutClient>{children}</AgentLayoutClient>;
}
