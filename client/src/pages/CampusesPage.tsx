import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { formatShortDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CheckboxFilterGroup, ManageToolbar, type ActiveFilterChip } from '@/components/manage/ManageToolbar';
import { ResourceTable, type ResourceColumn } from '@/components/manage/ResourceTable';

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

const normalizeCampus = (campus: CampusApiItem): CampusItem => ({
    id: campus.id,
    name: campus.name?.trim() || 'Untitled Campus',
    code: campus.code || null,
    createdAt: campus.createdAt || null,
    updatedAt: campus.updatedAt || null,
});

const getApiErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const data = (error as { response?: { data?: unknown } }).response?.data;
        if (data && typeof data === 'object' && 'message' in data) {
            const message = (data as { message?: unknown }).message;
            if (typeof message === 'string') return message;
        }
    }
    return '';
};

const thirtyDaysAgoMs = () => Date.now() - (1000 * 60 * 60 * 24 * 30);

const CampusesPage: React.FC = () => {
    const [campuses, setCampuses] = useState<CampusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [codeFilters, setCodeFilters] = useState<Array<'WITH_CODE' | 'NO_CODE'>>([]);
    const [activityFilters, setActivityFilters] = useState<Array<'UPDATED_30_DAYS' | 'OLDER'>>([]);

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

    const fetchCampuses = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const response = await api.get('/campuses');
            const rows = (response.data?.data || []) as CampusApiItem[];
            setCampuses(rows.map(normalizeCampus));
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error) || 'Failed to load campuses.');
            setCampuses([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const load = () => {
            void fetchCampuses();
        };
        load();
    }, [fetchCampuses]);

    const filteredCampuses = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const threshold = thirtyDaysAgoMs();

        return campuses.filter((campus) => {
            const matchesSearch = !normalizedSearch
                || campus.name.toLowerCase().includes(normalizedSearch)
                || (campus.code || '').toLowerCase().includes(normalizedSearch);

            const hasCode = Boolean(campus.code?.trim());
            const matchesCode = codeFilters.length === 0
                || (codeFilters.includes('WITH_CODE') && hasCode)
                || (codeFilters.includes('NO_CODE') && !hasCode);

            const updatedAt = toValidDate(campus.updatedAt);
            const isUpdatedRecently = updatedAt ? updatedAt.getTime() >= threshold : false;
            const matchesActivity = activityFilters.length === 0
                || (activityFilters.includes('UPDATED_30_DAYS') && isUpdatedRecently)
                || (activityFilters.includes('OLDER') && !isUpdatedRecently);

            return matchesSearch && matchesCode && matchesActivity;
        });
    }, [campuses, search, codeFilters, activityFilters]);

    const clearAllFilters = useCallback(() => {
        setSearch('');
        setCodeFilters([]);
        setActivityFilters([]);
    }, []);

    const chips = useMemo<ActiveFilterChip[]>(() => {
        const next: ActiveFilterChip[] = [];
        if (search.trim()) next.push({ id: 'search', label: `Search: ${search.trim()}`, onClear: () => setSearch('') });
        codeFilters.forEach((value) => next.push({ id: `code-${value}`, label: value === 'WITH_CODE' ? 'With code' : 'No code', onClear: () => setCodeFilters((current) => current.filter((item) => item !== value)) }));
        activityFilters.forEach((value) => next.push({ id: `activity-${value}`, label: value === 'UPDATED_30_DAYS' ? 'Updated: last 30 days' : 'Updated: older', onClear: () => setActivityFilters((current) => current.filter((item) => item !== value)) }));
        return next;
    }, [search, codeFilters, activityFilters]);

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
        setFormState({ name: campus.name, code: campus.code || '' });
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
            const payload = { name, code: code || undefined };
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
        } catch (error) {
            setFormError(getApiErrorMessage(error) || 'Failed to save campus.');
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
        } catch (error) {
            toast.error(getApiErrorMessage(error) || 'Failed to delete campus.');
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
                    params: { page, limit: 200, campusId: campus.id },
                });
                const rows = (response.data?.data || []).filter((user) => user.role === 'REVIEWER' || user.role === 'REVIEWEE');
                allMembers.push(...rows);
                totalPages = response.data?.meta?.totalPages || 1;
                page += 1;
            } while (page <= totalPages);
            setCampusMembers(allMembers);
        } catch (error) {
            setCampusMembers([]);
            toast.error(getApiErrorMessage(error) || 'Failed to load users for this campus.');
        } finally {
            setMembersLoading(false);
        }
    };

    const columns = useMemo<ResourceColumn<CampusItem>[]>(
        () => [
            {
                id: 'name',
                header: 'Campus',
                primary: true,
                sortable: true,
                sortValue: (campus) => campus.name,
                className: 'min-w-[240px]',
                cell: (campus) => (
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{campus.name}</p>
                        <p className="mt-0.5 truncate text-[12px] text-slate-400">
                            Created {formatShortDate(campus.createdAt ?? undefined)}
                        </p>
                    </div>
                ),
            },
            {
                id: 'code',
                header: 'Code',
                sortable: true,
                sortValue: (campus) => campus.code || '',
                className: 'w-[120px]',
                cell: (campus) => campus.code ? (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-semibold text-slate-700">
                        {campus.code}
                    </span>
                ) : (
                    <span className="text-[12px] text-slate-400">No code</span>
                ),
            },
            {
                id: 'updated',
                header: 'Last Updated',
                sortable: true,
                sortValue: (campus) => new Date(campus.updatedAt || 0).getTime(),
                className: 'w-[120px] whitespace-nowrap',
                cell: (campus) => formatShortDate(campus.updatedAt ?? undefined),
            },
        ],
        [],
    );

    const renderRowActions = useCallback(
        (campus: CampusItem) => (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700"
                        aria-label={`Actions for ${campus.name}`}
                    >
                        <MoreHorizontal size={15} aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-lg">
                    <DropdownMenuItem
                        className="cursor-pointer gap-2 py-2 text-[12px] font-semibold"
                        onClick={() => fetchMembersForCampus(campus)}
                    >
                        <Users size={13} aria-hidden="true" /> View Members
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="cursor-pointer gap-2 py-2 text-[12px] font-semibold"
                        onClick={() => openEditDialog(campus)}
                    >
                        <Pencil size={13} aria-hidden="true" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="cursor-pointer gap-2 py-2 text-[12px] font-semibold text-red-600 focus:bg-red-50 focus:text-red-600"
                        onClick={() => setDeleteTarget(campus)}
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
            <button type="button" onClick={openCreateDialog}>
                <Plus size={13} aria-hidden="true" /> Add Campus
            </button>
        </Button>
    );

    const tableState = loading ? 'loading' : errorMessage ? 'error' : 'ready';

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <ManageToolbar
                title="Campuses"
                description="Manage campus options used in reviewer and reviewee profiles."
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search campuses…"
                searchLabel="Search campuses"
                filterPopoverTitle="Filter campuses"
                popoverFilters={<><CheckboxFilterGroup label="Code" options={['With code', 'No code']} value={codeFilters.map((value) => value === 'WITH_CODE' ? 'With code' : 'No code')} onValueChange={(values) => setCodeFilters(values.map((value) => value === 'With code' ? 'WITH_CODE' : 'NO_CODE'))} /><CheckboxFilterGroup label="Last updated" options={['Last 30 days', 'Older']} value={activityFilters.map((value) => value === 'UPDATED_30_DAYS' ? 'Last 30 days' : 'Older')} onValueChange={(values) => setActivityFilters(values.map((value) => value === 'Last 30 days' ? 'UPDATED_30_DAYS' : 'OLDER'))} /></>}
                activeFilterCount={chips.length}
                chips={chips}
                onClearAll={clearAllFilters}
                createAction={createAction}
            />

            <ResourceTable
                rows={filteredCampuses}
                columns={columns}
                getRowId={(campus) => campus.id}
                caption="Campuses used in reviewer and reviewee profiles"
                state={tableState}
                error={errorMessage}
                onRetry={() => void fetchCampuses()}
                emptyTitle="No campuses yet"
                emptyDescription="Create your first campus to start assigning users."
                emptyAction={createAction}
                rowActions={renderRowActions}
                filtersActive={chips.length > 0}
                onClearFilters={clearAllFilters}
                resetKey={`${search}|${codeFilters.join(',')}|${activityFilters.join(',')}`}
            />

            {/* Create / Edit Dialog */}
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

            {/* Members Dialog */}
            <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{selectedCampus?.name || 'Campus Users'}</DialogTitle>
                        <DialogDescription>Reviewers and reviewees currently assigned to this campus.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Input
                            value={memberSearch}
                            onChange={(event) => setMemberSearch(event.target.value)}
                            placeholder="Search by name, email, role, or program…"
                            className="h-8 rounded-lg border-slate-200 bg-white text-[12px]"
                        />
                        {membersLoading ? (
                            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                                Loading campus users…
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="rounded-md border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                                No reviewers or reviewees assigned to this campus.
                            </div>
                        ) : (
                            <div className="max-h-105 overflow-auto rounded-xl border border-slate-100">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Program</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Year / Section</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMembers.map((member) => (
                                            <tr key={member.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                                                    <p className="text-xs text-slate-500">{member.email}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                                                        {member.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                                                        {(member.status || 'UNKNOWN').toLowerCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{member.program || 'Unassigned'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {[member.yearLevel, member.section].filter(Boolean).join(' / ') || 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                onConfirm={handleDeleteCampus}
            />
        </div>
    );
};

export default CampusesPage;
