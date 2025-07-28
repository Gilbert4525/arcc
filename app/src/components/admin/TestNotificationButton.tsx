'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TestNotificationButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTestNotification = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: 'Test notification created successfully!',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to create test notification',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating test notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to create test notification',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full" 
      onClick={handleTestNotification}
      disabled={isLoading}
    >
      <Bell className="mr-2 h-4 w-4" />
      {isLoading ? 'Creating...' : 'Test Notification'}
    </Button>
  );
}