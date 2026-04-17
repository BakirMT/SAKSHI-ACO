'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CheckCircle, XCircle, ArrowUpCircle, ArrowDownCircle, User, BookOpen, Hash } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

interface FormData {
  studentNumber: string;
  type: 'income' | 'expense';
  amount: string;
  description: string;
  date: string;
  notes: string;
}

interface Student {
  id: string;
  studentNumber: string;
  name: string;
  email?: string;
  className: string;
  grade: string;
  enrolledDate: string;
}

interface TransactionFormProps {
  onSuccess?: () => void;
}

export default function TransactionForm({ onSuccess }: TransactionFormProps) {
  const { currentUser } = useAuth();
  const [lookupStudent, setLookupStudent] = useState<Student | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('income');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      studentNumber: '',
      type: 'income',
      amount: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    }
  });

  const studentNumber = watch('studentNumber');

  // Auto-fill student on student number change
  const doLookup = useCallback(async (num: string) => {
    if (!num || num.length < 1) {
      setLookupStudent(null);
      setLookupError(null);
      return;
    }
    setIsLooking(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const searchNum = num.trim().toUpperCase();
      const { data, error } = await supabase.from('students').select('*').eq('student_number', searchNum).single();
      
      if (data && !error) {
        setLookupStudent({
          id: data.id,
          studentNumber: data.student_number,
          name: data.name,
          email: data.email,
          className: data.class_name,
          grade: data.grade,
          enrolledDate: data.enrolled_date
        });
        setLookupError(null);
      } else {
        setLookupStudent(null);
        setLookupError(`No student found with number "${searchNum}"`);
      }
    } catch (err) {
      setLookupStudent(null);
      setLookupError('Error connecting to database');
    } finally {
      setIsLooking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doLookup(studentNumber), 500);
    return () => clearTimeout(timer);
  }, [studentNumber, doLookup]);

  const onSubmit = async (data: FormData) => {
    if (!lookupStudent) {
      toast.error('Please enter a valid student number before submitting');
      return;
    }
    setIsSubmitting(true);

    const amount = parseFloat(data.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setIsSubmitting(false);
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    // Backend integration point: Live database insert
    try {
      const { supabase } = await import('@/lib/supabase');
      const recordedBy =
        currentUser?.name ||
        currentUser?.email ||
        currentUser?.id ||
        'system';

      const payload = {
        id: crypto.randomUUID(),
        student_id: lookupStudent.id,
        student_number: lookupStudent.studentNumber,
        student_name: lookupStudent.name,
        class_name: lookupStudent.className,
        recorded_by: recordedBy,
        type: data.type,
        amount,
        description: data.description,
        date: data.date,
        notes: data.notes || null,
        status: 'confirmed'
      };
      
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
      
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error('Failed to save transaction to database: ' + err.message);
      return;
    }

    setIsSubmitting(false);
    setSubmitSuccess(true);
    toast.success(`${data.type === 'income' ? 'Income' : 'Expense'} of ₹${amount.toFixed(2)} recorded for ${lookupStudent.name}`);
    if (onSuccess) onSuccess();

    setTimeout(() => {
      setSubmitSuccess(false);
      reset({ studentNumber: '', type: 'income', amount: '', description: '', date: new Date().toISOString().slice(0, 10), notes: '' });
      setLookupStudent(null);
      setLookupError(null);
      setSelectedType('income');
    }, 1500);
  };

  return (
    <div className="metric-card">
      <div className="mb-5">
        <h3 className="font-semibold text-slate-900">New Transaction</h3>
        <p className="text-xs text-slate-500 mt-0.5">Enter a student number to auto-fill details, then record the transaction</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Student number lookup */}
        <div>
          <label className="form-label" htmlFor="studentNumber">
            Student Number
            <span className="ml-1 text-blue-500 font-normal text-xs">(auto-fills name and class)</span>
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="studentNumber"
              type="text"
              className={`form-input pl-9 pr-10 font-mono ${errors.studentNumber ? 'border-red-400 focus:ring-red-400' : lookupStudent ? 'border-green-400 focus:ring-green-400' : ''}`}
              placeholder="STU-1001"
              {...register('studentNumber', { required: 'Student number is required' })}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isLooking && (
                <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {!isLooking && lookupStudent && <CheckCircle className="w-4 h-4 text-green-500" />}
              {!isLooking && lookupError && <XCircle className="w-4 h-4 text-red-500" />}
            </div>
          </div>
          {errors.studentNumber && <p className="form-error"><span>⚠</span> {errors.studentNumber.message}</p>}
          {lookupError && !errors.studentNumber && <p className="form-error"><span>⚠</span> {lookupError}</p>}
        </div>

        {/* Auto-filled student info */}
        {lookupStudent && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3.5 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-blue-700">Student record found</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-500">Name</p>
                  <p className="text-sm font-semibold text-slate-800">{lookupStudent.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-500">Class</p>
                  <p className="text-sm font-semibold text-slate-800">{lookupStudent.className}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction type toggle */}
        <div>
          <label className="form-label">Transaction Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setSelectedType('income'); setValue('type', 'income'); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-medium transition-all duration-150 ${selectedType === 'income' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
            >
              <ArrowUpCircle className={`w-4 h-4 ${selectedType === 'income' ? 'text-blue-600' : 'text-slate-400'}`} />
              Income
            </button>
            <button
              type="button"
              onClick={() => { setSelectedType('expense'); setValue('type', 'expense'); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-medium transition-all duration-150 ${selectedType === 'expense' ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:bg-red-50/30'
                }`}
            >
              <ArrowDownCircle className={`w-4 h-4 ${selectedType === 'expense' ? 'text-red-500' : 'text-slate-400'}`} />
              Expense
            </button>
          </div>
          <input type="hidden" {...register('type')} value={selectedType} />
        </div>

        {/* Amount */}
        <div>
          <label className="form-label" htmlFor="amount">Amount (INR)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              className={`form-input pl-7 font-mono tabular-nums ${errors.amount ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="0.00"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0.01, message: 'Amount must be greater than ₹0.00' },
                validate: v => !isNaN(parseFloat(v)) || 'Enter a valid dollar amount'
              })}
            />
          </div>
          {errors.amount && <p className="form-error"><span>⚠</span> {errors.amount.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="form-label" htmlFor="description">Description</label>
          <p className="form-helper -mt-1 mb-1.5">Briefly describe what this transaction is for</p>
          <input
            id="description"
            type="text"
            className={`form-input ${errors.description ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="e.g. Tuition Fee — April 2026"
            {...register('description', {
              required: 'Description is required',
              minLength: { value: 5, message: 'Description must be at least 5 characters' }
            })}
          />
          {errors.description && <p className="form-error"><span>⚠</span> {errors.description.message}</p>}
        </div>

        {/* Date */}
        <div>
          <label className="form-label" htmlFor="date">Transaction Date</label>
          <input
            id="date"
            type="date"
            className={`form-input font-mono ${errors.date ? 'border-red-400 focus:ring-red-400' : ''}`}
            {...register('date', { required: 'Date is required' })}
          />
          {errors.date && <p className="form-error"><span>⚠</span> {errors.date.message}</p>}
        </div>

        {/* Notes (optional) */}
        <div>
          <label className="form-label" htmlFor="notes">
            Internal Notes
            <span className="ml-1 text-slate-400 font-normal text-xs">(optional)</span>
          </label>
          <textarea
            id="notes"
            rows={2}
            className="form-input resize-none"
            placeholder="Additional notes for the school records..."
            {...register('notes')}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              reset();
              setLookupStudent(null);
              setLookupError(null);
              setSelectedType('income');
            }}
            className="btn-secondary flex-1"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !lookupStudent}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${submitSuccess
                ? 'bg-green-600 text-white'
                : selectedType === 'income' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Recording...
              </>
            ) : submitSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Recorded!
              </>
            ) : (
              `Record ${selectedType === 'income' ? 'Income' : 'Expense'}`
            )}
          </button>
        </div>

        {/* Quick reference */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Quick Reference — Student Numbers</p>
          <div className="grid grid-cols-2 gap-1">
            {['STU-1001 — Aiden Park', 'STU-1002 — Brianna Torres', 'STU-1042 — James Okonkwo', 'STU-1078 — Sofia Ramirez'].map((hint, i) => (
              <button
                key={`hint-${i}`}
                type="button"
                onClick={() => setValue('studentNumber', hint.split(' — ')[0])}
                className="text-left text-xs text-blue-600 hover:text-blue-800 font-mono bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors truncate"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}