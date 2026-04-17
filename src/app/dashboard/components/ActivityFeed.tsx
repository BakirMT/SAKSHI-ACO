'use client';
import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';

interface ActivityTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  student_name?: string;
}

export default function ActivityFeed() {
  const { currentUser, isAdmin } = useAuth();
  const [recent, setRecent] = React.useState<ActivityTransaction[]>([]);

  React.useEffect(() => {
    async function fetchRecent() {
      let query = supabase
        .from('transactions')
        .select('id, type, amount, description, date, student_name, status')
        .neq('status', 'voided')
        .order('created_at', { ascending: false })
        .limit(8);

      if (!isAdmin) {
        if (!currentUser?.studentId) {
          setRecent([]);
          return;
        }
        query = query.eq('student_id', currentUser.studentId);
      }

      const { data, error } = await query;

      if (error) {
        return;
      }

      if (data) {
        setRecent(data as ActivityTransaction[]);
      }
    }

    fetchRecent();

    const channel = supabase
      .channel('dashboard-activity-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchRecent)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, currentUser?.studentId]);

  return (
    <div className="metric-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Recent Activity</h3>
          <p className="text-xs text-slate-500 mt-0.5">Latest entries logged</p>
        </div>
        <Clock className="w-4 h-4 text-slate-400" />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
        {recent.map(txn => (
          <div key={txn?.id} className="flex items-start gap-3 group">
            <div className={`flex-shrink-0 mt-0.5 ${txn?.type === 'income' ? 'text-blue-500' : 'text-red-400'}`}>
              {txn?.type === 'income'
                ? <ArrowUpCircle className="w-4 h-4" />
                : <ArrowDownCircle className="w-4 h-4" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium text-slate-800 truncate">{txn?.student_name || 'Unknown student'}</p>
                <span className={`font-mono text-xs font-semibold tabular-nums flex-shrink-0 ${txn?.type === 'income' ? 'text-blue-700' : 'text-red-600'}`}>
                  {txn?.type === 'income' ? '+' : '-'}₹{txn?.amount?.toFixed(0)}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{txn?.description}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{txn?.date} · {txn?.id}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100">
        <button className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors text-center">
          View all transactions →
        </button>
      </div>
    </div>
  );
}