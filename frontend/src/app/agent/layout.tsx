import { RoleGuard } from "@/components/auth/role-guard"

export default function AgentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <RoleGuard allowedRoles={['agent', 'AGENT']}>
            {children}
        </RoleGuard>
    )
}
