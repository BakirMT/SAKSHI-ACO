'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { StatusBadge, TypeBadge } from '@/components/ui/StatusBadge';
import { Pencil, Trash2, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { supabase } from '@/lib/supabase';

interface RecentEntriesTableProps {
  refreshKey?: number;
}

export default function RecentEntriesTable({ refreshKey = 0 }: RecentEntriesTableProps) {
  const { currentUser, isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const PAGE_SIZE = 10;

  useEffect(() => {
    async function fetchTxns() {
      if (!isAdmin && !currentUser?.studentId) {
        setTxns([]);
        return;
      }

      let query = supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (!isAdmin) {
        query = query.eq('student_id', currentUser.studentId);
      }
      const { data, error } = await query;
      if (error) {
        toast.error(`Failed to load transactions: ${error.message}`);
        return;
      }
      if (data) {
        const mapped = data.map((t: any) => ({
          id: t.id,
          studentNumber: t.student_number || '',
          studentName: t.student_name || '',
          className: t.class_name || '',
          type: t.type,
          amount: t.amount,
          description: t.description,
          date: t.date,
          status: t.status
        }));
        setTxns(mapped);
      }
    }

    fetchTxns();

    const channel = supabase
      .channel('data-entry-transactions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchTxns)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, currentUser, refreshKey]);

  const total = txns.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginated = txns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const incomeTotal = txns
    .filter(t => t.type === 'income' && t.status !== 'voided')
    .reduce((a, t) => a + t.amount, 0);
  const expenseTotal = txns
    .filter(t => t.type === 'expense' && t.status !== 'voided')
    .reduce((a, t) => a + t.amount, 0);
  const netBalance = incomeTotal - expenseTotal;

  return (
    <div className="metric-card overflow-hidden p-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              {isAdmin ? 'Recent Entries' : 'My Transaction History'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{total} total records</p>
          </div>
          <ClipboardList className="w-4 h-4 text-slate-400" />
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
            <p className="text-xs text-blue-500 font-medium">Total Income</p>
            <p className="font-mono font-bold text-blue-700 text-sm tabular-nums mt-0.5">
              ₹{incomeTotal.toFixed(2)}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-100">
            <p className="text-xs text-red-500 font-medium">Total Expense</p>
            <p className="font-mono font-bold text-red-700 text-sm tabular-nums mt-0.5">
              ₹{expenseTotal.toFixed(2)}
            </p>
          </div>
          <div
            className={`rounded-lg px-3 py-2 border ${
              netBalance >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
            }`}
          >
            <p
              className={`text-xs font-medium ${
                netBalance >= 0 ? 'text-green-600' : 'text-red-500'
              }`}
            >
              Net Balance
            </p>
            <p
              className={`font-mono font-bold text-sm tabular-nums mt-0.5 ${
                netBalance >= 0 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              ₹{Math.abs(netBalance).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {[
                'TXN ID',
                'Student #',
                'Student Name',
                'Class',
                'Type',
                'Amount',
                'Description',
                'Date',
                'Status',
              ].map(col => (
                <th
                  key={`recent-col-${col}`}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
              {isAdmin && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 10 : 9}
                  className="px-4 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-600 text-sm">No transactions yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {isAdmin
                          ? 'Use the form on the left to record the first transaction'
                          : 'Your transaction history will appear here once entries are recorded by an admin'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map(txn => (
                <tr
                  key={txn.id}
                  className={`group data-table-row ${txn.status === 'voided' ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-400">{txn.id.substring(0,8)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium text-slate-700">
                      {txn.studentNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-900">{txn.studentName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">{txn.className}</span>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={txn.type} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono font-semibold text-sm tabular-nums ${
                        txn.type === 'income' ? 'text-blue-700' : 'text-red-600'
                      }`}
                    >
                      {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <span
                      className="text-xs text-slate-600 truncate block"
                      title={txn.description}
                    >
                      {txn.description}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-500">{txn.date}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={txn.status} />
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Edit this transaction"
                          onClick={() => toast.info(`Opening editor for ${txn.id}`)}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Void this transaction — affects student balance"
                          onClick={() => setDeleteTarget(txn.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}{' '}
            entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={`recent-page-${p}`}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  page === p ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Void this transaction?"
        message={`Transaction ${deleteTarget?.substring(0,8)}... will be marked as voided and excluded from balance calculations. This cannot be undone.`}
        confirmLabel="Void Transaction"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await supabase.from('transactions').update({status: 'voided'}).eq('id', deleteTarget);
          toast.success(`Transaction voided`);
          setTxns(prev => prev.map(t => t.id === deleteTarget ? {...t, status: 'voided'} : t));
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </div>
  );
}
