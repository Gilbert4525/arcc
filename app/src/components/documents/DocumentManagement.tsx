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
  EyeOff,
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
} from 'lucide-react';
import { format } from 'date-fns';

type Document = Database['public']['Tables']['documents']['Row'] & {
  profiles?: { full_name: string | null; email: string } | null;
  categories?: { name: string; color: string } | null;
};

type Category = Database['public']['Tables']['categories']['Row'];

interface DocumentManagementProps {
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

export function DocumentManagement({
  initialDocuments,
  categories,
  userId,
  userRole
}: DocumentManagementProps) {
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
  useDocumentsRealtime((updatedDocument) => {
    if (updatedDocument && updatedDocument.id) {
      setDocuments(prev => {
        const exists = prev.find(doc => doc.id === updatedDocument.id);
        if (exists) {
          // Update existing document
          return prev.map(doc =>
            doc.id === updatedDocument.id
              ? { ...doc, ...updatedDocument }
              : doc
          );
        } else {
          // Add new document
          return [updatedDocument as Document, ...prev];
        }
      });

      // Show notification for new documents from other users
      if (updatedDocument.created_by !== userId) {
        toast.info(`New document uploaded: ${updatedDocument.title}`);
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
      // Use API endpoint for secure download
      const response = await fetch(`/api/documents/${doc.id}/download`);

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Failed to download file: ${errorData.error}`);
        return;
      }

      // Get the file blob
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update local state (download count is updated by API)
      setDocuments(documents.map(document =>
        document.id === doc.id
          ? { ...document, download_count: (document.download_count || 0) + 1 }
          : document
      ));

      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handlePreview = async (document: Document) => {
    try {
      // Use API endpoint for secure viewing
      const viewUrl = `/api/documents/${document.id}/view`;

      // Open in new tab for viewing
      window.open(viewUrl, '_blank');

      // Update local state (view count is updated by API)
      setDocuments(documents.map(doc =>
        doc.id === document.id
          ? { ...doc, view_count: (doc.view_count || 0) + 1 }
          : doc
      ));

      toast.success('Document opened for viewing');
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to preview file');
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
        toast.error(`Failed to ${isPublished ? 'publish' : 'unpublish'} document`);
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

      toast.success(`Document ${isPublished ? 'published' : 'unpublished'} successfully`);
    } catch {
      toast.error('An unexpected error occurred');
    }
  };

  const handleEditDocument = async (formData: FormData) => {
    if (!editingDocument) return;

    setLoading(true);

    try {
      const title = formData.get('title') as string;
      const description = formData.get('description') as string;
      const category_id = formData.get('category_id') as string;
      const tagsString = formData.get('tags') as string;
      const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean) : null;

      const { data, error } = await supabase
        .from('documents')
        .update({
          title,
          description: description || null,
          category_id: category_id || null,
          tags,
          updated_by: userId,
        })
        .eq('id', editingDocument.id)
        .select(`
          *,
          profiles:created_by(full_name, email),
          categories(name, color)
        `)
        .single();

      if (error) {
        toast.error(`Failed to update document: ${error.message}`);
        return;
      }

      setDocuments(documents.map(doc => doc.id === editingDocument.id ? data as unknown as Document : doc));
      setIsEditDialogOpen(false);
      setEditingDocument(null);
      toast.success('Document updated successfully');
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) {
        toast.error(`Failed to delete file: ${storageError.message}`);
        return;
      }

      // Delete document record
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        toast.error(`Failed to delete document: ${dbError.message}`);
        return;
      }

      setDocuments(documents.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
    } catch {
      toast.error('An unexpected error occurred');
    }
  };

  const canEditDocument = (document: Document) => {
    return userRole === 'admin' || document.created_by === userId;
  };

  const loadEditingDocument = (document: Document) => {
    setEditingDocument(document);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 flex-1">
          <div className="flex-1 sm:max-w-sm relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          <div className="flex space-x-2 sm:space-x-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="unpublished">Unpublished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <div className="flex space-x-2 sm:hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="flex-1"
            >
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="flex-1"
            >
              Grid
            </Button>
          </div>

          <div className="hidden sm:flex sm:space-x-2">
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
          </div>

          <Button asChild className="w-full sm:w-auto">
            <a href="/dashboard/documents/upload">
              <Upload className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Upload Document</span>
              <span className="sm:hidden">Upload</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Documents List */}
      {viewMode === 'table' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Documents ({filteredDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              {filteredDocuments.map((document) => {
                const FileIcon = getFileIcon(document.file_type);
                return (
                  <div key={document.id} className="border-b border-gray-200 p-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <FileIcon className="h-6 w-6 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{document.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{document.filename}</p>
                        {document.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {document.description.substring(0, 80)}
                            {document.description.length > 80 && '...'}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant={document.is_published ? 'default' : 'secondary'} className="text-xs">
                          {document.is_published ? 'Published' : 'Draft'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(document.file_size)}
                        </span>
                      </div>
                    </div>
                    
                    {document.tags && document.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {document.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {document.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{document.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(document.created_at || new Date()), 'MMM d, yyyy')}
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(document)}
                          className="h-8 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(document)}
                          className="h-8 px-2"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {userRole === 'admin' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePublished(document.id, !document.is_published)}
                              className="h-8 px-2"
                            >
                              {document.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 px-2">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{document.title}&quot;?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteDocument(document.id, document.file_path)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stats</TableHead>
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
                            {document.tags && document.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {document.tags.slice(0, 3).map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {document.tags.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{document.tags.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {document.categories ? (
                          <Badge
                            variant="secondary"
                            style={{ backgroundColor: `${document.categories.color}20` }}
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
                        <div className="text-sm space-y-1">
                          <div className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{document.view_count} views</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Download className="h-3 w-3" />
                            <span>{document.download_count} downloads</span>
                          </div>
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

                          {canEditDocument(document) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => loadEditingDocument(document)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete &quot;{document.title}&quot;?
                                      This action cannot be undone and will permanently delete the file.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteDocument(document.id, document.file_path)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocuments.map((document) => {
            const FileIcon = getFileIcon(document.file_type);

            return (
              <Card key={document.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <FileIcon className="h-10 w-10 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{document.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {document.filename}
                      </p>
                    </div>
                  </div>

                  {document.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {document.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Size:</span>
                      <span>{formatFileSize(document.file_size)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>Views:</span>
                      <span>{document.view_count}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>Downloads:</span>
                      <span>{document.download_count}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <span>
                        {document.is_published ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 text-xs">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Draft
                          </Badge>
                        )}
                      </span>
                    </div>
                  </div>

                  {document.tags && document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {document.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {document.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{document.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
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

                      {canEditDocument(document) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadEditingDocument(document)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {document.created_at ? format(new Date(document.created_at), 'MMM d') : 'Unknown'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Document Dialog */}
      {editingDocument && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Document</DialogTitle>
              <DialogDescription>
                Update document information and metadata.
              </DialogDescription>
            </DialogHeader>

            <form action={handleEditDocument} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_title">Title *</Label>
                <Input
                  id="edit_title"
                  name="title"
                  defaultValue={editingDocument.title}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  name="description"
                  defaultValue={editingDocument.description || ''}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_category_id">Category</Label>
                <Select name="category_id" defaultValue={editingDocument.category_id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_tags">Tags (comma-separated)</Label>
                <Input
                  id="edit_tags"
                  name="tags"
                  defaultValue={editingDocument.tags?.join(', ') || ''}
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingDocument(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  Update Document
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
