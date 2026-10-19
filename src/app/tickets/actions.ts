'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requireAdminAuth } from '@/lib/authGuard';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string | null;
  category: string;
  contact_email: string;
  description: string;
  status: TicketStatus;
  created_at: string;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase service configuration');
  }

  return createSupabaseClient(url, key);
}

export async function fetchSupportTickets(): Promise<{ data: SupportTicket[]; error?: string }> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[fetchSupportTickets] Error:', error);
      return { data: [], error: error.message };
    }

    return { data: (data as SupportTicket[]) || [] };
  } catch (err: any) {
    console.error('[fetchSupportTickets] Unexpected error:', err);
    return { data: [], error: err.message || 'Failed to fetch tickets' };
  }
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAuth();
    const validStatuses: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: `Invalid status: ${newStatus}` };
    }

    const supabase = getAdminClient();
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);

    if (error) {
      console.error('[updateTicketStatus] Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/tickets');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('[updateTicketStatus] Unexpected error:', err);
    return { success: false, error: err.message || 'Failed to update ticket status' };
  }
}
