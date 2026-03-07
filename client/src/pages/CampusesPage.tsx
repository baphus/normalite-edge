import React, { useEffect, useMemo, useState } from 'react';
import {
    Building2,
    Loader2,
    Pencil,
    Plus,
    RefreshCcw,
    Search,
    Trash2,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface CampusItem {
    id: string;
    name: string;
    code?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

interface CampusApiItem {
    id: string;
    name?: string | null;
    code?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

interface MemberItem {
    id: string;
    name: string;
    email: string;
    role: 'REVIEWER' | 'REVIEWEE' | 'ADMIN';
    status?: string;
    program?: string | null;
    yearLevel?: string | null;
    section?: string | null;
}

interface UserListResponse {
    data?: MemberItem[];
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages?: number;
    };
}

type CampusFormState = {
    name: string;
    code: string;
};

const defaultFormState: CampusFormState = {
    name: '',
    code: '',
};

const toValidDate = (value?: string | null) => {
    if (!value) return null;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value?: string | null) => {
    const parsed = toValidDate(value);
    if (!parsed) return 'N/A';

    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const normalizeCampus = (campus: CampusApiItem): CampusItem => ({
    id: campus.id,
    name: campus.name?.trim() || 'Untitled Campus',
    code: campus.code || null,
    createdAt: campus.createdAt || null,
    updatedAt: campus.updatedAt || null,
});

const CampusesPage: React.FC = () => {
    const [campuses, setCampuses] = useState<CampusItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [formState, setFormState] = useState<CampusFormState>(defaultFormState);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedCampus, setSelectedCampus] = useState<CampusItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<CampusItem | null>(null);
    const [membersOpen, setMembersOpen] = useState(false);
    const [membersLoading, setMembersLoading] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [campusMembers, setCampusMembers] = useState<MemberItem[]>([]);

    const fetchCampuses = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const response = await api.get('/campuses');
            const rows = (response.data?.data || []) as CampusApiItem[];
            setCampuses(rows.map(normalizeCampus));
        } catch (error: any) {
            setErrorMessage(error?.response?.data?.message || 'Failed to load campuses.');
            setCampuses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampuses();
    }, []);

    const filteredCampuses = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) return campuses;

        return campuses.filter((campus) =>
            campus.name.toLowerCase().includes(normalizedSearch)
            || (campus.code || '').toLowerCase().includes(normalizedSearch)
        );
    }, [campuses, search]);

    const filteredMembers = useMemo(() => {
        const normalizedSearch = memberSearch.trim().toLowerCase();
        if (!normalizedSearch) return campusMembers;

        return campusMembers.filter((member) =>
            member.name.toLowerCase().includes(normalizedSearch)
            || member.email.toLowerCase().includes(normalizedSearch)
            || member.role.toLowerCase().includes(normalizedSearch)
            || (member.program || '').toLowerCase().includes(normalizedSearch)
            || (member.yearLevel || '').toLowerCase().includes(normalizedSearch)
            || (member.section || '').toLowerCase().includes(normalizedSearch)
        );
    }, [campusMembers, memberSearch]);

    const codedCampuses = useMemo(() => campuses.filter((campus) => Boolean(campus.code)).length, [campuses]);
    const recentlyUpdatedCampuses = useMemo(() => {
        const threshold = Date.now() - (1000 * 60 * 60 * 24 * 30);
        return campuses.filter((campus) => {
            const updatedAt = toValidDate(campus.updatedAt);
            return updatedAt ? updatedAt.getTime() >= threshold : false;
        }).length;
    }, [campuses]);

    const openCreateDialog = () => {
        setFormMode('create');
        setSelectedCampus(null);
        setFormState(defaultFormState);
        setFormError(null);
        setIsFormOpen(true);
    };

    const openEditDialog = (campus: CampusItem) => {
        setFormMode('edit');
        setSelectedCampus(campus);
        setFormState({
            name: campus.name,
            code: campus.code || '',
        });
        setFormError(null);
        setIsFormOpen(true);
    };

    const handleSaveCampus = async () => {
        const name = formState.name.trim();
        const code = formState.code.trim();

        if (!name) {
            setFormError('Campus name is required.');
            return;
        }

        try {
            setSaving(true);
            setFormError(null);

            const payload = {
                name,
                code: code || undefined,
            };

            if (formMode === 'create') {
                await api.post('/campuses', payload);
                toast.success('Campus created successfully.');
            } else if (selectedCampus) {
                await api.patch(`/campuses/${selectedCampus.id}`, payload);
                toast.success('Campus updated successfully.');
            }

            setIsFormOpen(false);
            setSelectedCampus(null);
            setFormState(defaultFormState);
            await fetchCampuses();
        } catch (error: any) {
            setFormError(error?.response?.data?.message || 'Failed to save campus.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCampus = async () => {
        if (!deleteTarget) return;

        const target = deleteTarget;
        setDeleteTarget(null);

        try {
            await api.delete(`/campuses/${target.id}`);
            if (selectedCampus?.id === target.id) {
                setSelectedCampus(null);
                setCampusMembers([]);
                setMembersOpen(false);
            }
            toast.success('Campus deleted successfully.');
            await fetchCampuses();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete campus.');
        }
    };

    const fetchMembersForCampus = async (campus: CampusItem) => {
        setSelectedCampus(campus);
        setMembersOpen(true);
        setMemberSearch('');
        setMembersLoading(true);

        try {
            const allMembers: MemberItem[] = [];
            let page = 1;
            let totalPages = 1;

            do {
                const response = await api.get<UserListResponse>('/users', {
                    params: {
                        page,
                        limit: 200,
                        campusId: campus.id,
                    },
                });

                const rows = (response.data?.data || []).filter((user) => user.role === 'REVIEWER' || user.role === 'REVIEWEE');
                allMembers.push(...rows);
                totalPages = response.data?.meta?.totalPages || 1;
                page += 1;
            } while (page <= totalPages);

            setCampusMembers(allMembers);
        } catch (error: any) {
            setCampusMembers([]);
            toast.error(error?.response?.data?.message || 'Failed to load users for this campus.');
        } finally {
            setMembersLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6 bg-[#fafaf8] min-h-full">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-primary/70">Admin Workspace</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950">Campuses</h1>
                    <p className="mt-2 max-w-2xl text-sm text-gray-600">
                        Manage the campus catalog used in reviewer and reviewee profiles and filters.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={fetchCampuses} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                    <Button type="button" onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Campus
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Total Campuses</p>
                                <p className="mt-3 text-3xl font-black text-gray-950">{campuses.length}</p>
                            </div>
                            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                                <Building2 className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">With Codes</p>
                                <p className="mt-3 text-3xl font-black text-gray-950">{codedCampuses}</p>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                                <Badge className="border-0 bg-emerald-100 text-emerald-700">Code</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Updated This Month</p>
                                <p className="mt-3 text-3xl font-black text-gray-950">{recentlyUpdatedCampuses}</p>
                            </div>
                            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                                <RefreshCcw className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-950">Campus Directory</h2>
                            <p className="text-sm text-gray-500">Create, update, remove campuses, and inspect assigned users.</p>
                        </div>
                        <div className="relative w-full lg:w-80">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by campus name or code"
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {errorMessage ? (
                        <div className="px-6 py-12 text-center">
                            <p className="text-sm font-medium text-rose-600">{errorMessage}</p>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading campuses...
                        </div>
                    ) : filteredCampuses.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <p className="text-base font-semibold text-gray-900">No campuses found.</p>
                            <p className="mt-2 text-sm text-gray-500">
                                {campuses.length === 0 ? 'Create your first campus to start assigning users.' : 'Try a different search term.'}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campus</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCampuses.map((campus) => (
                                    <TableRow key={campus.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-semibold text-gray-950">{campus.name}</p>
                                                <p className="text-xs text-gray-500">Created {formatDate(campus.createdAt)}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {campus.code ? (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-700">{campus.code}</Badge>
                                            ) : (
                                                <span className="text-sm text-gray-400">No code</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">{formatDate(campus.updatedAt)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => fetchMembersForCampus(campus)}
                                                >
                                                    <Users className="mr-2 h-4 w-4" />
                                                    Users
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => openEditDialog(campus)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                    onClick={() => setDeleteTarget(campus)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={(open) => !saving && setIsFormOpen(open)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{formMode === 'create' ? 'Create Campus' : 'Update Campus'}</DialogTitle>
                        <DialogDescription>
                            {formMode === 'create'
                                ? 'Add a new campus option for reviewers and reviewees.'
                                : 'Update campus details used in user profiles.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        <div className="space-y-2">
                            <Label htmlFor="campus-name">Campus Name</Label>
                            <Input
                                id="campus-name"
                                value={formState.name}
                                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                                placeholder="Cebu Normal University - Main Campus"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="campus-code">Campus Code</Label>
                            <Input
                                id="campus-code"
                                value={formState.code}
                                onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))}
                                placeholder="CNU-MAIN"
                            />
                        </div>

                        {formError && (
                            <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                                {formError}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSaveCampus} disabled={saving}>
                            {saving ? 'Saving...' : formMode === 'create' ? 'Create Campus' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{selectedCampus?.name || 'Campus Users'}</DialogTitle>
                        <DialogDescription>
                            Reviewers and reviewees currently assigned to this campus.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                value={memberSearch}
                                onChange={(event) => setMemberSearch(event.target.value)}
                                placeholder="Search by name, email, role, or program"
                                className="pl-9"
                            />
                        </div>

                        {membersLoading ? (
                            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading campus users...
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="rounded-md border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                                No reviewers or reviewees assigned to this campus.
                            </div>
                        ) : (
                            <div className="max-h-105 overflow-auto rounded-md border border-gray-100">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Program</TableHead>
                                            <TableHead>Year / Section</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMembers.map((member) => (
                                            <TableRow key={member.id}>
                                                <TableCell>
                                                    <p className="font-semibold text-gray-900">{member.name}</p>
                                                    <p className="text-xs text-gray-500">{member.email}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="uppercase text-[10px]">
                                                        {member.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="uppercase text-[10px]">
                                                        {(member.status || 'UNKNOWN').toLowerCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">{member.program || 'Unassigned'}</TableCell>
                                                <TableCell className="text-sm text-gray-600">
                                                    {[member.yearLevel, member.section].filter(Boolean).join(' / ') || 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title="Delete Campus"
                description={`Delete ${deleteTarget?.name ?? ''}? Assigned users will be unassigned from this campus.`}
                confirmLabel="Delete"
                variant="destructive"
                isLoading={false}
                onConfirm={handleDeleteCampus}
            />
        </div>
    );
};

export default CampusesPage;
