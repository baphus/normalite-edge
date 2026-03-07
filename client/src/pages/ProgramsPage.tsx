import React, { useEffect, useMemo, useState } from 'react';
import {
    GraduationCap,
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

const formatDate = (value?: string | null) => {
    const parsed = toValidDate(value);
    if (!parsed) return 'N/A';

    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const normalizeProgram = (program: ProgramApiItem): ProgramItem => ({
    id: program.id,
    name: program.name?.trim() || 'Untitled Program',
    code: program.code || null,
    createdAt: program.createdAt || null,
    updatedAt: program.updatedAt || null,
});

const ProgramsPage: React.FC = () => {
    const [programs, setPrograms] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
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

    const fetchPrograms = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const response = await api.get('/tracks');
            const rows = (response.data?.data || []) as ProgramApiItem[];
            setPrograms(rows.map(normalizeProgram));
        } catch (error: any) {
            setErrorMessage(error?.response?.data?.message || 'Failed to load programs.');
            setPrograms([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

    const filteredPrograms = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) return programs;

        return programs.filter((program) =>
            program.name.toLowerCase().includes(normalizedSearch)
            || (program.code || '').toLowerCase().includes(normalizedSearch)
        );
    }, [programs, search]);

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

    const codedPrograms = useMemo(() => programs.filter((program) => Boolean(program.code)).length, [programs]);
    const recentlyUpdatedPrograms = useMemo(() => {
        const threshold = Date.now() - (1000 * 60 * 60 * 24 * 30);
        return programs.filter((program) => {
            const updatedAt = toValidDate(program.updatedAt);
            return updatedAt ? updatedAt.getTime() >= threshold : false;
        }).length;
    }, [programs]);

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
        setFormState({
            name: program.name,
            code: program.code || '',
        });
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

            const payload = {
                name,
                code: code || undefined,
            };

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
        } catch (error: any) {
            setFormError(error?.response?.data?.message || 'Failed to save program.');
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
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete program.');
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
                    params: {
                        page,
                        limit: 200,
                        role: 'REVIEWEE',
                        trackId: program.id,
                    },
                });

                allStudents.push(...(response.data?.data || []));
                totalPages = response.data?.meta?.totalPages || 1;
                page += 1;
            } while (page <= totalPages);

            setProgramStudents(allStudents);
        } catch (error: any) {
            setProgramStudents([]);
            toast.error(error?.response?.data?.message || 'Failed to load students for this program.');
        } finally {
            setStudentsLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6 bg-[#fafaf8] min-h-full">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-primary/70">Admin Workspace</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950">Programs</h1>
                    <p className="mt-2 max-w-2xl text-sm text-gray-600">
                        Manage the program catalog used across registration, student assignment, and program-based access.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={fetchPrograms} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                    <Button type="button" onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Program
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Total Programs</p>
                                <p className="mt-3 text-3xl font-black text-gray-950">{programs.length}</p>
                            </div>
                            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">With Codes</p>
                                <p className="mt-3 text-3xl font-black text-gray-950">{codedPrograms}</p>
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
                                <p className="mt-3 text-3xl font-black text-gray-950">{recentlyUpdatedPrograms}</p>
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
                            <h2 className="text-lg font-bold text-gray-950">Program Directory</h2>
                            <p className="text-sm text-gray-500">Create, update, or remove programs and inspect the students assigned to each one.</p>
                        </div>
                        <div className="relative w-full lg:w-80">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by program name or code"
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
                            Loading programs...
                        </div>
                    ) : filteredPrograms.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <p className="text-base font-semibold text-gray-900">No programs found.</p>
                            <p className="mt-2 text-sm text-gray-500">
                                {programs.length === 0 ? 'Create your first program to start assigning students.' : 'Try a different search term.'}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Program</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPrograms.map((program) => (
                                    <TableRow key={program.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-semibold text-gray-950">{program.name}</p>
                                                <p className="text-xs text-gray-500">Created {formatDate(program.createdAt)}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {program.code ? (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-700">{program.code}</Badge>
                                            ) : (
                                                <span className="text-sm text-gray-400">No code</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">{formatDate(program.updatedAt)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => fetchStudentsForProgram(program)}
                                                >
                                                    <Users className="mr-2 h-4 w-4" />
                                                    View Students
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(program)}
                                                    aria-label={`Edit ${program.name}`}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-rose-600 hover:text-rose-700"
                                                    onClick={() => setDeleteTarget(program)}
                                                    aria-label={`Delete ${program.name}`}
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
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {formMode === 'create' ? 'Create Program' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={studentsOpen} onOpenChange={setStudentsOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{selectedProgram ? `${selectedProgram.name} Students` : 'Program Students'}</DialogTitle>
                        <DialogDescription>
                            View every student currently assigned to this program.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{selectedProgram?.name || 'Selected program'}</p>
                                <p className="text-xs text-gray-500">{studentsLoading ? 'Loading students...' : `${programStudents.length} student${programStudents.length === 1 ? '' : 's'} found`}</p>
                            </div>
                            <div className="relative w-full lg:w-72">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    value={studentSearch}
                                    onChange={(event) => setStudentSearch(event.target.value)}
                                    placeholder="Search students"
                                    className="bg-white pl-9"
                                />
                            </div>
                        </div>

                        {studentsLoading ? (
                            <div className="flex items-center justify-center gap-3 py-16 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading students...
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-base font-semibold text-gray-900">No students found.</p>
                                <p className="mt-2 text-sm text-gray-500">
                                    {programStudents.length === 0 ? 'This program does not have assigned students yet.' : 'Try a different search term.'}
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-105 overflow-y-auto rounded-xl border border-gray-100">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Section</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-semibold text-gray-950">{student.name}</p>
                                                        <p className="text-xs text-gray-500">{student.email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                                                        {student.status || 'UNKNOWN'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">{student.yearLevel || 'N/A'}</TableCell>
                                                <TableCell className="text-sm text-gray-600">{student.section || 'N/A'}</TableCell>
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
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
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