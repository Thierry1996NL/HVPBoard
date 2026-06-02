'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authenticated === false) {
      router.replace('/login');
    }
  }, [authenticated, router]);

  if (authenticated === null || authenticated === false) {
    return <div className="loading-bar" />;
  }

  return (
    <>
      <Sidebar />
      <Header />
      <div className="app-layout">
        {children}
      </div>
    </>
  );
}
