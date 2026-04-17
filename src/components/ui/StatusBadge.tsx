import React from 'react';

type TransactionStatus = 'confirmed' | 'pending' | 'voided';
type TransactionType = 'income' | 'expense';

interface StatusBadgeProps {
  status: TransactionStatus;
}

interface TypeBadgeProps {
  type: TransactionType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    confirmed: { bg: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500', label: 'Confirmed' },
    pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Pending' },
    voided: { bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400', label: 'Voided' },
  };
  const c = config[status];
  return (
    <span className={`status-badge border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return type === 'income'
    ? <span className="status-badge bg-blue-50 text-blue-700 border border-blue-200">↑ Income</span>
    : <span className="status-badge bg-red-50 text-red-700 border border-red-200">↓ Expense</span>;
}