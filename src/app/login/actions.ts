'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = (formData.get('redirectTo') as string) || '/'

  // --- Development Backdoor for Testing UI ---
  if (email === 'admin@test.com' && password === 'password') {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.set('dev_admin_auth', 'true', { path: '/', httpOnly: true })
    redirect(redirectTo)
  }
  // -------------------------------------------

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`)
  }

  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

export async function logout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (e) {
    // ignore
  }
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.delete('dev_admin_auth')
  redirect('/login')
}
