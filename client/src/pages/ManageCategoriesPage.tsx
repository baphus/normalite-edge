import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, Pencil, Trash2, Plus } from 'lucide-react';
import api from '@/lib/axios';
import { formatShortDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ManageToolbar } from '@/components/manage/ManageToolbar';
import { ResourceTable, type ResourceColumn } from '@/components/manage/ResourceTable';

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
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
        void fetchCategories();
    }, [fetchCategories]);

    const filteredCategories = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return categories;
        return categories.filter((cat) => cat.name.toLowerCase().includes(term));
    }, [categories, search]);

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
            void fetchCategories();
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
            void fetchCategories();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete category');
        }
    };

    const columns = useMemo<ResourceColumn<Category>[]>(
        () => [
            {
                id: 'name',
                header: 'Name',
                primary: true,
                sortable: true,
                sortValue: (cat) => cat.name,
                className: 'min-w-[240px]',
                cell: (cat) => (
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{cat.name}</p>
                        <p className="mt-0.5 truncate text-[12px] text-slate-400">
                            Created {formatShortDate(cat.createdAt)}
                        </p>
                    </div>
                ),
            },
            {
                id: 'exams',
                header: 'Exams',
                sortable: true,
                sortValue: (cat) => cat._count.exams,
                className: 'w-[100px] tabular-nums',
                cell: (cat) => cat._count.exams,
            },
            {
                id: 'decks',
                header: 'Decks',
                sortable: true,
                sortValue: (cat) => cat._count.decks,
                className: 'w-[100px] tabular-nums',
                cell: (cat) => cat._count.decks,
            },
        ],
        [],
    );

    const renderRowActions = useCallback(
        (category: Category) => (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700"
                        aria-label={`Actions for ${category.name}`}
                    >
                        <MoreHorizontal size={15} aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-lg">
                    <DropdownMenuItem
                        className="cursor-pointer gap-2 py-2 text-[12px] font-semibold"
                        onClick={() => handleEdit(category)}
                    >
                        <Pencil size={13} aria-hidden="true" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="cursor-pointer gap-2 py-2 text-[12px] font-semibold text-red-600 focus:bg-red-50 focus:text-red-600"
                        onClick={() => { setDeletingCategory(category); setDeleteDialogOpen(true); }}
                    >
                        <Trash2 size={13} aria-hidden="true" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ),
        [],
    );

    const createAction = (
        <Button
            asChild
            className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90"
        >
            <button type="button" onClick={handleCreate}>
                <Plus size={13} aria-hidden="true" /> Add Category
            </button>
        </Button>
    );

    const tableState = loading ? 'loading' : 'ready';

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <ManageToolbar
                title="Categories"
                description="Create, rename, and delete exam categories used across materials and exams."
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search categories…"
                searchLabel="Search categories"
                createAction={createAction}
            />

            <ResourceTable
                rows={filteredCategories}
                columns={columns}
                getRowId={(cat) => cat.id}
                caption="Exam and material categories"
                state={tableState}
                emptyTitle="No categories yet"
                emptyDescription="Create your first category to get started."
                emptyAction={createAction}
                rowActions={renderRowActions}
                resetKey={search}
            />

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit Category' : 'Create Category'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">Category Name</Label>
                            <Input
                                id="category-name"
                                placeholder="Category name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => { if (!open) setDeleteDialogOpen(false); }}
                title="Delete Category"
                description={
                    deletingCategory
                        ? `Delete "${deletingCategory.name}"?${(deletingCategory._count.exams > 0 || deletingCategory._count.decks > 0) ? ` This category is used by ${deletingCategory._count.exams} exam(s) and ${deletingCategory._count.decks} deck(s). Those items will have their category cleared.` : ''}`
                        : 'Delete this category?'
                }
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={handleDelete}
            />
        </div>
    );
}
