"use client";

import { useEffect } from "react";
import { createBrowserClient } from '@supabase/ssr'

export function RealtimeNotifications() {
  useEffect(() => {
    // Create the Supabase client using browser environment variables
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Listen to changes on the schemes table in the public schema
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, and DELETE
          schema: 'catalog',
          table: 'scheme',
        },
        (payload) => {
          console.log('Real-time scheme change detected:', payload)
          
          if (payload.eventType === 'INSERT') {
            alert(`Real-time update: A new scheme was just added!`);
          } else if (payload.eventType === 'UPDATE') {
            alert(`Real-time update: A scheme was just updated!`);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to scheme updates');
        } else if (err) {
          console.warn('[Realtime] Subscription notice:', status, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // This is a logic-only component, it doesn't render UI directly
  return null; 
}
