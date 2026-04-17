export type Role = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  studentId?: string;
}

export interface Student {
  id: string;
  studentNumber: string;
  name: string;
  className: string;
  grade: string;
  enrolledDate: string;
  email?: string;
  profilePic?: string;
}

export interface Transaction {
  id: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  className: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  recordedBy: string;
  status: 'confirmed' | 'pending' | 'voided';
}

export const MOCK_USERS: User[] = [
  { id: 'usr-001', name: 'Admin', email: 'admin@accounttracker.edu', password: 'Admin@2026', role: 'admin' },
];

export const MOCK_STUDENTS: Student[] = [];

export const MOCK_TRANSACTIONS: Transaction[] = [];

export function getStudentByNumber(studentNumber: string): Student | undefined {
  return MOCK_STUDENTS.find(s => s.studentNumber.toLowerCase() === studentNumber.toLowerCase());
}

export function getTransactionsByStudentId(studentId: string): Transaction[] {
  return MOCK_TRANSACTIONS.filter(t => t.studentId === studentId);
}

export function getStudentBalance(studentId: string): number {
  const txns = getTransactionsByStudentId(studentId);
  return txns.reduce((acc, t) => {
    if (t.status === 'voided') return acc;
    return t.type === 'income' ? acc + t.amount : acc - t.amount;
  }, 0);
}