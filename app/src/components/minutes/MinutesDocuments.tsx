'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { useDocumentsRealtime } from '@/hooks/useRealtimeSubscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  FileText,
  Image,
  Video,
  FileAudio,
  Archive,
  Upload,
  Calendar,
  CheckCircle,
  Clock,
  FileCheck,
} from 'lucide-react';
import { format } from 'date-fns';

type Document = Database['public']['Tables']['documents']['Row'] & {
  profiles?: { full_name: string | null; email: string } | null;
  categories?: { name: string; color: string | null } | null;
};

type Category = Database['public']['Tables']['categories']['Row'];

interface MinutesDocumentsProps {
  initialDocuments: Document[];
  categories: Category[];
  userId: string;
  userRole: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return FileAudio;
  if (fileType.includes('zip') || fileType.includes('rar')) return Archive;
  return FileText;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function MinutesDocuments({
  initialDocuments,
  categories,
  userId,
  userRole
}: MinutesDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const supabase = createClient();

  // Real-time subscription for document updates
  useDocumentsRealtime((updatedDocument: any) => {
    if (updatedDocument && updatedDocument.id) {
      // Only handle minutes documents (filter by tags or category)
      const isMinutesDocument = updatedDocument.tags?.includes('minutes') || 
        updatedDocument.tags?.includes('meeting_minutes');
      
      if (!isMinutesDocument) return;

      // Handle document deletion
      if (updatedDocument._deleted) {
        setDocuments(prev => prev.filter(doc => doc.id !== updatedDocument.id));
        toast.info(`Minutes document "${updatedDocument.title}" was deleted`);
        return;
      }

      setDocuments(prev => {
        const exists = prev.find(doc => doc.id === updatedDocument.id);
        if (exists) {
          return prev.map(doc =>
            doc.id === updatedDocument.id
              ? { ...doc, ...updatedDocument }
              : doc
          );
        } else {
          return [updatedDocument as Document, ...prev];
        }
      });

      if (updatedDocument.created_by !== userId) {
        toast.info(`New minutes document uploaded: ${updatedDocument.title}`);
      }
    }
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || doc.category_id === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'published' && doc.is_published) ||
      (statusFilter === 'unpublished' && !doc.is_published);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`);
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Failed to download file: ${errorData.error}`);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDocuments(documents.map(document =>
        document.id === doc.id
          ? { ...document, download_count: (document.download_count || 0) + 1 }
          : document
      ));

      toast.success('Minutes document downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download minutes document');
    }
  };

  const handlePreview = async (document: Document) => {
    try {
      const viewUrl = `/api/documents/${document.id}/view`;
      window.open(viewUrl, '_blank');

      setDocuments(documents.map(doc =>
        doc.id === document.id
          ? { ...doc, view_count: (doc.view_count || 0) + 1 }
          : doc
      ));

      toast.success('Minutes document opened for viewing');
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to preview minutes document');
    }
  };

  const handleTogglePublished = async (documentId: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          is_published: isPublished,
          published_at: isPublished ? new Date().toISOString() : null,
          updated_by: userId
        })
        .eq('id', documentId);

      if (error) {
        toast.error(`Failed to ${isPublished ? 'publish' : 'unpublish'} minutes document`);
        return;
      }

      setDocuments(documents.map(doc =>
        doc.id === documentId
          ? {
            ...doc,
            is_published: isPublished,
            published_at: isPublished ? new Date().toISOString() : null
          }
          : doc
      ));

      toast.success(`Minutes document ${isPublished ? 'published' : 'unpublished'} successfully`);
    } catch {
      toast.error('An unexpected error occurred');
    }
  };

  const canEditDocument = (document: Document) => {
    return userRole === 'admin' || document.created_by === userId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <FileCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minutes Documents</h1>
          <p className="text-gray-600">Manage and access meeting minutes documents</p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search minutes documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.filter(cat => cat.type === 'meeting' || cat.type === 'document').map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="unpublished">Unpublished</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>

          {userRole === 'admin' && (
            <Button asChild>
              <a href="/dashboard/minutes/documents/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Minutes Document
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Minutes Documents ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((document) => {
                const FileIcon = getFileIcon(document.file_type);

                return (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{document.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {document.filename}
                          </div>
                          {document.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {document.description.substring(0, 100)}
                              {document.description.length > 100 && '...'}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {document.categories ? (
                        <Badge
                          variant="secondary"
                          style={{ backgroundColor: `${document.categories.color || '#6B7280'}20` }}
                        >
                          {document.categories.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Uncategorized</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="text-sm">
                        {formatFileSize(document.file_size)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">
                            {document.created_at ? format(new Date(document.created_at), 'MMM d, yyyy') : 'Unknown date'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            by {document.profiles?.full_name || document.profiles?.email || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={document.is_published ?? false}
                          onCheckedChange={(checked) => handleTogglePublished(document.id, checked)}
                          disabled={!canEditDocument(document)}
                        />
                        <span className="text-sm">
                          {document.is_published ? (
                            <Badge variant="default" className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                              <Clock className="w-3 h-3 mr-1" />
                              Draft
                            </Badge>
                          )}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(document)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}