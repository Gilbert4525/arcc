'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Upload, 
  File, 
  X, 
  Check, 
  AlertCircle,
  FileText,
  Image,
  Video,
  FileAudio,
  Archive,
} from 'lucide-react';

type Category = Database['public']['Tables']['categories']['Row'];

interface DocumentUploadProps {
  categories: Category[];
  userId: string;
}

interface UploadFile {
  file: File;
  id: string;
  title: string;
  description: string;
  categoryId: string;
  tags: string[];
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'video/*': ['.mp4', '.avi', '.mov', '.wmv'],
  'audio/*': ['.mp3', '.wav', '.m4a'],
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return FileAudio;
  if (fileType.includes('zip') || fileType.includes('rar')) return Archive;
  return FileText;
};

export function DocumentUpload({ categories, userId }: DocumentUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const supabase = createClient();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      description: '',
      categoryId: '',
      tags: [],
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === 'file-too-large') {
            toast.error(`File ${file.name} is too large. Maximum size is 50MB.`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`File ${file.name} is not a supported format.`);
          }
        });
      });
    },
  });

  const updateFileField = (id: string, field: keyof UploadFile, value: any) => {
    setUploadFiles(prev => prev.map(file => 
      file.id === id ? { ...file, [field]: value } : file
    ));
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== id));
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    const { file, title, description, categoryId, tags } = uploadFile;
    
    try {
      // Update status to uploading
      updateFileField(uploadFile.id, 'status', 'uploading');
      
      // Create form data for API upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category_id', categoryId);
      formData.append('tags', tags.join(', '));

      // Upload using our API endpoint
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { document } = await response.json();

      updateFileField(uploadFile.id, 'status', 'success');
      updateFileField(uploadFile.id, 'progress', 100);
      
      toast.success(`${file.name} uploaded successfully`);
      
    } catch (error: any) {
      updateFileField(uploadFile.id, 'status', 'error');
      updateFileField(uploadFile.id, 'errorMessage', error.message);
      toast.error(`Failed to upload ${file.name}: ${error.message}`);
    }
  };

  const calculateFileChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUploadAll = async () => {
    const pendingFiles = uploadFiles.filter(file => file.status === 'pending');
    
    if (pendingFiles.length === 0) {
      toast.error('No files to upload');
      return;
    }

    // Validate required fields
    const invalidFiles = pendingFiles.filter(file => !file.title.trim());
    if (invalidFiles.length > 0) {
      toast.error('Please provide titles for all files');
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of pendingFiles) {
        await uploadFile(file);
      }
      
      toast.success('All files uploaded successfully!');
      
      // Remove successful uploads after a delay
      setTimeout(() => {
        setUploadFiles(prev => prev.filter(file => file.status !== 'success'));
      }, 2000);
      
    } finally {
      setIsUploading(false);
    }
  };

  const addTag = (fileId: string, tag: string) => {
    if (!tag.trim()) return;
    
    updateFileField(fileId, 'tags', [...uploadFiles.find(f => f.id === fileId)?.tags || [], tag.trim()]);
  };

  const removeTag = (fileId: string, tagIndex: number) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (!file) return;
    
    const newTags = file.tags.filter((_, index) => index !== tagIndex);
    updateFileField(fileId, 'tags', newTags);
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-lg">Drop the files here ...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">
                  Drag & drop files here, or click to select files
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports: PDF, Word, Excel, PowerPoint, Images, Videos, Audio (Max 50MB per file)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Files to Upload ({uploadFiles.length})</CardTitle>
            <div className="space-x-2">
              <Button
                onClick={() => setUploadFiles([])}
                variant="outline"
                disabled={isUploading}
              >
                Clear All
              </Button>
              <Button
                onClick={handleUploadAll}
                disabled={isUploading || uploadFiles.every(f => f.status !== 'pending')}
              >
                {isUploading ? 'Uploading...' : 'Upload All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadFiles.map((uploadFile) => {
                const FileIcon = getFileIcon(uploadFile.file.type);
                
                return (
                  <div key={uploadFile.id} className="border rounded-lg p-4 space-y-4">
                    {/* File Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{uploadFile.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {uploadFile.status === 'success' && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                        {uploadFile.status === 'error' && (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        {uploadFile.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(uploadFile.id)}
                            disabled={isUploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {uploadFile.status === 'uploading' && (
                      <Progress value={uploadFile.progress} className="w-full" />
                    )}

                    {/* Error Message */}
                    {uploadFile.status === 'error' && uploadFile.errorMessage && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-600">{uploadFile.errorMessage}</p>
                      </div>
                    )}

                    {/* File Metadata Form */}
                    {uploadFile.status === 'pending' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`title-${uploadFile.id}`}>Title *</Label>
                          <Input
                            id={`title-${uploadFile.id}`}
                            value={uploadFile.title}
                            onChange={(e) => updateFileField(uploadFile.id, 'title', e.target.value)}
                            placeholder="Document title"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`category-${uploadFile.id}`}>Category</Label>
                          <Select
                            value={uploadFile.categoryId}
                            onValueChange={(value) => updateFileField(uploadFile.id, 'categoryId', value)}
                          >
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
                        
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor={`description-${uploadFile.id}`}>Description</Label>
                          <Textarea
                            id={`description-${uploadFile.id}`}
                            value={uploadFile.description}
                            onChange={(e) => updateFileField(uploadFile.id, 'description', e.target.value)}
                            placeholder="Document description (optional)"
                            rows={3}
                          />
                        </div>
                        
                        <div className="md:col-span-2 space-y-2">
                          <Label>Tags</Label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {uploadFile.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="cursor-pointer">
                                {tag}
                                <X 
                                  className="h-3 w-3 ml-1" 
                                  onClick={() => removeTag(uploadFile.id, index)}
                                />
                              </Badge>
                            ))}
                          </div>
                          <Input
                            placeholder="Add tag and press Enter"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addTag(uploadFile.id, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
