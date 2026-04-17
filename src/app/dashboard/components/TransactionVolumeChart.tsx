'use client';
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { startOfDay, subDays, format } from 'date-fns';
import { useAuth } from '@/lib/authContext';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={`tooltip-item-${i}`} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600 capitalize">{p.name}</span>
          </div>
          <span className="font-mono font-semibold text-slate-900">
            ₹{p.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TransactionVolumeChart() {
  const { currentUser, isAdmin } = useAuth();
  const [data, setData] = React.useState<any[]>([]);

  React.useEffect(() => {
    async function loadVolume() {
      let query = supabase.from('transactions').select('*').neq('status', 'voided');
      if (!isAdmin) {
        if (!currentUser?.studentId) {
          setData([]);
          return;
        }
        query = query.eq('student_id', currentUser.studentId);
      }

      const { data: txns } = await query;
      if (!txns) return;

      const days = [];
      const today = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = subDays(today, i);
        const dayStr = format(d, 'MMM d');
        const dbDayStr = format(d, 'yyyy-MM-dd');
        
        let income = 0;
        let expense = 0;
        
        txns.filter(t => t.date === dbDayStr).forEach(t => {
          if (t.type === 'income') income += t.amount;
          else if (t.type === 'expense') expense += t.amount;
        });
        
        days.push({ date: dayStr, income, expense });
      }
      setData(days);
    }

    loadVolume();

    const channel = supabase
      .channel('dashboard-volume-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, loadVolume)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, currentUser?.studentId]);

  return (
    <div className="metric-card h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Transaction Volume</h3>
          <p className="text-xs text-slate-500 mt-0.5">Income vs Expenses — Last 14 days</p>
        </div>
        <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-1 rounded-md border border-blue-100">14 days</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={2} fill="url(#incomeGrad)" name="Income" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}