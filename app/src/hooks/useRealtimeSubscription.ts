'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
}

export function useRealtimeSubscription({
  table,
  filter,
  event = '*',
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeSubscriptionOptions) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = createClient();

  // Use refs to store the latest callback functions
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onChangeRef = useRef(onChange);

  // Update refs when callbacks change
  useEffect(() => {
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
    onChangeRef.current = onChange;
  }, [onInsert, onUpdate, onDelete, onChange]);

  useEffect(() => {
    // Only run on client side to avoid hydration issues
    if (typeof window === 'undefined') return;
    
    const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`;
    
    const realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: event as any,
          schema: 'public',
          table,
          filter,
        } as any,
        (payload: RealtimePostgresChangesPayload<Record<string, any>>) => {
          console.log('Realtime payload:', payload);
          
          // Call the appropriate handler based on event type using refs
          switch (payload.eventType) {
            case 'INSERT':
              onInsertRef.current?.(payload);
              break;
            case 'UPDATE':
              onUpdateRef.current?.(payload);
              break;
            case 'DELETE':
              onDeleteRef.current?.(payload);
              break;
          }
          
          // Always call the general onChange handler using ref
          onChangeRef.current?.(payload);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    setChannel(realtimeChannel);

    return () => {
      console.log('Unsubscribing from realtime channel:', channelName);
      realtimeChannel.unsubscribe();
    };
  }, [table, filter, event, supabase]); // Only stable dependencies

  return channel;
}

// Specific hook for documents realtime updates
export function useDocumentsRealtime(onDocumentChange: (document: any) => void) {
  const onDocumentChangeRef = useRef(onDocumentChange);
  
  // Update ref when callback changes
  useEffect(() => {
    onDocumentChangeRef.current = onDocumentChange;
  }, [onDocumentChange]);

  const stableOnChange = useCallback((payload: RealtimePostgresChangesPayload<Record<string, any>>) => {
    // Handle all document changes (INSERT, UPDATE, DELETE)
    if (payload.new) {
      onDocumentChangeRef.current(payload.new);
    } else if (payload.old && payload.eventType === 'DELETE') {
      onDocumentChangeRef.current({ ...payload.old, _deleted: true });
    }
  }, []);

  return useRealtimeSubscription({
    table: 'documents',
    onChange: stableOnChange
  });
}