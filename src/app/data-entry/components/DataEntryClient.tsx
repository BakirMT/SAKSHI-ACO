'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import { Toaster } from 'sonner';
import TransactionForm from './TransactionForm';
import RecentEntriesTable from './RecentEntriesTable';

function DataEntryInner() {
  const { currentUser, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!loading && !currentUser) {
      router?.push('/sign-up-login');
    }
  }, [currentUser, loading, router]);

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
            <h1 className="text-2xl font-bold text-slate-900">Data Entry</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isAdmin
                ? 'Record income and expense transactions for any student'
                : 'View your transaction history'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Admin — full write access
            </div>
          )}
          {!isAdmin && (
            <div className="flex items-center gap-2 text-xs bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Read-only access
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Form */}
          <div className="xl:col-span-2">
            {isAdmin ? (
              <TransactionForm onSuccess={() => setRefreshKey(prev => prev + 1)} />
            ) : (
              <div className="metric-card flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">Read-only access</h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-[220px] leading-relaxed">
                  Transaction entry is restricted to administrators. Contact your school admin to record a payment.
                </p>
              </div>
            )}
          </div>

          {/* Recent entries */}
          <div className="xl:col-span-3">
            <RecentEntriesTable refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function DataEntryClient() {
  return <DataEntryInner />;
}