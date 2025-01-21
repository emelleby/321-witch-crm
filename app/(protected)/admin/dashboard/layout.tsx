import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
