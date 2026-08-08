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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ManageToolbar } from '@/components/manage/ManageToolbar';
import { ResourceTable, type ResourceColumn } from '@/components/manage/ResourceTable';

interface ProgramItem {
    id: string;
    name: string;
    code?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

interface ProgramApiItem {
    id: string;
    name?: string | null;
    code?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

interface StudentItem {
    id: string;
    name: string;
    email: string;
    status?: string;
    yearLevel?: string | null;
    section?: string | null;
}

interface UserListResponse {
    data?: StudentItem[];
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

type ProgramFormState = {
    name: string;
    code: string;
};

const defaultFormState: ProgramFormState = {
    name: '',
    code: '',
};

const toValidDate = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeProgram = (program: ProgramApiItem): ProgramItem => ({
    id: program.id,
    name: program.name?.trim() || 'Untitled Program',
    code: program.code || null,
    createdAt: program.createdAt || null,
    updatedAt: program.updatedAt || null,
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

const ProgramsPage: React.FC = () => {
    const [programs, setPrograms] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [codeFilter, setCodeFilter] = useState<'ALL' | 'WITH_CODE' | 'NO_CODE'>('ALL');
    const [activityFilter, setActivityFilter] = useState<'ALL' | 'UPDATED_30_DAYS' | 'OLDER'>('ALL');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [formState, setFormState] = useState<ProgramFormState>(defaultFormState);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ProgramItem | null>(null);

    const [studentsOpen, setStudentsOpen] = useState(false);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [programStudents, setProgramStudents] = useState<StudentItem[]>([]);

    const fetchPrograms = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const response = await api.get('/tracks');
            const rows = (response.data?.data || []) as ProgramApiItem[];
            setPrograms(rows.map(normalizeProgram));
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error) || 'Failed to load programs.');
            setPrograms([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const load = () => {
            void fetchPrograms();
        };
        load();
    }, [fetchPrograms]);

    const filteredPrograms = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const threshold = thirtyDaysAgoMs();

        return programs.filter((program) => {
            const matchesSearch = !normalizedSearch
                || program.name.toLowerCase().includes(normalizedSearch)
                || (program.code || '').toLowerCase().includes(normalizedSearch);

            const hasCode = Boolean(program.code?.trim());
            const matchesCode = codeFilter === 'ALL'
                || (codeFilter === 'WITH_CODE' && hasCode)
                || (codeFilter === 'NO_CODE' && !hasCode);

            const updatedAt = toValidDate(program.updatedAt);
            const isUpdatedRecently = updatedAt ? updatedAt.getTime() >= threshold : false;
            const matchesActivity = activityFilter === 'ALL'
                || (activityFilter === 'UPDATED_30_DAYS' && isUpdatedRecently)
                || (activityFilter === 'OLDER' && !isUpdatedRecently);

            return matchesSearch && matchesCode && matchesActivity;
        });
    }, [programs, search, codeFilter, activityFilter]);

    const filteredStudents = useMemo(() => {
        const normalizedSearch = studentSearch.trim().toLowerCase();
        if (!normalizedSearch) return programStudents;
        return programStudents.filter((student) =>
            student.name.toLowerCase().includes(normalizedSearch)
            || student.email.toLowerCase().includes(normalizedSearch)
            || (student.status || '').toLowerCase().includes(normalizedSearch)
            || (student.yearLevel || '').toLowerCase().includes(normalizedSearch)
            || (student.section || '').toLowerCase().includes(normalizedSearch)
        );
    }, [programStudents, studentSearch]);

    const openCreateDialog = () => {
        setFormMode('create');
        setSelectedProgram(null);
        setFormState(defaultFormState);
        setFormError(null);
        setIsFormOpen(true);
    };

    const openEditDialog = (program: ProgramItem) => {
        setFormMode('edit');
        setSelectedProgram(program);
        setFormState({ name: program.name, code: program.code || '' });
        setFormError(null);
        setIsFormOpen(true);
    };

