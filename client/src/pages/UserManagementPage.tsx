import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Columns3,
    Edit,
    Eye,
    Filter,
    Search,
    Shield,
    Trash2,
    UserCog,
    UserPlus,
    UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/axios';
import { NO_SUFFIX_VALUE, SUFFIX_OPTIONS } from '@/lib/userOptions';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSearchParams } from 'react-router-dom';

type UserRole = 'ADMIN' | 'REVIEWER' | 'REVIEWEE';
/**
 * Reviewees are never provisioned here — they self-register with an
 * institutional Google account. Only external staff are invited.
 */
type CreateUserRole = 'ADMIN' | 'REVIEWER';
type UiStatus = 'active' | 'inactive';
type ApiStatus = 'ACTIVE' | 'DISABLED';
type UserColumn = 'user' | 'academic' | 'role' | 'status' | 'joined';
type SortDirection = 'asc' | 'desc';
type SortKey = 'name' | 'program' | 'role' | 'status' | 'dateJoined';

interface User {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    middleInitial?: string;
    suffix?: string;
    email: string;
    picture: string;
    program: string;
    campus: string;
    yearLevel: string;
    section: string;
    role: UserRole;
    status: UiStatus;
    trackId?: string;
    campusId?: string;
    dateJoined: string;
}

interface UserApiItem {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    middleInitial?: string | null;
    suffix?: string | null;
    email: string;
    role: UserRole;
    status: ApiStatus;
    program?: string | null;
    campus?: string | null;
    campus_id?: string | null;
    major?: string | null;
    yearLevel?: string | null;
    section?: string | null;
    profilePicture?: string | null;
    profile_picture?: string | null;
    picture?: string | null;
    avatar?: string | null;
    createdAt: string;
    trackId?: string | null;
    campusId?: string | null;
}


const statusFromApi = (status: UserApiItem['status']): UiStatus =>
    status === 'DISABLED' ? 'inactive' : 'active';

const statusToApi = (status: UiStatus): ApiStatus =>
    status === 'inactive' ? 'DISABLED' : 'ACTIVE';

const toUiUser = (item: UserApiItem): User => ({
    id: item.id,
    name: item.name,
    firstName: item.firstName,
    lastName: item.lastName,
    middleInitial: item.middleInitial || '',
    suffix: item.suffix || '',
    email: item.email,
    picture: item.profilePicture || item.profile_picture || item.picture || item.avatar || '',
    program: item.program || 'N/A',
    campus: item.campus || 'N/A',
    yearLevel: item.yearLevel || 'N/A',
    section: item.section || 'N/A',
    role: item.role,
    status: statusFromApi(item.status),
    trackId: item.trackId || undefined,
    campusId: item.campusId || undefined,
    dateJoined: item.createdAt,
});

const normalizeProfileImageUrl = (rawUrl?: string | null): string => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    return trimmed;
};

const defaultCreateForm = {
    firstName: '',
    middleInitial: '',
    lastName: '',
    suffix: '',
    email: '',
    role: 'REVIEWER' as CreateUserRole,
    campus_id: '',
};

const roleBadgeClass: Record<UserRole, string> = {
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-100',
    REVIEWER: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    REVIEWEE: 'bg-primary/10 text-primary border-primary/20',
};

const statusBadgeClass: Record<UiStatus, string> = {
    active: 'bg-green-50 text-green-700 border-green-100',
    inactive: 'bg-rose-50 text-rose-700 border-rose-100',
};

const statusRank: Record<UiStatus, number> = {
    active: 2,
    inactive: 1,
};

const columnLabels: Record<UserColumn, string> = {
    user: 'User',
    academic: 'Academic',
    role: 'Role',
    status: 'Status',
    joined: 'Joined',
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const UserManagementPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [users, setUsers] = useState<User[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(14);
    const [loading, setLoading] = useState(false);
    const [mutatingId, setMutatingId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | UiStatus>('ALL');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editRole, setEditRole] = useState<UserRole>('REVIEWEE');
    const [editStatus, setEditStatus] = useState<UiStatus>('active');
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editMiddleInitial, setEditMiddleInitial] = useState('');
    const [editSuffix, setEditSuffix] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editTrackId, setEditTrackId] = useState('');
    const [editCampusId, setEditCampusId] = useState('');
    const [editYearLevel, setEditYearLevel] = useState('');
    const [editSection, setEditSection] = useState('');
