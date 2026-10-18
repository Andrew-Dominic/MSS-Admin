'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // --- Development Backdoor for Testing UI ---
  if (email === 'admin@test.com' && password === 'password') {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.set('dev_admin_auth', 'true')
    redirect('/schemes/new')
  }
  // -------------------------------------------

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=Could not authenticate user')
  }

  revalidatePath('/', 'layout')
  redirect('/schemes/new')
}
