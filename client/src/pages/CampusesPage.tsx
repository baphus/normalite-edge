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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    const [codeFilter, setCodeFilter] = useState<'ALL' | 'WITH_CODE' | 'NO_CODE'>('ALL');
    const [activityFilter, setActivityFilter] = useState<'ALL' | 'UPDATED_30_DAYS' | 'OLDER'>('ALL');
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
        const threshold = Date.now() - (1000 * 60 * 60 * 24 * 30);

        return campuses.filter((campus) => {
            const matchesSearch = !normalizedSearch
                || campus.name.toLowerCase().includes(normalizedSearch)
                || (campus.code || '').toLowerCase().includes(normalizedSearch);

            const hasCode = Boolean(campus.code?.trim());
            const matchesCode = codeFilter === 'ALL'
                || (codeFilter === 'WITH_CODE' && hasCode)
                || (codeFilter === 'NO_CODE' && !hasCode);

            const updatedAt = toValidDate(campus.updatedAt);
            const isUpdatedRecently = updatedAt ? updatedAt.getTime() >= threshold : false;
            const matchesActivity = activityFilter === 'ALL'
                || (activityFilter === 'UPDATED_30_DAYS' && isUpdatedRecently)
                || (activityFilter === 'OLDER' && !isUpdatedRecently);

            return matchesSearch && matchesCode && matchesActivity;
        });
    }, [campuses, search, codeFilter, activityFilter]);

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

    const resetFilters = () => {
        setCodeFilter('ALL');
        setActivityFilter('ALL');
    };

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
        <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden font-lexend -mx-5 -mt-4">
            <header className="h-20 bg-white border-b border-[#800000]/10 px-8 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Campuses</h1>
                    <p className="text-sm text-slate-500">Manage campus options used in reviewer and reviewee profiles.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by campus name or code"
                            className="h-10 pl-9 bg-slate-100 border-slate-100 rounded-lg"
                        />
                    </div>
                    <Button type="button" variant="outline" onClick={fetchCampuses} disabled={loading} className="h-10 rounded-lg border-slate-200">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                    <Button type="button" onClick={openCreateDialog} className="h-10 px-4 rounded-lg bg-[#800000] hover:bg-[#6d0000] text-white shadow-lg shadow-[#800000]/20">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Campus
                    </Button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-[#800000]/5 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Campuses</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{campuses.length.toLocaleString()}</h3>
                            <p className="text-xs text-[#800000]/70 font-medium mt-2">Available assignment locations</p>
                        </div>
                        <div className="bg-[#800000]/10 text-[#800000] p-3 rounded-lg">
                            <Building2 className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#800000]/5 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Campuses With Codes</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{codedCampuses.toLocaleString()}</h3>
                            <p className="text-xs text-green-600 font-medium mt-2">Quick campus lookup is enabled</p>
                        </div>
                        <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                            <Badge className="border-0 bg-transparent text-current p-0 h-auto text-xs">Code</Badge>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#800000]/5 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Updated This Month</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{recentlyUpdatedCampuses.toLocaleString()}</h3>
                            <p className="text-xs text-[#D4AF37] font-medium mt-2">Recent changes in the last 30 days</p>
                        </div>
                        <div className="bg-[#D4AF37]/10 text-[#D4AF37] p-3 rounded-lg">
                            <RefreshCcw className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
                <Select value={codeFilter} onValueChange={(value) => setCodeFilter(value as 'ALL' | 'WITH_CODE' | 'NO_CODE')}>
                    <SelectTrigger className="w-auto min-w-44 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 transition-colors">
                        <span className="text-slate-400 mr-1">Code:</span>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-lexend">
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="WITH_CODE">With Code</SelectItem>
                        <SelectItem value="NO_CODE">No Code</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={activityFilter} onValueChange={(value) => setActivityFilter(value as 'ALL' | 'UPDATED_30_DAYS' | 'OLDER')}>
                    <SelectTrigger className="w-auto min-w-56 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 transition-colors">
                        <span className="text-slate-400 mr-1">Updated:</span>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-lexend">
                        <SelectItem value="ALL">Any Time</SelectItem>
                        <SelectItem value="UPDATED_30_DAYS">Last 30 Days</SelectItem>
                        <SelectItem value="OLDER">Older</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 gap-2" onClick={resetFilters}>
                    <RefreshCcw className="w-4 h-4" />
                    Reset Filters
                </Button>
            </div>

            <Card className="border border-[#800000]/10 shadow-sm rounded-xl bg-white overflow-hidden">
                <CardContent className="p-0">
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Campus Directory</h2>
                            <p className="text-sm text-gray-500">Create, update, remove campuses, and inspect assigned users.</p>
                        </div>
                        <p className="text-xs font-medium text-slate-500">{filteredCampuses.length} campuses shown</p>
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
                            <TableHeader className="bg-slate-50 border-b border-slate-100">
                                <TableRow className="border-slate-100">
                                    <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Campus</TableHead>
                                    <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</TableHead>
                                    <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</TableHead>
                                    <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCampuses.map((campus) => (
                                    <TableRow key={campus.id} className="hover:bg-slate-50 transition-colors align-top">
                                        <TableCell className="px-4 py-4">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{campus.name}</p>
                                                <p className="text-xs text-slate-500">Created {formatDate(campus.createdAt)}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-4">
                                            {campus.code ? (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700">{campus.code}</Badge>
                                            ) : (
                                                <span className="text-sm text-slate-400">No code</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-4 text-sm text-slate-600">{formatDate(campus.updatedAt)}</TableCell>
                                        <TableCell className="px-4 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-8 rounded-md border-slate-200 bg-white text-xs font-semibold hover:bg-slate-50"
                                                    onClick={() => fetchMembersForCampus(campus)}
                                                >
                                                    <Users className="mr-2 h-4 w-4" />
                                                    Users
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-slate-700 hover:bg-slate-100"
                                                    onClick={() => openEditDialog(campus)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-rose-700 hover:bg-rose-50"
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

                    <div className="space-y-4 py-2">
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
                            <div className="max-h-105 overflow-auto rounded-xl border border-slate-100">
                                <Table>
                                    <TableHeader className="bg-slate-50 border-b border-slate-100">
                                        <TableRow className="border-slate-100">
                                            <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</TableHead>
                                            <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</TableHead>
                                            <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                                            <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Program</TableHead>
                                            <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Year / Section</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMembers.map((member) => (
                                            <TableRow key={member.id} className="hover:bg-slate-50 transition-colors align-top">
                                                <TableCell className="px-4 py-4">
                                                    <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                                                    <p className="text-xs text-slate-500">{member.email}</p>
                                                </TableCell>
                                                <TableCell className="px-4 py-4">
                                                    <Badge variant="outline" className="uppercase text-[10px] border-slate-200 text-slate-700">
                                                        {member.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-4 py-4">
                                                    <Badge variant="secondary" className="uppercase text-[10px] bg-slate-100 text-slate-700">
                                                        {(member.status || 'UNKNOWN').toLowerCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-4 py-4 text-sm text-slate-600">{member.program || 'Unassigned'}</TableCell>
                                                <TableCell className="px-4 py-4 text-sm text-slate-600">
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
        </div>
    );
};

export default CampusesPage;
