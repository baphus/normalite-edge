import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, FolderOpen } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
} from '@/components/ui/alert-dialog';

interface Category {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    _count: { exams: number; decks: number };
}

export default function ManageCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/categories');
            setCategories(res.data.data || []);
        } catch {
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleCreate = () => {
        setEditingCategory(null);
        setName('');
        setDialogOpen(true);
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setName(category.name);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error('Category name is required');
            return;
        }

        setSaving(true);
        try {
            if (editingCategory) {
                await api.patch(`/categories/${editingCategory.id}`, { name: trimmed });
                toast.success('Category updated');
            } else {
                await api.post('/categories', { name: trimmed });
                toast.success('Category created');
            }
            setDialogOpen(false);
            fetchCategories();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingCategory) return;

        try {
            await api.delete(`/categories/${deletingCategory.id}`);
            toast.success('Category deleted');
            setDeleteDialogOpen(false);
            setDeletingCategory(null);
            fetchCategories();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete category');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Manage Categories</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create, rename, and delete exam categories.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading categories...</div>
            ) : categories.length === 0 ? (
                <div className="text-center py-12">
                    <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No categories yet. Create one to get started.</p>
                </div>
            ) : (
                <div className="border rounded-lg">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left px-4 py-3 text-sm font-medium">Name</th>
                                <th className="text-left px-4 py-3 text-sm font-medium">Exams</th>
                                <th className="text-left px-4 py-3 text-sm font-medium">Decks</th>
                                <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((category) => (
                                <tr key={category.id} className="border-b last:border-b-0">
                                    <td className="px-4 py-3">
                                        <span className="font-medium">{category.name}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="secondary">
                                            {category._count.exams}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="secondary">
                                            {category._count.decks}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(category)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setDeletingCategory(category);
                                                setDeleteDialogOpen(true);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit Category' : 'Create Category'}
                        </DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder="Category name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                        }}
                        autoFocus
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deletingCategory?.name}"?
                            {deletingCategory && (deletingCategory._count.exams > 0 || deletingCategory._count.decks > 0) && (
                                <span className="block mt-2 text-amber-600">
                                    This category is used by {deletingCategory._count.exams} exam(s) and {deletingCategory._count.decks} deck(s). Those items will have their category cleared.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
