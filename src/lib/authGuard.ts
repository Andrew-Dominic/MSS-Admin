import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Ensures the executing server action is called by an authenticated admin session.
 * Throws an Error('Unauthorized') if neither Supabase user nor local dev admin cookie is present.
 */
export async function requireAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  
  // 1. Check development admin session cookie
  if (cookieStore.get('dev_admin_auth')?.value === 'true') {
    return true;
  }

  // 2. Check Supabase authenticated user session
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return true;
    }
  } catch (err) {
    // Supabase auth failed or env not configured
  }

  throw new Error('Unauthorized: Admin session required to perform this action.');
}
