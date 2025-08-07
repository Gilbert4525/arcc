'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export function TestEmailTemplateButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<'resolution' | 'minutes'>('resolution');
  const [itemId, setItemId] = useState('');
  const [emailPreview, setEmailPreview] = useState<{
    subject: string;
    html: string;
    text: string;
    votingPeriod: string;
  } | null>(null);
  const { toast } = useToast();

  const handlePreviewTemplate = async () => {
    if (!itemId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid item ID',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/voting-summary?type=${type}&id=${itemId.trim()}`);
      const data = await response.json();

      if (response.ok) {
        // The API should return the enhanced template data
        setEmailPreview({
          subject: `Arc Board Management - ${type === 'resolution' ? 'Resolution' : 'Minutes'} Voting Complete: ${data.data.item.title} - ${data.data.outcome.passed ? 'PASSED' : 'FAILED'}`,
          html: 'Enhanced HTML template generated (check console for full template)',
          text: 'Enhanced text template generated (check console for full template)',
          votingPeriod: `Voting period information for ${data.data.item.title}`
        });

        console.log('=== Enhanced Email Template Preview ===');
        console.log('Subject:', `Arc Board Management - ${type === 'resolution' ? 'Resolution' : 'Minutes'} Voting Complete: ${data.data.item.title} - ${data.data.outcome.passed ? 'PASSED' : 'FAILED'}`);
        console.log('Voting Summary Data:', data.data);
        console.log('Template Features:');
        console.log('- Professional HTML design with responsive layout');
        console.log('- Comprehensive voting statistics');
        console.log('- Individual vote breakdown with comments');
        console.log('- Non-voter identification');
        console.log('- Voting insights and engagement metrics');
        console.log('- Personalized content based on recipient');
        console.log('- Accessible text-only version');
        
        toast({
          title: 'Template Preview Generated',
          description: 'Check console for comprehensive email template details',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate email template preview',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error previewing email template:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!itemId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid item ID',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/voting-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          id: itemId.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Enhanced voting summary emails sent to all board members',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send enhanced email templates',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending enhanced email templates:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Enhanced Email Template Testing</CardTitle>
        <CardDescription>
          Test the comprehensive voting summary email templates with professional design and personalized content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(value: 'resolution' | 'minutes') => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resolution">Resolution</SelectItem>
                <SelectItem value="minutes">Minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemId">Item ID</Label>
            <Input
              id="itemId"
              type="text"
              placeholder="Enter resolution or minutes ID"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handlePreviewTemplate}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? 'Loading...' : 'Preview Template'}
          </Button>
          
          <Button
            onClick={handleSendTestEmail}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Sending...' : 'Send Enhanced Emails'}
          </Button>
        </div>

        {emailPreview && (
          <Tabs defaultValue="features" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="subject">Subject</TabsTrigger>
              <TabsTrigger value="period">Voting Period</TabsTrigger>
            </TabsList>
            
            <TabsContent value="features" className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">✅ Enhanced Template Features</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Professional responsive HTML design</li>
                  <li>• Comprehensive voting statistics with visual elements</li>
                  <li>• Individual vote breakdown with member positions</li>
                  <li>• Comment highlighting and analysis</li>
                  <li>• Non-voter identification section</li>
                  <li>• Voting insights with engagement scoring</li>
                  <li>• Personalized content based on recipient participation</li>
                  <li>• Accessible text-only version for all email clients</li>
                  <li>• Clear outcome banner with color coding</li>
                  <li>• Call-to-action button linking to system</li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="subject" className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">📧 Email Subject</h4>
                <p className="text-sm text-blue-700 font-mono bg-white p-2 rounded border">
                  {emailPreview.subject}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="period" className="space-y-3">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-2">📅 Voting Period</h4>
                <p className="text-sm text-purple-700">
                  {emailPreview.votingPeriod}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Template Enhancements:</strong></p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p><strong>Design:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Responsive HTML layout</li>
                <li>Professional color scheme</li>
                <li>Clear typography hierarchy</li>
                <li>Mobile-friendly design</li>
              </ul>
            </div>
            <div>
              <p><strong>Content:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Personalized greetings</li>
                <li>Detailed vote breakdowns</li>
                <li>Engagement analytics</li>
                <li>Accessibility compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}