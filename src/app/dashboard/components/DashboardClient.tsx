'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import MetricsBentoGrid from './MetricsBentoGrid';
import TransactionVolumeChart from './TransactionVolumeChart';
import ClassBalanceChart from './ClassBalanceChart';
import TransactionsTable from './TransactionsTable';
import ActivityFeed from './ActivityFeed';
import { Toaster } from 'sonner';
import { supabase } from '@/lib/supabase';

function DashboardInner() {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();
  const [lastTxnAt, setLastTxnAt] = React.useState<Date | null>(null);

  useEffect(() => {
    if (!loading && !currentUser) {
      router?.push('/sign-up-login');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (!currentUser) return;

    async function fetchLastTransactionTime() {
      let query = supabase
        .from('transactions')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (role !== 'admin') {
        const sid = (currentUser as any)?.studentId;
        if (!sid) {
          setLastTxnAt(null);
          return;
        }
        query = query.eq('student_id', sid);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0 || !data[0]?.created_at) {
        setLastTxnAt(null);
        return;
      }
      setLastTxnAt(new Date(data[0].created_at));
    }

    fetchLastTransactionTime();

    const channel = supabase
      .channel('dashboard-last-transaction')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchLastTransactionTime)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, role]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AppLayout>
      <Toaster position="bottom-right" richColors />
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {role === 'admin' ? 'Finance Dashboard' : 'My Account'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {role === 'admin' ? 'All student accounts — April 2026'
                : `Viewing transactions for ${currentUser?.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 px-3 py-2 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Last transaction:{' '}
            {lastTxnAt
              ? lastTxnAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
              : '—'}
          </div>
        </div>

        {/* KPI Bento Grid */}
        <MetricsBentoGrid />

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div className="xl:col-span-3">
            <TransactionVolumeChart />
          </div>
          <div className="xl:col-span-2">
            <ClassBalanceChart />
          </div>
        </div>

        {/* Table + Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <div className="xl:col-span-3">
            <TransactionsTable />
          </div>
          <div className="xl:col-span-1">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function DashboardClient() {
  return <DashboardInner />;
}