'use client';
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/authContext';
import { StatusBadge, TypeBadge } from '@/components/ui/StatusBadge';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { supabase } from '@/lib/supabase';

type SortKey = keyof Transaction | string;
type SortDir = 'asc' | 'desc';

interface Transaction {
  id: string;
  studentNumber: string;
  studentName: string;
  className: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  status: 'confirmed' | 'pending' | 'voided';
}

const PAGE_SIZES = [5, 10, 20];

export default function TransactionsTable() {
  const { currentUser, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'voided'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [baseData, setBaseData] = useState<any[]>([]);

  React.useEffect(() => {
    async function fetchTxns() {
      if (!isAdmin && !currentUser?.studentId) {
        setBaseData([]);
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
        setBaseData(mapped);
      }
    }

    fetchTxns();

    const channel = supabase
      .channel('dashboard-transactions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchTxns)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, currentUser]);

  const filtered = useMemo(() => {
    return baseData
      .filter(t => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          t.studentName.toLowerCase().includes(q) ||
          t.studentNumber.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q);
        const matchType = typeFilter === 'all' || t.type === typeFilter;
        const matchStatus = statusFilter === 'all' || t.status === statusFilter;
        return matchSearch && matchType && matchStatus;
      })
      .sort((a, b) => {
        const av = a[sortKey] as string | number;
        const bv = b[sortKey] as string | number;
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [baseData, search, typeFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === paginated.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginated.map(t => t.id)));
  };

  const handleDelete = (id: string) => setDeleteTarget(id);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'voided' })
      .eq('id', deleteTarget);
    if (error) {
      toast.error(`Failed to void transaction: ${error.message}`);
      return;
    }
    setBaseData(prev => prev.map(txn => txn.id === deleteTarget ? { ...txn, status: 'voided' } : txn));
    toast.success(`Transaction ${deleteTarget} voided successfully`);
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'voided' })
      .in('id', ids);
    if (error) {
      toast.error(`Failed to void selected transactions: ${error.message}`);
      return;
    }
    setBaseData(prev => prev.map(txn => ids.includes(txn.id) ? { ...txn, status: 'voided' } : txn));
    toast.success(`${ids.length} transactions voided`);
    setSelectedRows(new Set());
  };

  return (
    <div className="metric-card overflow-hidden p-0">
      {/* Table header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 text-sm">All Transactions</h3>
          <p className="text-xs text-slate-500 mt-0.5">{filtered.length} records</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, ID, description..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value as typeof typeFilter); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="voided">Voided</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedRows.size > 0 && (
        <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-3 animate-slide-up">
          <span className="text-xs font-medium text-blue-700">{selectedRows.size} selected</span>
          <button onClick={handleBulkDelete} className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Void selected
          </button>
          <button onClick={() => setSelectedRows(new Set())} className="text-xs text-slate-500 hover:text-slate-700 font-medium ml-auto transition-colors">
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {isAdmin && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {[
                { key: 'id' as SortKey, label: 'TXN ID' },
                { key: 'studentNumber' as SortKey, label: 'Student #' },
                { key: 'studentName' as SortKey, label: 'Student Name' },
                { key: 'className' as SortKey, label: 'Class' },
                { key: 'type' as SortKey, label: 'Type' },
                { key: 'amount' as SortKey, label: 'Amount' },
                { key: 'description' as SortKey, label: 'Description' },
                { key: 'date' as SortKey, label: 'Date' },
                { key: 'status' as SortKey, label: 'Status' },
              ].map(col => (
                <th
                  key={`col-${col.key}`}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-700 whitespace-nowrap select-none"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    <SortIcon k={col.key} />
                  </div>
                </th>
              ))}
              {isAdmin && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-500 text-sm">No transactions found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search or filter criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map(txn => (
                <tr key={txn.id} className={`data-table-row ${txn.status === 'voided' ? 'opacity-50' : ''}`}>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(txn.id)}
                        onChange={() => toggleRow(txn.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-500">{txn.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-700 font-medium">{txn.studentNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900 text-sm">{txn.studentName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600">{txn.className}</span>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={txn.type} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono font-semibold text-sm tabular-nums ${txn.type === 'income' ? 'text-blue-700' : 'text-red-600'}`}>
                      {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="text-xs text-slate-600 truncate block" title={txn.description}>{txn.description}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-500">{txn.date}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={txn.status} />
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          title="View transaction details"
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Edit this transaction"
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                          onClick={() => toast.info(`Editing ${txn.id}`)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Void this transaction — cannot be undone"
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          onClick={() => handleDelete(txn.id)}
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
      {filtered.length > 0 && (
        <div className="px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PAGE_SIZES.map(s => <option key={`ps-${s}`} value={s}>{s}</option>)}
            </select>
            <span>per page · {filtered.length} total records</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<Array<number | '...'>>((acc, p, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => (
                p === '...'
                  ? <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">…</span>
                  : <button
                    key={`page-${p}`}
                    onClick={() => setPage(p as number)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    {p}
                  </button>
              ))
            }
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
        message={`Transaction ${deleteTarget} will be marked as voided. This action affects the student's balance calculation.`}
        confirmLabel="Void Transaction"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </div>
  );
}