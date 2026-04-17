'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from './supabase';
import { toast } from 'sonner';

interface AuthContextType {
  currentUser: any | null;
  role: 'admin' | 'user' | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to load extra profile data from the 'profiles' table
  const loadProfile = async (user: any) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        const normalizedUser = {
          ...user,
          ...data,
          // App components read camelCase; DB stores snake_case.
          studentId: data.student_id ?? user?.user_metadata?.student_id ?? null,
          name: data.name ?? user?.user_metadata?.name ?? user?.email ?? 'User',
          role: (data.role as 'admin' | 'user') ?? 'user',
        };
        setCurrentUser(normalizedUser);
        setRole(normalizedUser.role);
      } else {
        // Fallback
        setCurrentUser({
          ...user,
          studentId: user?.user_metadata?.student_id ?? null,
          name: user?.user_metadata?.name ?? user?.email ?? 'User',
          role: 'user',
        });
        setRole('user');
      }
    } catch (e) {
      setCurrentUser({
        ...user,
        studentId: user?.user_metadata?.student_id ?? null,
        name: user?.user_metadata?.name ?? user?.email ?? 'User',
        role: 'user',
      });
      setRole('user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setLoading(false);
      }
    };
    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setCurrentUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) {
       return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      role,
      login,
      logout,
      isAdmin: role === 'admin',
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}