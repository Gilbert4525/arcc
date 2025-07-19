'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type TableName = keyof Database['public']['Tables'];
type RowData<T extends TableName> = Database['public']['Tables'][T]['Row'];

interface UseRealtimeSubscriptionOptions<T extends TableName> {
  table: T;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: RowData<T>) => void;
  onUpdate?: (payload: RowData<T>) => void;
  onDelete?: (payload: { old_record: RowData<T> }) => void;
}

export function useRealtimeSubscription<T extends TableName>({
  table,
  filter,
  event = '*',
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeSubscriptionOptions<T>) {
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete };
  }, [onInsert, onUpdate, onDelete]);

  useEffect(() => {
    // Only create subscription if we don't have one or if core params changed
    if (subscriptionRef.current) {
      return;
    }

    const setupSubscription = () => {
      const channelName = `realtime-${table}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes' as any,
          {
            event: event,
            schema: 'public',
            table: table,
            filter: filter,
          } as any,
          (payload: any) => {
            // Use current callbacks from ref to avoid stale closures
            const { onInsert: currentOnInsert, onUpdate: currentOnUpdate, onDelete: currentOnDelete } = callbacksRef.current;

            switch (payload.eventType) {
              case 'INSERT':
                if (currentOnInsert) {
                  currentOnInsert(payload.new as RowData<T>);
                }
                break;
              case 'UPDATE':
                if (currentOnUpdate) {
                  currentOnUpdate(payload.new as RowData<T>);
                }
                break;
              case 'DELETE':
                if (currentOnDelete) {
                  currentOnDelete({ old_record: payload.old as RowData<T> });
                }
                break;
            }
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
          if (status === 'CLOSED' && subscriptionRef.current) {
            // Auto-reconnect on connection loss
            setTimeout(() => {
              if (subscriptionRef.current) {
                setupSubscription();
              }
            }, 1000);
          }
        });

      subscriptionRef.current = channel;
    };

    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsConnected(false);
      }
    };
  }, [table, filter, event, supabase]); // Only re-subscribe on core parameter changes

  return { isConnected };
}

// Specialized hooks for common use cases

export function useDocumentsRealtime(onUpdate?: (documents: RowData<'documents'>) => void) {
  return useRealtimeSubscription({
    table: 'documents',
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate ? () => onUpdate({} as RowData<'documents'>) : undefined,
  });
}

export function useMeetingsRealtime(onUpdate?: (meeting: RowData<'meetings'>) => void) {
  return useRealtimeSubscription({
    table: 'meetings',
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate ? () => onUpdate({} as RowData<'meetings'>) : undefined,
  });
}

export function useResolutionsRealtime(onUpdate?: (resolution: RowData<'resolutions'>) => void) {
  return useRealtimeSubscription({
    table: 'resolutions',
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate ? () => onUpdate({} as RowData<'resolutions'>) : undefined,
  });
}

export function useResolutionVotesRealtime(
  resolutionId?: string,
  onVote?: (vote: RowData<'resolution_votes'>) => void
) {
  return useRealtimeSubscription({
    table: 'resolution_votes',
    filter: resolutionId ? `resolution_id=eq.${resolutionId}` : undefined,
    onInsert: onVote,
    onUpdate: onVote,
  });
}
