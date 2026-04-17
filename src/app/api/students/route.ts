import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We create a fresh stateless client for the server route.
// Using the anon key means we are limited by RLS, but since we just need to call signUp
// and then insert into students, this will work. 
// NOTE: `supabase.auth.signUp()` automatically confirms the user if email confirmations are off, 
// and creates an auth session for the newly created user in THIS client instance. 
// It DOES NOT affect the browser session because it's a server-side fetch.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } } // Don't persist session in memory on server
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentNumber, name, email, classLevel, section, enrolledDate } = body;

    const className = classLevel === 'Staff' ? 'Staff' : `Class ${classLevel}-${section}`;
    
    // Supabase Auth enforces a minimum password length (often 6).
    // For short student numbers, derive a deterministic password so account creation succeeds.
    if (studentNumber.length < 3) {
      return NextResponse.json(
        { error: 'Student number must be at least 3 characters to be used as login password.' },
        { status: 400 }
      );
    }
    const generatedPassword = studentNumber.length >= 6
      ? studentNumber
      : `${studentNumber}${'0'.repeat(6 - studentNumber.length)}`;

    // 1. Create the Auth User for the student
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: generatedPassword,
      options: {
        data: {
          name,
          role: 'user', // Default student role
          student_id: studentNumber
        }
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;

    // 2. Insert into the students table
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({
        id: studentNumber,
        student_number: studentNumber,
        name,
        class_name: className,
        grade: classLevel,
        enrolled_date: enrolledDate,
        email: email
      })
      .select()
      .single();

    if (studentError) {
      console.error('Db Error:', studentError);
      return NextResponse.json({ error: studentError.message }, { status: 400 });
    }

    // 3. Insert into the profiles table
    if (userId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: name,
          role: 'user',
          student_id: studentNumber
        });
      
      if (profileError) {
        console.error('Profile Insert Error:', profileError);
      }
    }

    return NextResponse.json({ success: true, student: studentData, generatedPassword });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
