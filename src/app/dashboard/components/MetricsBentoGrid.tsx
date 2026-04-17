'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Activity,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

function formatCurrency(n: number) {
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export default function MetricsBentoGrid() {
  const { currentUser, isAdmin } = useAuth();
  
  const [data, setData] = useState({ txns: [] as any[], students: [] as any[] });

  useEffect(() => {
    async function fetchData() {
      const [txnRes, stuRes] = await Promise.all([
        supabase.from('transactions').select('*'),
        supabase.from('students').select('*')
      ]);
      if (txnRes.data && stuRes.data) {
        setData({ txns: txnRes.data, students: stuRes.data });
      }
    }

    fetchData();

    const channel = supabase
      .channel('dashboard-metrics-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const txns = isAdmin
    ? data.txns.filter(t => t.status !== 'voided')
    : data.txns.filter(t => t.student_id === currentUser?.studentId && t.status !== 'voided');

  const totalIncome = txns.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const totalExpense = txns.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const now = new Date();
  const thisMonth = monthKey(now);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = monthKey(prevMonthDate);
  const prevMonthLabel = prevMonthDate.toLocaleString('en-IN', { month: 'short' });

  const monthTxns = txns.filter((t: any) => typeof t.date === 'string' && t.date.slice(0, 7) === thisMonth);
  const prevMonthTxns = txns.filter((t: any) => typeof t.date === 'string' && t.date.slice(0, 7) === prevMonth);

  const monthIncome = monthTxns.filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + (t.amount || 0), 0);
  const monthExpense = monthTxns.filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + (t.amount || 0), 0);
  const prevIncome = prevMonthTxns.filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + (t.amount || 0), 0);
  const prevExpense = prevMonthTxns.filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + (t.amount || 0), 0);

  const incomeMoM = percentChange(monthIncome, prevIncome);
  const expenseMoM = percentChange(monthExpense, prevExpense);

  const today = new Date().toISOString().split('T')[0];
  const todayTxns = txns.filter(t => t.date === today).length;
  const incomeToday = txns.filter(t => t.date === today && t.type === 'income').length;
  const expenseToday = txns.filter(t => t.date === today && t.type === 'expense').length;

  const studentsWithNegative = isAdmin
    ? data.students.filter(s => {
      const sTxns = data.txns.filter(t => t.student_id === s.id && t.status !== 'voided');
      const bal = sTxns.reduce((a, t) => t.type === 'income' ? a + t.amount : a - t.amount, 0);
      return bal < 0;
    }).length
    : 0;

  const activeStudents = data.students.length;
  const pendingCount = data.txns.filter(t => t.status === 'pending').length;

  // Bento grid plan: 6 cards → grid-cols-3 → row1: net balance (hero, col-span-1 but taller), collections, expenses; row2: outstanding (alert), today txns, active students

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
      {/* Hero: Net Balance */}
      <div className="metric-card bg-gradient-to-br from-blue-600 to-blue-700 border-blue-700 text-white row-span-1 lg:row-span-2 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Net Balance</p>
            <p className="text-3xl font-bold font-mono mt-2 tabular-nums">{formatCurrency(netBalance)}</p>
            <p className="text-blue-200 text-sm mt-1">All accounts combined</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-500 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-blue-300">Income</p>
            <p className="font-semibold font-mono text-white tabular-nums">{formatCurrency(totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-300">Expenses</p>
            <p className="font-semibold font-mono text-white tabular-nums">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-blue-200 text-xs">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>
            {incomeMoM === null
              ? `— vs ${prevMonthLabel}`
              : `${incomeMoM >= 0 ? '+' : ''}${incomeMoM.toFixed(1)}% vs ${prevMonthLabel}`}
          </span>
        </div>
      </div>

      {/* Total Collections */}
      <div className="metric-card flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Collections</p>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4.5 h-4.5 text-green-600" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-green-600">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>
            {incomeMoM === null
              ? `— vs ${prevMonthLabel}`
              : `${incomeMoM >= 0 ? '+' : ''}${incomeMoM.toFixed(1)}% vs ${prevMonthLabel}`}
          </span>
        </div>
      </div>

      {/* Total Expenses */}
      <div className="metric-card flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Expenses</p>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-4.5 h-4.5 text-red-500" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-red-500">
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>
            {expenseMoM === null
              ? `— vs ${prevMonthLabel}`
              : `${expenseMoM >= 0 ? '+' : ''}${expenseMoM.toFixed(1)}% vs ${prevMonthLabel}`}
          </span>
        </div>
      </div>

      {/* Outstanding / Alert */}
      {isAdmin ? (
        <div className={`metric-card flex flex-col justify-between ${studentsWithNegative > 0 ? 'bg-red-50 border-red-200' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest ${studentsWithNegative > 0 ? 'text-red-500' : 'text-slate-500'}`}>Outstanding Balances</p>
              <p className={`text-2xl font-bold font-mono mt-2 tabular-nums ${studentsWithNegative > 0 ? 'text-red-700' : 'text-slate-900'}`}>{studentsWithNegative}</p>
              <p className={`text-sm mt-0.5 ${studentsWithNegative > 0 ? 'text-red-500' : 'text-slate-500'}`}>students with negative balance</p>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${studentsWithNegative > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
              <AlertCircle className={`w-4.5 h-4.5 ${studentsWithNegative > 0 ? 'text-red-600' : 'text-slate-400'}`} />
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {pendingCount} transactions pending confirmation
            </div>
          )}
        </div>
      ) : (
        <div className="metric-card flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">My Balance</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
                {formatCurrency(netBalance)}
              </p>
            </div>
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4.5 h-4.5 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Today's Transactions */}
      <div className="metric-card flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Entries Today</p>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">{todayTxns}</p>
            <p className="text-sm text-slate-500 mt-0.5">Apr 16, 2026</p>
          </div>
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity className="w-4.5 h-4.5 text-blue-600" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>{incomeToday} income · {expenseToday} expense</span>
        </div>
      </div>

      {/* Active Students */}
      {isAdmin && (
        <div className="metric-card flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Active Students</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">{activeStudents}</p>
              <p className="text-sm text-slate-500 mt-0.5">enrolled this year</p>
            </div>
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-4.5 h-4.5 text-indigo-600" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Across 4 grade levels</span>
          </div>
        </div>
      )}
    </div>
  );
}