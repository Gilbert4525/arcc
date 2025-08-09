'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function TestProductionGmailButton() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleTest = async () => {
        setIsLoading(true);
        try {
            console.log('🧪 Testing production Gmail SMTP...');
            
            const response = await fetch('/api/test-production-gmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'boardmixllc@gmail.com'
                })
            });

            const data = await response.json();
            console.log('📧 Production Gmail test response:', data);

            if (data.success) {
                toast({
                    title: "✅ Production Gmail Test Successful",
                    description: `Test email sent successfully to ${data.testEmail}`,
                    variant: "default",
                });
                console.log('✅ Production Gmail SMTP working correctly');
            } else {
                toast({
                    title: "❌ Production Gmail Test Failed",
                    description: data.message || 'Unknown error occurred',
                    variant: "destructive",
                });
                console.error('❌ Production Gmail test failed:', data);
            }
        } catch (error) {
            console.error('❌ Production Gmail test error:', error);
            toast({
                title: "❌ Test Error",
                description: "Failed to test production Gmail SMTP",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Production Gmail SMTP Test</h3>
                    <p className="text-sm text-gray-600">
                        Test Gmail SMTP service optimized for production/Vercel environment
                    </p>
                </div>
                <Button 
                    onClick={handleTest} 
                    disabled={isLoading}
                    variant="outline"
                    className="min-w-[120px]"
                >
                    {isLoading ? 'Testing...' : 'Test Production Gmail'}
                </Button>
            </div>
            
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <strong>Note:</strong> This tests the production-optimized Gmail service designed for Vercel serverless functions.
                It includes timeout protection and proper connection handling for production environments.
            </div>
        </div>
    );
}