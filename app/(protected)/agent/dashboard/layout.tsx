import { ReactNode } from 'react';

interface AgentDashboardLayoutProps {
  children: ReactNode;
}

export default function AgentDashboardLayout({ children }: AgentDashboardLayoutProps) {
  return <div className="flex min-h-screen flex-col">{children}</div>;
}
