import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

import { NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  // Completely bypassed security for now, as requested.
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
