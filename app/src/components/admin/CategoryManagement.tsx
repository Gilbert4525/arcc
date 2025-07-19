'use client';

import { useState } from 'react';
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
  DialogTrigger,
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
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Calendar, 
  Gavel,
  Circle,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';

type Category = Database['public']['Tables']['categories']['Row'] & {
  profiles?: { full_name: string | null; email: string } | null;
};

interface CategoryManagementProps {
  initialCategories: Category[];
  userId: string;
}

const categoryTypes = [
  { value: 'document', label: 'Document', icon: FileText, color: 'blue' },
  { value: 'meeting', label: 'Meeting', icon: Calendar, color: 'green' },
  { value: 'resolution', label: 'Resolution', icon: Gavel, color: 'purple' },
];

const predefinedColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6B7280'
];

export function CategoryManagement({ initialCategories, userId }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const supabase = createClient();

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || category.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleAddCategory = async (formData: FormData) => {
    setLoading(true);
    
    try {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const type = formData.get('type') as 'document' | 'meeting' | 'resolution';
      const color = formData.get('color') as string;

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name,
          description: description || null,
          type,
          color,
          is_active: true,
          created_by: userId,
        })
        .select(`
          *,
          profiles:created_by(full_name, email)
        `)
        .single();

      if (error) {
        toast.error(`Failed to create category: ${error.message}`);
        return;
      }

      setCategories([data, ...categories]);
      setIsAddDialogOpen(false);
      toast.success('Category created successfully');
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async (formData: FormData) => {
    if (!editingCategory) return;
    
    setLoading(true);
    
    try {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const type = formData.get('type') as 'document' | 'meeting' | 'resolution';
      const color = formData.get('color') as string;

      const { data, error } = await supabase
        .from('categories')
        .update({
          name,
          description: description || null,
          type,
          color,
        })
        .eq('id', editingCategory.id)
        .select(`
          *,
          profiles:created_by(full_name, email)
        `)
        .single();

      if (error) {
        toast.error(`Failed to update category: ${error.message}`);
        return;
      }

      setCategories(categories.map(category => category.id === editingCategory.id ? data : category));
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      toast.success('Category updated successfully');
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (categoryId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: isActive })
        .eq('id', categoryId);

      if (error) {
        toast.error(`Failed to ${isActive ? 'activate' : 'deactivate'} category`);
        return;
      }

      setCategories(categories.map(category => 
        category.id === categoryId ? { ...category, is_active: isActive } : category
      ));
      
      toast.success(`Category ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        toast.error(`Failed to delete category: ${error.message}`);
        return;
      }

      setCategories(categories.filter(category => category.id !== categoryId));
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = categoryTypes.find(t => t.value === type);
    return typeConfig?.icon || FileText;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = categoryTypes.find(t => t.value === type);
    if (!typeConfig) return null;

    const Icon = typeConfig.icon;
    
    return (
      <Badge variant="secondary" className={`text-${typeConfig.color}-700 bg-${typeConfig.color}-100`}>
        <Icon className="w-3 h-3 mr-1" />
        {typeConfig.label}
      </Badge>
    );
  };

  const loadEditingCategory = (category: Category) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {categoryTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new category for organizing documents, meetings, or resolutions.
              </DialogDescription>
            </DialogHeader>
            
            <form action={handleAddCategory} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name *</Label>
                  <Input id="name" name="name" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select name="type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center">
                            <type.icon className="w-4 h-4 mr-2" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Category description (optional)"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex space-x-2">
                  {predefinedColors.map((color, index) => (
                    <label key={index} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        value={color}
                        className="sr-only"
                        defaultChecked={index === 0}
                      />
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: color }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  Create Category
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {categoryTypes.map(type => {
          const typeCategories = categories.filter(cat => cat.type === type.value);
          const activeCategories = typeCategories.filter(cat => cat.is_active);
          
          return (
            <Card key={type.value}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg bg-${type.color}-100`}>
                      <type.icon className={`h-6 w-6 text-${type.color}-600`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{type.label} Categories</p>
                      <p className="text-2xl font-bold">{activeCategories.length}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total: {typeCategories.length}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeCategories.length - activeCategories.length} inactive
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categories ({filteredCategories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => {
                const TypeIcon = getTypeIcon(category.type);
                
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <div className="font-medium">{category.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getTypeBadge(category.type)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-xs">
                        {category.description ? (
                          <p className="text-sm text-muted-foreground">
                            {category.description.length > 100 
                              ? `${category.description.substring(0, 100)}...`
                              : category.description
                            }
                          </p>
                        ) : (
                          <span className="text-muted-foreground">No description</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={(checked) => handleToggleActive(category.id, checked)}
                        />
                        <span className="text-sm">
                          {category.is_active ? (
                            <Badge variant="default" className="bg-green-100 text-green-700">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                              Inactive
                            </Badge>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(category.created_at), 'MMM d, yyyy')}</div>
                        <div className="text-muted-foreground">
                          by {category.profiles?.full_name || category.profiles?.email || 'Unknown'}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadEditingCategory(category)}
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
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{category.name}"? 
                                This action cannot be undone. Items using this category will become uncategorized.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCategory(category.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Category Dialog */}
      {editingCategory && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update category details and settings.
              </DialogDescription>
            </DialogHeader>
            
            <form action={handleEditCategory} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Category Name *</Label>
                  <Input 
                    id="edit_name" 
                    name="name" 
                    defaultValue={editingCategory.name}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_type">Type *</Label>
                  <Select name="type" defaultValue={editingCategory.type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center">
                            <type.icon className="w-4 h-4 mr-2" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea 
                  id="edit_description" 
                  name="description" 
                  defaultValue={editingCategory.description || ''}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_color">Color</Label>
                <div className="flex space-x-2">
                  {predefinedColors.map((color, index) => (
                    <label key={index} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        value={color}
                        className="sr-only"
                        defaultChecked={color === editingCategory.color}
                      />
                      <div
                        className={`w-8 h-8 rounded-full border-2 transition-colors ${
                          color === editingCategory.color 
                            ? 'border-gray-900' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingCategory(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  Update Category
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
