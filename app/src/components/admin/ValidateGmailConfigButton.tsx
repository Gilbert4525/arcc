'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ValidationResult {
  status: string;
  overallStatus: string;
  validation: {
    timestamp: string;
    requirements: {
      host: string;
      port: number;
      encryption: string;
      username: string;
      emailFrom: string;
    };
    current: {
      gmailEmail: string;
      gmailAppPassword: string;
      appPasswordLength: number;
      appPasswordFormat: string;
    };
    checks: {
      emailMatches: boolean;
      passwordExists: boolean;
      passwordFormatCorrect: boolean;
      canConnect: boolean;
      canAuthenticate: boolean;
    };
    issues: string[];
    recommendations: string[];
  };
  summary: {
    configured: boolean;
    connected: boolean;
    authenticated: boolean;
    ready: boolean;
  };
  nextSteps: string[];
}

export function ValidateGmailConfigButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const { toast } = useToast();

  const handleValidate = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/validate-gmail-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast({
          title: data.overallStatus === 'READY' ? 'Gmail Configuration Valid ✅' : 'Configuration Issues Found ⚠️',
          description: `Status: ${data.overallStatus}`,
          variant: data.overallStatus === 'READY' ? 'default' : 'destructive',
        });
      } else {
        toast({
          title: 'Validation Failed ❌',
          description: data.error || 'Gmail configuration validation failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error validating Gmail config:', error);
      toast({
        title: 'Network Error ❌',
        description: 'Failed to connect to validation endpoint',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getOverallStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return <Badge className="bg-green-500">Ready ✅</Badge>;
      case 'NEEDS_CONFIGURATION':
        return <Badge className="bg-red-500">Needs Configuration ❌</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Gmail Configuration Validator</CardTitle>
          <CardDescription>
            Validate Gmail SMTP settings against screenshot requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleValidate}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Validating Configuration...' : 'Validate Gmail Config'}
          </Button>

          {result && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Validation Results</h3>
                {getOverallStatusBadge(result.overallStatus)}
              </div>

              {/* Requirements vs Current */}
              <div className="space-y-2">
                <h4 className="font-medium">Required Settings (From Screenshot)</h4>
                <div className="bg-blue-50 p-3 rounded-lg text-sm space-y-1">
                  <div><strong>Host:</strong> {result.validation.requirements.host}</div>
                  <div><strong>Port:</strong> {result.validation.requirements.port}</div>
                  <div><strong>Encryption:</strong> {result.validation.requirements.encryption}</div>
                  <div><strong>Username:</strong> {result.validation.requirements.username}</div>
                  <div><strong>Email From:</strong> {result.validation.requirements.emailFrom}</div>
                </div>
              </div>

              {/* Current Configuration */}
              <div className="space-y-2">
                <h4 className="font-medium">Current Configuration</h4>
                <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                  <div><strong>Gmail Email:</strong> {result.validation.current.gmailEmail}</div>
                  <div><strong>App Password:</strong> {result.validation.current.gmailAppPassword}</div>
                  <div><strong>Password Length:</strong> {result.validation.current.appPasswordLength} chars</div>
                  <div><strong>Password Format:</strong> {result.validation.current.appPasswordFormat}</div>
                </div>
              </div>

              {/* Validation Checks */}
              <div className="space-y-2">
                <h4 className="font-medium">Validation Checks</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Email Matches Requirement:</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(result.validation.checks.emailMatches)}
                      <span>{result.validation.checks.emailMatches ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>App Password Exists:</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(result.validation.checks.passwordExists)}
                      <span>{result.validation.checks.passwordExists ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Password Format Correct:</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(result.validation.checks.passwordFormatCorrect)}
                      <span>{result.validation.checks.passwordFormatCorrect ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Can Connect to Gmail:</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(result.validation.checks.canConnect)}
                      <span>{result.validation.checks.canConnect ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Can Authenticate:</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(result.validation.checks.canAuthenticate)}
                      <span>{result.validation.checks.canAuthenticate ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issues */}
              {result.validation.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    Issues Found
                  </h4>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <ul className="text-sm space-y-1">
                      {result.validation.issues.map((issue, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2 text-red-500">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {result.nextSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Next Steps</h4>
                  <div className={`p-3 rounded-lg ${result.overallStatus === 'READY' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <ul className="text-sm space-y-1">
                      {result.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-2">
                <h4 className="font-medium">Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Configured</p>
                    <Badge variant={result.summary.configured ? 'default' : 'destructive'}>
                      {result.summary.configured ? 'Yes ✅' : 'No ❌'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Ready to Send</p>
                    <Badge variant={result.summary.ready ? 'default' : 'destructive'}>
                      {result.summary.ready ? 'Yes ✅' : 'No ❌'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}