interface CampusOption {
    id: string;
    name: string;
    code?: string | null;
}
    const [campuses, setCampuses] = useState<CampusOption[]>([]);
    const [campusesLoading, setCampusesLoading] = useState(false);
    const [createForm, setCreateForm] = useState({ ...defaultCreateForm });
    const [createError, setCreateError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    // Invite and recovery links are shown once, right after they are created.
    // They are never stored — the admin copies and delivers them.
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState<string>('');
    const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
    const [sortBy, setSortBy] = useState<SortKey>('dateJoined');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
    const [visibleColumns, setVisibleColumns] = useState<Record<UserColumn, boolean>>({
        user: true,
        academic: true,
        role: true,
        status: true,
        joined: true,
    });

    const fetchUsers = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const response = await api.get('/users', {
                params: {
                    page,
                    limit,
                    search: search || undefined,
                    role: roleFilter === 'ALL' ? undefined : roleFilter,
                    status: statusFilter === 'ALL' ? undefined : statusToApi(statusFilter),
                },
            });

            const records = (response.data?.data || []) as UserApiItem[];
            setUsers(records.map(toUiUser));
            setTotalUsers(response.data?.meta?.total || records.length);
        } catch (error: any) {
            setErrorMessage(error?.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, roleFilter, statusFilter]);

    useEffect(() => {
        const fetchCampuses = async () => {
            setCampusesLoading(true);
            try {
                const response = await api.get('/campuses');
                setCampuses((response.data?.data || []) as CampusOption[]);
            } catch {
                setCampuses([]);
            } finally {
                setCampusesLoading(false);
            }
        };

        fetchCampuses();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setPage(1);
            fetchUsers();
        }, 350);

        return () => clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        const create = searchParams.get('create');
        if (create !== 'reviewee') return;

        // Students are no longer created by an administrator — they register
        // themselves with their university Google account.
        toast.info(
            'Students register themselves with their @cnu.edu.ph Google account. Share the sign-up link with them instead.'
        );

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('create');
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const handleView = (user: User) => {
        setSelectedUser(user);
        setIsViewModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setEditRole(user.role);
        setEditStatus(user.status);
        setEditFirstName(user.firstName);
        setEditLastName(user.lastName);
        setEditMiddleInitial(user.middleInitial || '');
        setEditSuffix(user.suffix || '');
        setEditEmail(user.email);
        setEditTrackId(user.trackId || '');
        setEditCampusId(user.campusId || '');
        setEditYearLevel(user.yearLevel);
        setEditSection(user.section);
        setIsEditModalOpen(true);
    };

    const handleDelete = (user: User) => {
        setDeleteUserTarget(user);
    };

    const confirmDeleteUser = async () => {
        if (!deleteUserTarget) return;
        const target = deleteUserTarget;
        setDeleteUserTarget(null);
        try {
            setMutatingId(target.id);
            if (users.length === 1 && page > 1) {
                setPage((prev) => prev - 1);
            } else {
                await api.delete(`/users/${target.id}`);
                await fetchUsers();
            }
            toast.success(`${target.name} has been deleted.`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete user.');
        } finally {
            setMutatingId(null);
        }
    };

    const handleCreate = async () => {
        setCreateError(null);
        if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) {
            setCreateError('First name, last name, and email are required.');
            return;
        }
        if (createForm.email.trim().toLowerCase().endsWith('@cnu.edu.ph')) {
            setCreateError(
                'CNU accounts sign in with Google and cannot be invited. Ask them to sign in, then change their role here.'
            );
            return;
        }
        if (createForm.role === 'REVIEWER' && !createForm.campus_id.trim()) {
            setCreateError('Campus is required for reviewers.');
            return;
        }
        try {
            setCreating(true);
            const response = await api.post('/users', {
                firstName: createForm.firstName.trim(),
                middleInitial: createForm.middleInitial.trim() || undefined,
                lastName: createForm.lastName.trim(),
                suffix: createForm.suffix.trim() || undefined,
                email: createForm.email.trim(),
                role: createForm.role,
                campus_id: createForm.campus_id || undefined,
            });

            // Shown once, right here. No email is sent — the admin copies the
            // link and delivers it over a channel they trust.
            setInviteLink(response.data?.data?.inviteLink ?? null);
            setInviteEmail(createForm.email.trim());
            setIsCreateModalOpen(false);
            setCreateForm({ ...defaultCreateForm });
            await fetchUsers();
            toast.success('Invite link created.');
        } catch (error: any) {
            setCreateError(error?.response?.data?.message || 'Failed to create user');
        } finally {
            setCreating(false);
        }
    };

    /** Fresh set-password link — covers an expired invite and a lost password. */
    const handleGenerateAccessLink = async (user: User) => {
        try {
            setMutatingId(user.id);
            const response = await api.post(`/users/${user.id}/access-link`);
            setInviteLink(response.data?.data?.accessLink ?? null);
            setInviteEmail(user.email);
            setIsEditModalOpen(false);
            toast.success('Access link created.');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to generate an access link.');
        } finally {
            setMutatingId(null);
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedUser) return;

        try {
            setMutatingId(selectedUser.id);

            const body: Record<string, any> = {};

            // Name fields
            if (editFirstName !== selectedUser.firstName) body.firstName = editFirstName;
            if (editLastName !== selectedUser.lastName) body.lastName = editLastName;
            if (editMiddleInitial !== (selectedUser.middleInitial || '')) body.middleInitial = editMiddleInitial || undefined;
            if (editSuffix !== (selectedUser.suffix || '')) body.suffix = editSuffix || undefined;
            
            // Email and password are intentionally not sent. Both live in
            // Supabase Auth: email is the shared key with auth.users, and a
            // password is set by its owner through an access link.

            // Academic fields
            if (editTrackId !== (selectedUser.trackId || '')) body.track_id = editTrackId || undefined;
            if (editCampusId !== (selectedUser.campusId || '')) body.campus_id = editCampusId || undefined;
            if (editYearLevel !== selectedUser.yearLevel) body.yearLevel = editYearLevel;
            if (editSection !== selectedUser.section) body.section = editSection;

            // Role and Status still use their dedicated endpoints
            if (editRole !== selectedUser.role) {
                await api.patch(`/users/${selectedUser.id}/role`, { role: editRole });
            }

            if (editStatus !== selectedUser.status) {
                await api.patch(`/users/${selectedUser.id}/status`, { status: statusToApi(editStatus) });
            }

            // Send all detail changes in one call
            if (Object.keys(body).length > 0) {
                await api.patch(`/users/${selectedUser.id}`, body);
            }

            setIsEditModalOpen(false);
            setSelectedUser(null);
            await fetchUsers();
            toast.success('User updated successfully.');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to update user.');
        } finally {
            setMutatingId(null);
        }
    };

    const handleSort = (key: SortKey) => {
        if (sortBy === key) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortBy(key);
        setSortDirection('asc');
    };

    const sortedUsers = useMemo(() => {
        const copy = [...users];
        copy.sort((first, second) => {
            let value = 0;

            if (sortBy === 'name') {
                value = first.name.localeCompare(second.name);
            } else if (sortBy === 'program') {
                value = first.program.localeCompare(second.program);
            } else if (sortBy === 'role') {
                value = first.role.localeCompare(second.role);
            } else if (sortBy === 'status') {
                value = statusRank[first.status] - statusRank[second.status];
            } else {
                value = new Date(first.dateJoined).getTime() - new Date(second.dateJoined).getTime();
            }

            return sortDirection === 'asc' ? value : -value;
        });

        return copy;
    }, [users, sortBy, sortDirection]);

    const summary = useMemo(() => {
        const active = users.filter((u) => u.status === 'active').length;
        const inactive = users.filter((u) => u.status === 'inactive').length;
        return { active, inactive };
    }, [users]);

    const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length + 1;
    const totalPages = Math.max(1, Math.ceil(totalUsers / limit));
    const fromCount = totalUsers === 0 ? 0 : (page - 1) * limit + 1;
    const toCount = Math.min(page * limit, totalUsers);

    const renderSortIcon = (key: SortKey) => {
        if (sortBy !== key) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
        if (sortDirection === 'asc') return <ArrowUp className="w-3.5 h-3.5 text-primary" />;
        return <ArrowDown className="w-3.5 h-3.5 text-primary" />;
    };

    const resetFilters = () => {
        setRoleFilter('ALL');
        setStatusFilter('ALL');
        setPage(1);
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden font-lexend -mx-5 -mt-4">
            <header className="h-20 bg-white border-b border-[#800000]/10 px-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight shrink-0">User Management</h1>
                    <div className="relative w-full max-w-md ml-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by name, email, program, campus..."
                            className="w-full pl-10 pr-4 h-10 bg-slate-100 border-slate-100 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-[#800000]/20"
                        />
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setCreateError(null);
                        setCreateForm({ ...defaultCreateForm });
                        setIsCreateModalOpen(true);
                    }}
                    className="h-10 px-4 rounded-lg bg-[#800000] hover:bg-[#6d0000] text-white text-sm font-semibold gap-2 shadow-lg shadow-[#800000]/20"
                >
                    <UserPlus className="w-4 h-4" /> Create User
                </Button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border border-[#800000]/5 rounded-xl shadow-sm bg-white">
                    <CardContent className="p-6 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Users</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{totalUsers}</h3>
                            <p className="text-xs text-[#800000]/70 font-medium mt-2">Across all user roles</p>
                        </div>
                        <div className="bg-[#800000]/10 text-[#800000] p-3 rounded-lg">
                            <UserCog className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-[#800000]/5 rounded-xl shadow-sm bg-white">
                    <CardContent className="p-6 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Users</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{summary.active}</h3>
                            <p className="text-xs text-green-600 font-medium mt-2">Accounts currently enabled</p>
                        </div>
                        <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-[#800000]/5 rounded-xl shadow-sm bg-white">
                    <CardContent className="p-6 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">External Accounts</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">
                                {users.filter((u) => !u.email.toLowerCase().endsWith('@cnu.edu.ph')).length}
                            </h3>
                            <p className="text-xs text-[#D4AF37] font-medium mt-2">Invited reviewers and admins</p>
                        </div>
                        <div className="bg-[#D4AF37]/10 text-[#D4AF37] p-3 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-[#800000]/5 rounded-xl shadow-sm bg-white">
                    <CardContent className="p-6 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Inactive Users</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{summary.inactive}</h3>
                            <p className="text-xs text-rose-600 font-medium mt-2">Disabled or rejected accounts</p>
                        </div>
                        <div className="bg-rose-100 text-rose-600 p-3 rounded-lg">
                            <UserX className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="rounded-xl border border-[#800000]/10 bg-white p-3 shadow-sm space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                    <Select value={roleFilter} onValueChange={(value) => { setPage(1); setRoleFilter(value as 'ALL' | UserRole); }}>
                        <SelectTrigger className="w-auto min-w-44 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 transition-colors">
                            <span className="text-slate-400 mr-1">Role:</span>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-lexend">
                            <SelectItem value="ALL">All Roles</SelectItem>
                            <SelectItem value="REVIEWEE">Reviewee</SelectItem>
                            <SelectItem value="REVIEWER">Reviewer</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(value) => { setPage(1); setStatusFilter(value as 'ALL' | UiStatus); }}>
                        <SelectTrigger className="w-auto min-w-44 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 transition-colors">
                            <span className="text-slate-400 mr-1">Status:</span>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-lexend">
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 gap-2" onClick={resetFilters}>
                        <Filter className="w-4 h-4" />
                        Reset Filters
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 gap-2">
                                <Columns3 className="w-4 h-4" /> Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="font-lexend min-w-44">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-gray-500">Visible columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {(Object.keys(visibleColumns) as UserColumn[]).map((key) => (
                                <DropdownMenuCheckboxItem
                                    key={key}
                                    checked={visibleColumns[key]}
                                    onCheckedChange={(checked) => {
                                        setVisibleColumns((prev) => ({ ...prev, [key]: checked === true }));
                                    }}
                                    className="text-xs font-semibold"
                                >
                                    {columnLabels[key]}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {errorMessage && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                        {errorMessage}
                    </div>
                )}

                <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 border-b border-slate-100">
                                <TableRow className="border-gray-100">
                                    {visibleColumns.user && (
                                        <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 min-w-64">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('name')}>
                                                User {renderSortIcon('name')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.academic && (
                                        <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 min-w-52">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('program')}>
                                                Academic {renderSortIcon('program')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.role && (
                                        <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('role')}>
                                                Role {renderSortIcon('role')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.status && (
                                        <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('status')}>
                                                Status {renderSortIcon('status')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.joined && (
                                        <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('dateJoined')}>
                                                Joined {renderSortIcon('dateJoined')}
                                            </button>
                                        </TableHead>
                                    )}
                                    <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumnCount} className="px-3 py-8 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                            Loading users...
                                        </TableCell>
                                    </TableRow>
                                ) : sortedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumnCount} className="px-3 py-8 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedUsers.map((user) => (
                                        <TableRow key={user.id} className="border-gray-100 hover:bg-gray-50/70 align-top">
                                            {visibleColumns.user && (
                                                <TableCell className="px-3 py-2.5 min-w-64">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary overflow-hidden relative flex items-center justify-center text-[10px] font-semibold shrink-0">
                                                            {!brokenImages[user.id] && normalizeProfileImageUrl(user.picture) ? (
                                                                <img
                                                                    src={normalizeProfileImageUrl(user.picture)}
                                                                    alt={user.name}
                                                                    className="h-full w-full object-cover"
                                                                    onError={() => setBrokenImages((prev) => ({ ...prev, [user.id]: true }))}
                                                                />
                                                            ) : (
                                                                <span className="absolute inset-0 flex items-center justify-center">
                                                                    {user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            )}

                                            {visibleColumns.academic && (
                                                <TableCell className="px-3 py-2.5 min-w-52">
                                                    {user.role === 'REVIEWEE' ? (
                                                        <div className="space-y-0.5">
                                                            <p className="text-sm font-semibold text-gray-800 leading-tight">{user.program}</p>
                                                            <p className="text-xs text-gray-500 leading-tight">
                                                                {user.yearLevel !== 'N/A' ? user.yearLevel : 'Year N/A'}
                                                                {' • '}
                                                                {user.section !== 'N/A' ? `Section ${user.section}` : 'Section N/A'}
                                                            </p>
                                                            <p className="text-xs text-gray-500 leading-tight">{user.campus}</p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-800 leading-tight">{user.campus}</p>
                                                            <p className="text-xs text-gray-500 leading-tight mt-0.5">Campus</p>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            )}

                                            {visibleColumns.role && (
                                                <TableCell className="px-3 py-2.5">
                                                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold border ${roleBadgeClass[user.role]}`}>
                                                        {user.role}
                                                    </Badge>
                                                </TableCell>
                                            )}

                                            {visibleColumns.status && (
                                                <TableCell className="px-3 py-2.5">
                                                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold border ${statusBadgeClass[user.status]}`}>
                                                        {user.status}
                                                    </Badge>
                                                </TableCell>
                                            )}

                                            {visibleColumns.joined && (
                                                <TableCell className="px-3 py-2.5 text-xs font-semibold text-gray-600">
                                                    {formatDate(user.dateJoined)}
                                                </TableCell>
                                            )}

                                            <TableCell className="px-3 py-2.5 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                                                        onClick={() => handleView(user)}
                                                        disabled={mutatingId === user.id}
                                                        aria-label={`View ${user.name}`}
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg text-slate-700 hover:bg-slate-100"
                                                        onClick={() => handleEdit(user)}
                                                        disabled={mutatingId === user.id}
                                                        aria-label={`Edit ${user.name}`}
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg text-rose-700 hover:bg-rose-50"
                                                        onClick={() => handleDelete(user)}
                                                        disabled={mutatingId === user.id}
                                                        aria-label={`Delete ${user.name}`}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-slate-500">
                            Showing <span className="text-gray-900">{fromCount}-{toCount}</span> of <span className="text-gray-900">{totalUsers}</span> users
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg border-gray-200"
                                disabled={page <= 1 || loading}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Badge variant="outline" className="h-8 px-3 rounded-lg text-xs font-bold border-gray-200">
                                {page} / {totalPages}
                            </Badge>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg border-gray-200"
                                disabled={page >= totalPages || loading}
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
            </div>

            <Dialog open={isCreateModalOpen} onOpenChange={(open) => { if (!creating) { setIsCreateModalOpen(open); setCreateError(null); } }}>
                <DialogContent className="sm:max-w-md rounded-lg font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-primary" /> Invite External User
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            For reviewers and administrators from outside the university. Anyone with a
                            @cnu.edu.ph address signs in with Google instead — invite them by asking them
                            to sign in, then change their role here.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 py-1">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 col-span-2">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">User Type</Label>
                                <Select value={createForm.role} onValueChange={(v) => setCreateForm((prev) => ({
                                    ...prev,
                                    role: v as CreateUserRole,
                                }))}>
                                    <SelectTrigger className="h-8 rounded-md border-gray-200 bg-white font-semibold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="font-lexend">
                                        <SelectItem value="REVIEWER">Reviewer</SelectItem>
                                        <SelectItem value="ADMIN">Administrator</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">First Name <span className="text-rose-500">*</span></Label>
                                <Input
                                    value={createForm.firstName}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, firstName: e.target.value }))}
                                    placeholder="Juan"
                                    className="h-8 rounded-md border-gray-200 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Middle Initial</Label>
                                <Input
                                    value={createForm.middleInitial}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, middleInitial: e.target.value.slice(0, 1) }))}
                                    placeholder="M"
                                    maxLength={1}
                                    className="h-8 rounded-md border-gray-200 text-xs"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Last Name <span className="text-rose-500">*</span></Label>
                            <Input
                                value={createForm.lastName}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, lastName: e.target.value }))}
                                placeholder="Dela Cruz"
                                className="h-8 rounded-md border-gray-200 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Suffix <span className="text-gray-400 normal-case font-normal">(optional)</span></Label>
                            <Select
                                value={createForm.suffix || NO_SUFFIX_VALUE}
                                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, suffix: value === NO_SUFFIX_VALUE ? '' : value }))}
                            >
                                <SelectTrigger className="h-8 rounded-md border-gray-200 bg-white font-semibold text-xs">
                                    <SelectValue placeholder="Select suffix" />
                                </SelectTrigger>
                                <SelectContent className="font-lexend">
                                    <SelectItem value={NO_SUFFIX_VALUE}>No suffix</SelectItem>
                                    {SUFFIX_OPTIONS.map((suffixOption) => (
                                        <SelectItem key={suffixOption} value={suffixOption}>{suffixOption}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Email <span className="text-rose-500">*</span></Label>
                            <Input
                                type="email"
                                value={createForm.email}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder="reviewer@partner.edu.ph"
                                className="h-8 rounded-md border-gray-200 text-xs"
                            />
                            <p className="text-[10px] leading-relaxed text-gray-500">
                                No password is set here. You will get a one-time link to send them, and
                                they choose their own password.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Campus {createForm.role === 'REVIEWER' && <span className="text-rose-500">*</span>}
                            </Label>
                            <Select
                                value={createForm.campus_id}
                                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, campus_id: value }))}
                                disabled={campusesLoading || campuses.length === 0}
                            >
                                <SelectTrigger className="h-8 rounded-md border-gray-200 bg-white font-semibold text-xs">
                                    <SelectValue placeholder={campusesLoading ? 'Loading campuses...' : 'Select a campus'} />
                                </SelectTrigger>
                                <SelectContent className="font-lexend">
                                    {campuses.map((campus) => (
                                        <SelectItem key={campus.id} value={campus.id}>
                                            {campus.code ? `${campus.name} (${campus.code})` : campus.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {createError && (
                            <p className="text-xs font-semibold text-rose-600 rounded-md border border-rose-100 bg-rose-50 px-3 py-2">{createError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={creating} className="h-8 rounded-md border-gray-200 text-xs font-semibold">
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={creating} className="h-8 rounded-md bg-primary hover:bg-primary/95 text-white text-xs font-semibold">
                            {creating ? 'Creating...' : 'Create invite link'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Shown once after an invite or reset. No email is sent — the
                admin delivers this over a channel they trust. */}
            <Dialog open={Boolean(inviteLink)} onOpenChange={(open) => !open && setInviteLink(null)}>
                <DialogContent className="sm:max-w-lg rounded-lg font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-primary" /> Send this link to {inviteEmail}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            It lets them set their own password. It expires, and it is shown only once —
                            copy it now. You can always generate a new one from their profile.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-1">
                        <textarea
                            readOnly
                            value={inviteLink ?? ''}
                            onFocus={(e) => e.currentTarget.select()}
                            rows={3}
                            className="w-full resize-none rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-[11px] leading-relaxed text-gray-700"
                        />
                        <p className="text-[11px] leading-relaxed text-amber-700">
                            Treat it like a password: anyone holding this link can take over the account
                            until it is used or expires. Avoid group chats.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setInviteLink(null)}
                            className="h-8 rounded-md border-gray-200 text-xs font-semibold"
                        >
                            Done
                        </Button>
                        <Button
                            onClick={() => {
                                if (inviteLink) {
                                    void navigator.clipboard.writeText(inviteLink);
                                    toast.success('Link copied to clipboard.');
                                }
                            }}
                            className="h-8 rounded-md bg-primary hover:bg-primary/95 text-white text-xs font-semibold"
                        >
                            Copy link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="sm:max-w-md rounded-lg font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Eye className="w-4 h-4 text-primary" /> User Details
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            Profile and access summary.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="grid gap-3 py-1">
                            <div className="rounded-md border border-gray-100 p-3">
                                <p className="text-sm font-bold text-gray-900">{selectedUser.name}</p>
                                <p className="text-xs text-gray-500">{selectedUser.email}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-md border border-gray-100 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Role</p>
                                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedUser.role}</p>
                                </div>
                                <div className="rounded-md border border-gray-100 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Status</p>
                                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedUser.status}</p>
                                </div>
                                <div className="rounded-md border border-gray-100 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Program</p>
                                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedUser.program}</p>
                                </div>
                                <div className="rounded-md border border-gray-100 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Campus</p>
                                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedUser.campus}</p>
                                </div>
                                <div className="rounded-md border border-gray-100 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Joined</p>
                                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{formatDate(selectedUser.dateJoined)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-lg font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" /> Edit User
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            Update details for {selectedUser?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="grid gap-4 py-2">
                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">First Name</Label>
                                    <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="h-8 rounded-md border-gray-200 text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Last Name</Label>
                                    <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="h-8 rounded-md border-gray-200 text-xs" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Middle Initial</Label>
                                    <Input value={editMiddleInitial} onChange={(e) => setEditMiddleInitial(e.target.value)} maxLength={1} className="h-8 rounded-md border-gray-200 text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Suffix</Label>
                                    <Input value={editSuffix} onChange={(e) => setEditSuffix(e.target.value)} className="h-8 rounded-md border-gray-200 text-xs" />
                                </div>
                            </div>

                            {/* Email & credentials */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Email</Label>
                                <Input value={editEmail} disabled className="h-8 rounded-md border-gray-200 bg-gray-50 text-xs" />
                                {selectedUser.email.toLowerCase().endsWith('@cnu.edu.ph') ? (
                                    <p className="text-[10px] leading-relaxed text-gray-500">
                                        Signs in with Google. There is no password to change, and the email
                                        is fixed to their university account.
                                    </p>
                                ) : (
                                    <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                                        <p className="text-[10px] leading-relaxed text-gray-500">
                                            External account. Generate a link so they can set a new password.
                                        </p>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleGenerateAccessLink(selectedUser)}
                                            disabled={mutatingId === selectedUser.id}
                                            className="h-7 shrink-0 rounded-md border-gray-200 text-[11px] font-semibold"
                                        >
                                            {mutatingId === selectedUser.id ? 'Working…' : 'Reset link'}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Role & Status */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Role</Label>
                                    <Select value={editRole} onValueChange={(value) => setEditRole(value as UserRole)}>
                                        <SelectTrigger className="h-8 rounded-md border-gray-200 bg-white font-semibold text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="font-lexend">
                                            <SelectItem value="REVIEWEE">Reviewee</SelectItem>
                                            <SelectItem value="REVIEWER">Reviewer</SelectItem>
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</Label>
                                    <Select value={editStatus} onValueChange={(value) => setEditStatus(value as UiStatus)}>
                                        <SelectTrigger className="h-8 rounded-md border-gray-200 bg-white font-semibold text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="font-lexend">
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Academic Fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Year Level</Label>
                                    <Input value={editYearLevel} onChange={(e) => setEditYearLevel(e.target.value)} className="h-8 rounded-md border-gray-200 text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Section</Label>
                                    <Input value={editSection} onChange={(e) => setEditSection(e.target.value)} className="h-8 rounded-md border-gray-200 text-xs" />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="h-8 rounded-md border-gray-200 text-xs font-semibold">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={!!mutatingId} className="h-8 rounded-md bg-primary hover:bg-primary/95 text-white text-xs font-semibold">
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteUserTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteUserTarget(null); }}
                title="Delete User"
                description={`Delete ${deleteUserTarget?.name ?? ''}? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="destructive"
                isLoading={!!mutatingId}
                onConfirm={confirmDeleteUser}
            />
        </div>
    );
};

export default UserManagementPage;
