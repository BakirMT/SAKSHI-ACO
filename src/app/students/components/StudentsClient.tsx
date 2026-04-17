'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import AppLayout from '@/components/AppLayout';
import { Toaster, toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  Search, Users, TrendingUp, TrendingDown, GraduationCap,
  UserPlus, X, Check, AlertCircle, Edit, Trash2
} from 'lucide-react';

interface Student {
  id: string;
  studentNumber: string;
  name: string;
  email?: string;
  className: string;
  grade: string;
  enrolledDate: string;
}

interface TransactionRow {
  id: string;
  student_id: string;
  type: 'income' | 'expense';
  amount: number;
  status: 'confirmed' | 'pending' | 'voided';
}

/* ─── Student Modal (Add/Edit) ─────────────────────────────────────── */
interface StudentModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (student: Student) => void;
  onEdit: (student: Student) => void;
  existingStudentNumbers: string[];
  editingStudent?: Student | null;
}

const CLASS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Staff'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];

function StudentModal({ open, onClose, onAdd, onEdit, existingStudentNumbers, editingStudent }: StudentModalProps) {
  const [form, setForm] = useState({
    studentNumber: '',
    name: '',
    email: '',
    classLevel: '1',
    section: 'A',
    enrolledDate: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      if (editingStudent) {
         setForm({ 
           studentNumber: editingStudent.studentNumber,
           name: editingStudent.name,
           email: editingStudent.email || '',
           classLevel: editingStudent.grade,
           section: editingStudent.className.includes('-') ? editingStudent.className.split('-')[1] : 'A',
           enrolledDate: editingStudent.enrolledDate,
         });
      } else {
         setForm({ studentNumber: '', name: '', email: '', classLevel: '1', section: 'A', enrolledDate: new Date().toISOString().split('T')[0] });
      }
      setErrors({});
    }
  }, [open, editingStudent]);

  const validate = () => {
    const e: Record<string, string> = {};
    const sn = form.studentNumber.trim().toUpperCase();
    if (!sn) e.studentNumber = 'Student number is required';
    else if (!editingStudent && sn.length < 3) e.studentNumber = 'Student number must be at least 3 characters (used as login password)';
    else if (existingStudentNumbers.includes(sn) && sn !== editingStudent?.studentNumber.toUpperCase()) e.studentNumber = `${sn} already exists`;
    if (!form.name.trim()) e.name = 'Full name is required';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Valid email is required';
    if (!form.enrolledDate) e.enrolledDate = 'Enrolled date is required';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const studentNumber = form.studentNumber.trim().toUpperCase();
      
      const payload = {
        studentNumber,
        name: form.name.trim(),
        email: form.email.trim(),
        classLevel: form.classLevel,
        section: form.section,
        enrolledDate: form.enrolledDate,
      };

      if (editingStudent) {
        // Edit mode
        const className = form.classLevel === 'Staff' ? 'Staff' : `Class ${form.classLevel}-${form.section}`;
        const updatePayload = {
          student_number: studentNumber,
          name: payload.name,
          email: payload.email,
          class_name: className,
          grade: payload.classLevel,
          enrolled_date: payload.enrolledDate,
        };
        const { data, error } = await supabase.from('students').update(updatePayload).eq('id', editingStudent.id).select().single();
        if (error) throw new Error(error.message);
        
        onEdit({
          id: data.id,
          studentNumber: data.student_number,
          name: data.name,
          email: data.email,
          className: data.class_name,
          grade: data.grade,
          enrolledDate: data.enrolled_date
        });
        onClose();
        toast.success(`Student "${data.name}" updated successfully!`);
      } else {
        // Add mode
        const response = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create student');
        }

        onAdd({
          id: data.student.id,
          studentNumber: data.student.student_number,
          name: data.student.name,
          email: data.student.email,
          className: data.student.class_name,
          grade: data.student.grade,
          enrolledDate: data.student.enrolled_date
        });
        onClose();
        toast.success(`Student "${data.student.name}" added successfully!`, {
          description: `Login email: ${payload.email} | Password: ${data.generatedPassword}`,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while saving');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <UserPlus className="w-4.5 h-4.5 text-white" size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
                <p className="text-blue-200 text-xs mt-0.5">{editingStudent ? 'Update student details' : 'Admin only — fills student directory'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Manual Student Number */}
          <div>
            <label className="form-label" htmlFor="add-studentnumber">Student Number <span className="text-red-500">*</span></label>
            <input
              id="add-studentnumber"
              type="text"
              placeholder="e.g. STU-1100"
              value={form.studentNumber}
              onChange={e => set('studentNumber', e.target.value)}
              disabled={!!editingStudent}
              className={`form-input font-mono ${errors.studentNumber ? 'border-red-400 focus:ring-red-400' : ''} ${editingStudent ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
              autoComplete="off"
              autoFocus
            />
            {editingStudent && (
              <p className="form-helper">
                Student Number can’t be changed after transactions exist (it’s used as the database ID).
              </p>
            )}
            {errors.studentNumber && (
              <p className="form-error"><AlertCircle className="w-3 h-3" /> {errors.studentNumber}</p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="form-label" htmlFor="add-name">Full Name <span className="text-red-500">*</span></label>
            <input
              id="add-name"
              type="text"
              placeholder="e.g. Margaret Chen"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={`form-input ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
              autoComplete="off"
            />
            {errors.name && (
              <p className="form-error"><AlertCircle className="w-3 h-3" /> {errors.name}</p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="form-label" htmlFor="add-email">Email Address <span className="text-red-500">*</span></label>
            <input
              id="add-email"
              type="email"
              placeholder="student@school.edu"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className={`form-input ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
              autoComplete="off"
            />
            {errors.email && (
              <p className="form-error"><AlertCircle className="w-3 h-3" /> {errors.email}</p>
            )}
            <p className="form-helper">An account will be created with this email. Password will default to their Student Number.</p>
          </div>

          {/* Class & Section — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="add-class">Class <span className="text-red-500">*</span></label>
              <select
                id="add-class"
                value={form.classLevel}
                onChange={e => set('classLevel', e.target.value)}
                className="form-input"
              >
                {CLASS_OPTIONS.map(c => (
                  <option key={c} value={c}>{c === 'Staff' ? 'Staff' : `Class ${c}`}</option>
                ))}
              </select>
            </div>
            {form.classLevel !== 'Staff' && (
              <div>
                <label className="form-label" htmlFor="add-section">Section <span className="text-red-500">*</span></label>
                <select
                  id="add-section"
                  value={form.section}
                  onChange={e => set('section', e.target.value)}
                  className="form-input"
                >
                  {SECTION_OPTIONS.map(s => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Class preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">Class will be:</span>
            <span className="font-semibold text-sm text-slate-800">
              {form.classLevel === 'Staff' ? 'Staff' : `Class ${form.classLevel}-${form.section}`}
            </span>
          </div>

          {/* Enrolled Date */}
          <div>
            <label className="form-label" htmlFor="add-date">Enrolled Date <span className="text-red-500">*</span></label>
            <input
              id="add-date"
              type="date"
              value={form.enrolledDate}
              onChange={e => set('enrolledDate', e.target.value)}
              className={`form-input ${errors.enrolledDate ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            {errors.enrolledDate && (
              <p className="form-error"><AlertCircle className="w-3 h-3" /> {errors.enrolledDate}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {editingStudent ? 'Save Changes' : 'Add Student'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
function StudentsInner() {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    async function loadStudentsAndTransactions() {
      const [studentsRes, txnsRes] = await Promise.all([
        supabase.from('students').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('id, student_id, type, amount, status')
      ]);

      if (!studentsRes.error && studentsRes.data) {
        setStudents(studentsRes.data.map(d => ({
          id: d.id,
          studentNumber: d.student_number,
          name: d.name,
          email: d.email,
          className: d.class_name,
          grade: d.grade,
          enrolledDate: d.enrolled_date
        })));
      }

      if (!txnsRes.error && txnsRes.data) {
        setTransactions(txnsRes.data as TransactionRow[]);
      }

      setLoadingInitial(false);
    }

    loadStudentsAndTransactions();

    const channel = supabase
      .channel('students-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, loadStudentsAndTransactions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, loadStudentsAndTransactions)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router?.push('/sign-up-login');
      } else if (!isAdmin) {
        router?.push('/dashboard');
      }
    }
  }, [currentUser, isAdmin, authLoading, router]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        s.name.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q);
      const matchGrade = gradeFilter === 'all' || s.grade === gradeFilter;
      return matchSearch && matchGrade;
    });
  }, [students, search, gradeFilter]);

  if (!currentUser || !isAdmin || loadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const grades = ['all', ...Array.from(new Set(students.map(s => s.grade))).sort()];

  const getStudentBalance = (studentId: string) =>
    transactions
      .filter(t => t.student_id === studentId && t.status !== 'voided')
      .reduce((acc, t) => (t.type === 'income' ? acc + t.amount : acc - t.amount), 0);

  const getStudentTxnCount = (studentId: string) =>
    transactions.filter(t => t.student_id === studentId && t.status !== 'voided').length;

  const totalBalance = students.reduce((acc, s) => acc + getStudentBalance(s.id), 0);
  const totalTxns = transactions.filter(t => t.status !== 'voided').length;

  const handleAddStudent = (student: Student) => {
    setStudents(prev => [student, ...prev]);
  };

  const handleEditSubmit = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    const hasTxns = transactions.some(t => t.student_id === id);
    if (hasTxns) {
      const ok = confirm(
        `"${name}" has existing transactions.\n\n` +
        `To delete this student, we must also delete ALL their transactions (otherwise Supabase blocks deletion).\n\n` +
        `Continue and delete student + transactions?`
      );
      if (!ok) return;
    } else {
      const ok = confirm(
        `Are you sure you want to delete ${name}?\n\n` +
        `This will remove them from the directory. Their auth account will remain unless deleted separately.`
      );
      if (!ok) return;
    }
    try {
      if (hasTxns) {
        const { error: txnErr } = await supabase.from('transactions').delete().eq('student_id', id);
        if (txnErr) throw new Error(txnErr.message);
      }

      // Remove profile row linked to this student number (if present)
      const { error: profileErr } = await supabase.from('profiles').delete().eq('student_id', id);
      if (profileErr) throw new Error(profileErr.message);

      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setStudents(prev => prev.filter(s => s.id !== id));
      toast.success(`${name} deleted successfully!`);
    } catch (e: any) {
      toast.error(e.message || 'Error deleting student');
    }
  };

  return (
    <AppLayout>
      <Toaster position="bottom-right" richColors />

      <StudentModal
        open={showAddModal || !!editingStudent}
        onClose={() => { setShowAddModal(false); setEditingStudent(null); }}
        onAdd={handleAddStudent}
        onEdit={handleEditSubmit}
        existingStudentNumbers={students.map(s => (s.studentNumber || '').toUpperCase())}
        editingStudent={editingStudent}
      />

      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Students</h1>
            <p className="text-sm text-slate-500 mt-0.5">All enrolled students — {students.length} total</p>
          </div>
          {/* Add Student Button — admin only */}
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
            id="add-student-btn"
          >
            <UserPlus className="w-4 h-4" />
            Add Student
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="metric-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Students</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{students.length}</p>
            </div>
          </div>
          <div className="metric-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Net Balance (All)</p>
              <p className={`text-2xl font-bold tabular-nums ${totalBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {totalBalance >= 0 ? '+' : ''}₹{Math.abs(totalBalance).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="metric-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Transactions</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalTxns}</p>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="metric-card overflow-hidden p-0">
          {/* Filters bar */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">Student Directory</h3>
              <p className="text-xs text-slate-500 mt-0.5">{filtered.length} of {students.length} students</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, ID, class..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                />
              </div>
              {/* Grade filter */}
              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                {grades.map(g => (
                  <option key={g} value={g}>{g === 'all' ? 'All Grades' : `Grade ${g}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Student #', 'Name', 'Class', 'Grade', 'Balance', 'Transactions', 'Enrolled', ''].map((col, idx) => (
                    <th key={col + idx} className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest ${col === '' ? 'w-20' : 'whitespace-nowrap'}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                          <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="font-medium text-slate-500 text-sm">No students found</p>
                        <p className="text-xs text-slate-400">Try adjusting your search or grade filter</p>
                        {search === '' && gradeFilter === 'all' && (
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary flex items-center gap-1.5 text-xs mt-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add first student
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(student => {
                    const balance = getStudentBalance(student.id);
                    const txnCount = getStudentTxnCount(student.id);
                    const isNew = false; // Determine by recent timestamp if needed
                    return (
                      <tr key={student.id} className="data-table-row">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">{student.studentNumber}</span>
                            {isNew && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">New</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-blue-700">{student.name.charAt(0)}</span>
                            </div>
                            <span className="font-medium text-slate-900 text-sm">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600">{student.className}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            Grade {student.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {balance >= 0
                              ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                              : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                            }
                            <span className={`font-mono font-semibold text-sm tabular-nums ${balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {balance >= 0 ? '+' : ''}₹{balance.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-slate-700 tabular-nums">{txnCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-500">{student.enrolledDate}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingStudent(student)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Student">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteStudent(student.id, student.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Student">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function StudentsClient() {
  return <StudentsInner />;
}
