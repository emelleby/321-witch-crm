'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.organization_id) {
        setLoading(false);
        return;
      }

      // If they already have an organization, redirect to dashboard
      if (profile.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (profile.role === 'agent') {
        router.push('/agent/dashboard');
      } else if (profile.role === 'customer') {
        router.push('/customer/dashboard');
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return <main className="container mx-auto py-6">{children}</main>;
}