    const handleSaveProgram = async () => {
        const name = formState.name.trim();
        const code = formState.code.trim();
        if (!name) {
            setFormError('Program name is required.');
            return;
        }
        try {
            setSaving(true);
            setFormError(null);
            const payload = { name, code: code || undefined };
            if (formMode === 'create') {
                await api.post('/tracks', payload);
                toast.success('Program created successfully.');
            } else if (selectedProgram) {
                await api.patch(`/tracks/${selectedProgram.id}`, payload);
                toast.success('Program updated successfully.');
            }
            setIsFormOpen(false);
            setSelectedProgram(null);
            setFormState(defaultFormState);
            await fetchPrograms();
        } catch (error) {
            setFormError(getApiErrorMessage(error) || 'Failed to save program.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProgram = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        setDeleteTarget(null);
        try {
            await api.delete(`/tracks/${target.id}`);
            if (selectedProgram?.id === target.id) {
                setSelectedProgram(null);
                setProgramStudents([]);
                setStudentsOpen(false);
            }
            toast.success('Program deleted successfully.');
            await fetchPrograms();
        } catch (error) {
            toast.error(getApiErrorMessage(error) || 'Failed to delete program.');
        }
    };

    const fetchStudentsForProgram = async (program: ProgramItem) => {
        setSelectedProgram(program);
        setStudentsOpen(true);
        setStudentSearch('');
        setStudentsLoading(true);
        try {
            const allStudents: StudentItem[] = [];
            let page = 1;
            let totalPages = 1;
            do {
                const response = await api.get<UserListResponse>('/users', {
                    params: { page, limit: 200, role: 'REVIEWEE', trackId: program.id },
                });
                allStudents.push(...(response.data?.data || []));
                totalPages = response.data?.meta?.totalPages || 1;
                page += 1;
            } while (page <= totalPages);
            setProgramStudents(allStudents);
        } catch (error) {
            setProgramStudents([]);
            toast.error(getApiErrorMessage(error) || 'Failed to load students for this program.');
        } finally {
            setStudentsLoading(false);
        }
    };

    const columns = useMemo<ResourceColumn<ProgramItem>[]>(
        () => [
            {
                id: 'name',
                header: 'Program',
                primary: true,
                sortable: true,
                sortValue: (program) => program.name,
                className: 'min-w-[240px]',
                cell: (program) => (
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{program.name}</p>
                        <p className="mt-0.5 truncate text-[12px] text-slate-400">
                            Created {formatShortDate(program.createdAt ?? undefined)}
                        </p>
                    </div>
                ),
            },
            {
                id: 'code',
                header: 'Code',
                sortable: true,
                sortValue: (program) => program.code || '',
                className: 'w-[120px]',
                cell: (program) => program.code ? (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-semibold text-slate-700">
                        {program.code}
                    </span>
                ) : (
                    <span className="text-[12px] text-slate-400">No code</span>
                ),
            },
            {
                id: 'updated',
                header: 'Last Updated',
                sortable: true,
                sortValue: (program) => new Date(program.updatedAt || 0).getTime(),
                className: 'w-[120px] whitespace-nowrap',
                cell: (program) => formatShortDate(program.updatedAt ?? undefined),
            },
        ],
        [],
    );

    const renderRowActions = useCallback(
        (program: ProgramItem) => (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700"
                        aria-label={`Actions for ${program.name}`}
                    >
                        <MoreHorizontal size={15} aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-lg">
                    <DropdownMenuItem
                        className="cursor-pointer gap-2 py-2 text-[12px] font-semibold"
                        onClick={() => fetchStudentsForProgram(program)}
                    >
                        <Users size={13} aria-hidden="true" /> View Students
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="cursor-pointer gap-2 py-2 text-[12px] font-semibold"
                        onClick={() => openEditDialog(program)}
                    >
                        <Pencil size={13} aria-hidden="true" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="cursor-pointer gap-2 py-2 text-[12px] font-semibold text-red-600 focus:bg-red-50 focus:text-red-600"
                        onClick={() => setDeleteTarget(program)}
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
                <Plus size={13} aria-hidden="true" /> Add Program
            </button>
        </Button>
    );

    const tableState = loading ? 'loading' : errorMessage ? 'error' : 'ready';

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <ManageToolbar
                title="Programs"
                description="Manage the catalog used across registration and assignment."
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search programs…"
                searchLabel="Search programs"
                inlineFilters={
                    <>
                        <Select value={codeFilter} onValueChange={(value) => setCodeFilter(value as typeof codeFilter)}>
                            <SelectTrigger className="h-8 w-[140px] rounded-lg border-slate-200 bg-white text-[12px]" aria-label="Filter by code status">
                                <SelectValue placeholder="Code" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All codes</SelectItem>
                                <SelectItem value="WITH_CODE">With code</SelectItem>
                                <SelectItem value="NO_CODE">No code</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={activityFilter} onValueChange={(value) => setActivityFilter(value as typeof activityFilter)}>
                            <SelectTrigger className="h-8 w-[150px] rounded-lg border-slate-200 bg-white text-[12px]" aria-label="Filter by activity">
                                <SelectValue placeholder="Updated" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Any time</SelectItem>
                                <SelectItem value="UPDATED_30_DAYS">Last 30 days</SelectItem>
                                <SelectItem value="OLDER">Older</SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                }
                activeFilterCount={0}
                chips={[]}
                onClearAll={() => {}}
                createAction={createAction}
            />

            <ResourceTable
                rows={filteredPrograms}
                columns={columns}
                getRowId={(program) => program.id}
                caption="Programs used across registration and assignment"
                state={tableState}
                error={errorMessage}
                onRetry={() => void fetchPrograms()}
                emptyTitle="No programs yet"
                emptyDescription="Create your first program to start assigning students."
                emptyAction={createAction}
                rowActions={renderRowActions}
                resetKey={`${search}|${codeFilter}|${activityFilter}`}
            />

            {/* Create / Edit Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{formMode === 'create' ? 'Add Program' : 'Edit Program'}</DialogTitle>
                        <DialogDescription>
                            {formMode === 'create'
                                ? 'Create a program that admins can assign to students and use across the platform.'
                                : 'Update the program details. Existing student assignments will stay linked to this program.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="program-name">Program Name</Label>
                            <Input
                                id="program-name"
                                value={formState.name}
                                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                                placeholder="Bachelor of Secondary Education"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="program-code">Program Code</Label>
                            <Input
                                id="program-code"
                                value={formState.code}
                                onChange={(event) => setFormState((current) => ({ ...current, code: event.target.value }))}
                                placeholder="BSED"
                            />
                            <p className="text-xs text-gray-500">Optional. Use a short code if your team already relies on one.</p>
                        </div>
                        {formError && <p className="text-sm text-rose-600">{formError}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSaveProgram} disabled={saving}>
                            {formMode === 'create' ? 'Create Program' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Students Dialog */}
            <Dialog open={studentsOpen} onOpenChange={setStudentsOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{selectedProgram ? `${selectedProgram.name} Students` : 'Program Students'}</DialogTitle>
                        <DialogDescription>View every student currently assigned to this program.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{selectedProgram?.name || 'Selected program'}</p>
                                <p className="text-xs text-slate-500">{studentsLoading ? 'Loading students...' : `${programStudents.length} student${programStudents.length === 1 ? '' : 's'} found`}</p>
                            </div>
                            <div className="relative w-full lg:w-72">
                                <Input
                                    value={studentSearch}
                                    onChange={(event) => setStudentSearch(event.target.value)}
                                    placeholder="Search students…"
                                    className="h-8 rounded-lg border-slate-200 bg-white text-[12px]"
                                />
                            </div>
                        </div>
                        {studentsLoading ? (
                            <div className="flex items-center justify-center gap-3 py-16 text-sm text-gray-500">
                                Loading students…
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-base font-semibold text-gray-900">No students found.</p>
                                <p className="mt-2 text-sm text-gray-500">
                                    {programStudents.length === 0 ? 'This program does not have assigned students yet.' : 'Try a different search term.'}
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-105 overflow-y-auto rounded-xl border border-slate-100">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Year</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Section</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map((student) => (
                                            <tr key={student.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                                                    <p className="text-xs text-slate-500">{student.email}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                                        {student.status || 'UNKNOWN'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{student.yearLevel || 'N/A'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{student.section || 'N/A'}</td>
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
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title="Delete Program"
                description={deleteTarget
                    ? `Delete ${deleteTarget.name}? Assigned students will become unassigned and legacy program labels tied to this program will be cleared.`
                    : 'Delete this program?'}
                confirmLabel="Delete Program"
                onConfirm={handleDeleteProgram}
            />
        </div>
    );
};

export default ProgramsPage;
