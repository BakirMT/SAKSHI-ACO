'use client';
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';

const CLASSES = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className={`font-mono font-semibold ${val >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
          ₹{Math.abs(val).toFixed(2)}
        </span>
        <span className={`px-1.5 py-0.5 rounded text-xs ${val >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
          {val >= 0 ? 'surplus' : 'deficit'}
        </span>
      </div>
    </div>
  );
}

export default function ClassBalanceChart() {
  const { currentUser, isAdmin } = useAuth();
  const [data, setData] = React.useState<any[]>(CLASSES.map(c => ({ grade: c, net: 0 })));

  React.useEffect(() => {
    async function loadClassData() {
      let txnQuery = supabase.from('transactions').select('*').neq('status', 'voided');
      let studentQuery = supabase.from('students').select('*');

      if (!isAdmin) {
        if (!currentUser?.studentId) {
          setData([]);
          return;
        }
        txnQuery = txnQuery.eq('student_id', currentUser.studentId);
        studentQuery = studentQuery.eq('id', currentUser.studentId);
      }

      const [txnRes, stuRes] = await Promise.all([txnQuery, studentQuery]);
      
      if (!txnRes.data || !stuRes.data) return;
      
      const transactions = txnRes.data;
      const students = stuRes.data;

      const gradeBuckets = isAdmin ? CLASSES : ['My Account'];
      const results = gradeBuckets.map(grade => {
        if (!isAdmin) {
          const income = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
          const expense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
          return { grade, net: income - expense, income, expense };
        }

        const gradeLevel = grade.replace('Grade ', '');
        const cohortStudents = students.filter(s => s.grade === gradeLevel);
        
        let income = 0;
        let expense = 0;
        
        cohortStudents.forEach(s => {
          transactions.filter(t => t.student_id === s.id).forEach(t => {
            if (t.type === 'income') income += t.amount;
            else if (t.type === 'expense') expense += t.amount;
          });
        });
        
        return { grade, net: income - expense, income, expense };
      });
      
      setData(results);
    }

    loadClassData();

    const channel = supabase
      .channel('dashboard-class-balance-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, loadClassData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, loadClassData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, currentUser?.studentId]);

  return (
    <div className="metric-card h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900 text-sm">Net Balance by Grade</h3>
        <p className="text-xs text-slate-500 mt-0.5">Income minus expenses per grade level</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="net" radius={[4, 4, 0, 0]} name="Net Balance">
            {data.map((entry, index) => (
              <Cell
                key={`cell-grade-${index}`}
                fill={entry.net >= 0 ? '#3b82f6' : '#ef4444'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}