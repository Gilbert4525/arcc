'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Download, CheckCircle } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  filename: string;
  is_published: boolean;
  view_count: number;
  download_count: number;
  created_at: string;
  published_at: string | null;
}

interface DocumentAnalyticsProps {
  documents: Document[];
  total: number;
}

export function DocumentAnalytics({ documents, total }: DocumentAnalyticsProps) {
  const publishedDocs = documents.filter(d => d.is_published);
  const draftDocs = documents.filter(d => !d.is_published);
  
  const totalViews = documents.reduce((sum, doc) => sum + (doc.view_count || 0), 0);
  const totalDownloads = documents.reduce((sum, doc) => sum + (doc.download_count || 0), 0);
  
  const publishRate = total > 0 ? (publishedDocs.length / total) * 100 : 0;
  const avgViewsPerDoc = documents.length > 0 ? totalViews / documents.length : 0;
  const avgDownloadsPerDoc = documents.length > 0 ? totalDownloads / documents.length : 0;

  // Get most popular documents
  const mostViewed = [...documents]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 5);

  const mostDownloaded = [...documents]
    .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary">{publishedDocs.length} Published</Badge>
              <Badge variant="outline">{draftDocs.length} Draft</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {avgViewsPerDoc.toFixed(1)} per document
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalDownloads}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {avgDownloadsPerDoc.toFixed(1)} per document
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publish Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{publishRate.toFixed(1)}%</div>
            <Progress value={publishRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Popular Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              Most Viewed Documents
            </CardTitle>
            <CardDescription>
              Documents with highest view counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostViewed.length > 0 ? (
                mostViewed.map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {doc.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.is_published ? 'Published' : 'Draft'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{doc.view_count || 0}</p>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No documents found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="mr-2 h-5 w-5" />
              Most Downloaded Documents
            </CardTitle>
            <CardDescription>
              Documents with highest download counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostDownloaded.length > 0 ? (
                mostDownloaded.map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {doc.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.is_published ? 'Published' : 'Draft'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{doc.download_count || 0}</p>
                      <p className="text-xs text-muted-foreground">downloads</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No documents found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}