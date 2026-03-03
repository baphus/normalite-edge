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
    MoreVertical,
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
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type UserRole = 'ADMIN' | 'REVIEWER' | 'REVIEWEE';
type UiStatus = 'active' | 'pending' | 'inactive';
type ApiStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'APPROVED' | 'REJECTED';
type UserColumn = 'user' | 'academic' | 'role' | 'status' | 'joined';
type SortDirection = 'asc' | 'desc';
type SortKey = 'name' | 'program' | 'role' | 'status' | 'dateJoined';

interface User {
    id: string;
    name: string;
    email: string;
    program: string;
    major: string;
    yearSection: string;
    role: UserRole;
    status: UiStatus;
    dateJoined: string;
}

interface UserApiItem {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: ApiStatus;
    program?: string | null;
    major?: string | null;
    yearLevel?: string | null;
    section?: string | null;
    createdAt: string;
}

const statusFromApi = (status: UserApiItem['status']): UiStatus => {
    if (status === 'ACTIVE' || status === 'APPROVED') return 'active';
    if (status === 'DISABLED' || status === 'REJECTED') return 'inactive';
    return 'pending';
};

const statusToApi = (status: UiStatus): ApiStatus => {
    if (status === 'active') return 'ACTIVE';
    if (status === 'inactive') return 'DISABLED';
    return 'PENDING';
};

const toUiUser = (item: UserApiItem): User => ({
    id: item.id,
    name: item.name,
    email: item.email,
    program: item.program || 'N/A',
    major: item.major || 'N/A',
    yearSection: [item.yearLevel, item.section].filter(Boolean).join(' - ') || 'N/A',
    role: item.role,
    status: statusFromApi(item.status),
    dateJoined: item.createdAt,
});

const roleBadgeClass: Record<UserRole, string> = {
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-100',
    REVIEWER: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    REVIEWEE: 'bg-primary/10 text-primary border-primary/20',
};

const statusBadgeClass: Record<UiStatus, string> = {
    active: 'bg-green-50 text-green-700 border-green-100',
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    inactive: 'bg-rose-50 text-rose-700 border-rose-100',
};

const statusRank: Record<UiStatus, number> = {
    active: 3,
    pending: 2,
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
    const [createForm, setCreateForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'REVIEWEE' as UserRole,
        status: 'ACTIVE' as ApiStatus,
        program_track: '',
        yearLevel: '',
        section: '',
    });
    const [createError, setCreateError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
    const [sortBy, setSortBy] = useState<SortKey>('dateJoined');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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
        const timeout = setTimeout(() => {
            setPage(1);
            fetchUsers();
        }, 350);

        return () => clearTimeout(timeout);
    }, [search]);

    const handleView = (user: User) => {
        setSelectedUser(user);
        setIsViewModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setEditRole(user.role);
        setEditStatus(user.status);
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
        if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
            setCreateError('Name, email, and password are required.');
            return;
        }
        if (createForm.role === 'REVIEWER') {
            if (!createForm.program_track.trim() || !createForm.yearLevel.trim() || !createForm.section.trim()) {
                setCreateError('Program track, year level, and section are required for Reviewers.');
                return;
            }
        }
        try {
            setCreating(true);
            await api.post('/users', {
                name: createForm.name.trim(),
                email: createForm.email.trim(),
                password: createForm.password,
                role: createForm.role,
                status: createForm.status,
                program_track: createForm.program_track.trim() || undefined,
                yearLevel: createForm.yearLevel.trim() || undefined,
                section: createForm.section.trim() || undefined,
            });
            setIsCreateModalOpen(false);
            setCreateForm({ name: '', email: '', password: '', role: 'REVIEWEE', status: 'ACTIVE', program_track: '', yearLevel: '', section: '' });
            await fetchUsers();
            toast.success('User created successfully.');
        } catch (error: any) {
            setCreateError(error?.response?.data?.message || 'Failed to create user');
        } finally {
            setCreating(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedUser) return;

        try {
            setMutatingId(selectedUser.id);

            if (editRole !== selectedUser.role) {
                await api.patch(`/users/${selectedUser.id}/role`, { role: editRole });
            }

            if (editStatus !== selectedUser.status) {
                await api.patch(`/users/${selectedUser.id}/status`, { status: statusToApi(editStatus) });
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
        const pending = users.filter((u) => u.status === 'pending').length;
        const inactive = users.filter((u) => u.status === 'inactive').length;
        return { active, pending, inactive };
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
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Accounts, roles, and access status.</p>
                </div>
                <Button
                    onClick={() => { setCreateError(null); setIsCreateModalOpen(true); }}
                    className="h-8 rounded-md bg-primary hover:bg-primary/95 text-white text-xs font-semibold gap-1.5"
                >
                    <UserPlus className="w-3.5 h-3.5" /> Create User
                </Button>
            </header>

            <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <Card className="border-gray-100 rounded-lg shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Total</p>
                            <p className="text-lg font-bold text-gray-900">{totalUsers}</p>
                        </div>
                        <UserCog className="w-4 h-4 text-primary" />
                    </CardContent>
                </Card>
                <Card className="border-gray-100 rounded-lg shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Active</p>
                            <p className="text-lg font-bold text-green-700">{summary.active}</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-green-700" />
                    </CardContent>
                </Card>
                <Card className="border-gray-100 rounded-lg shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Pending</p>
                            <p className="text-lg font-bold text-amber-700">{summary.pending}</p>
                        </div>
                        <Clock className="w-4 h-4 text-amber-700" />
                    </CardContent>
                </Card>
                <Card className="border-gray-100 rounded-lg shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Inactive</p>
                            <p className="text-lg font-bold text-rose-700">{summary.inactive}</p>
                        </div>
                        <UserX className="w-4 h-4 text-rose-700" />
                    </CardContent>
                </Card>
            </section>

            <section className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm space-y-2.5">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                    <div className="relative group flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name, email, or program"
                            className="h-8 pl-9 rounded-md border-gray-200 text-xs"
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-8 rounded-md border-gray-200 text-xs font-semibold gap-1.5">
                                <Filter className="w-3 h-3" /> Filters
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 p-3 font-lexend space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Role</Label>
                                <Select value={roleFilter} onValueChange={(value) => { setPage(1); setRoleFilter(value as 'ALL' | UserRole); }}>
                                    <SelectTrigger className="h-8 rounded-lg border-gray-200 bg-white text-xs font-semibold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="font-lexend">
                                        <SelectItem value="ALL">All Roles</SelectItem>
                                        <SelectItem value="REVIEWEE">Reviewee</SelectItem>
                                        <SelectItem value="REVIEWER">Reviewer</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</Label>
                                <Select value={statusFilter} onValueChange={(value) => { setPage(1); setStatusFilter(value as 'ALL' | UiStatus); }}>
                                    <SelectTrigger className="h-8 rounded-lg border-gray-200 bg-white text-xs font-semibold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="font-lexend">
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button variant="outline" className="h-8 w-full rounded-lg border-gray-200 text-xs font-semibold" onClick={resetFilters}>
                                Reset filters
                            </Button>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-8 rounded-md border-gray-200 text-xs font-semibold gap-1.5 bg-white">
                                <Columns3 className="w-3.5 h-3.5" /> Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-lexend min-w-44">
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

                <div className="rounded-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
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
                                                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                                                            {user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
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
                                                    <p className="text-sm font-semibold text-gray-800 leading-tight">{user.program}</p>
                                                    <p className="text-xs text-gray-500 leading-tight mt-0.5">{user.major}</p>
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1">{user.yearSection}</p>
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
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled={mutatingId === user.id}>
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="font-lexend min-w-40">
                                                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-gray-500">Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleView(user)} className="font-semibold gap-2 text-xs">
                                                            <Eye className="w-4 h-4" /> View
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(user)} className="font-semibold gap-2 text-xs">
                                                            <Edit className="w-4 h-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(user)}
                                                            className="font-semibold gap-2 text-xs text-rose-700 focus:text-rose-700 focus:bg-rose-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-gray-500">
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

            <Dialog open={isCreateModalOpen} onOpenChange={(open) => { if (!creating) { setIsCreateModalOpen(open); setCreateError(null); } }}>
                <DialogContent className="sm:max-w-md rounded-lg font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-primary" /> Create User
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            Add a new user account to the system.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 py-1">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Full Name <span className="text-rose-500">*</span></Label>
                            <Input
                                value={createForm.name}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. Juan Dela Cruz"
                                className="h-8 rounded-md border-gray-200 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Email <span className="text-rose-500">*</span></Label>
                            <Input
                                type="email"
                                value={createForm.email}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder="user@example.com"
                                className="h-8 rounded-md border-gray-200 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Password <span className="text-rose-500">*</span></Label>
                            <Input
                                type="password"
                                value={createForm.password}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                                placeholder="Min. 6 characters"
                                className="h-8 rounded-md border-gray-200 text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Role</Label>
                                <Select value={createForm.role} onValueChange={(v) => setCreateForm((prev) => ({ ...prev, role: v as UserRole }))}>
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
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</Label>
                                <Select value={createForm.status} onValueChange={(v) => setCreateForm((prev) => ({ ...prev, status: v as ApiStatus }))}>
                                    <SelectTrigger className="h-8 rounded-md border-gray-200 bg-white font-semibold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="font-lexend">
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="DISABLED">Disabled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Program Track {createForm.role === 'REVIEWER' ? <span className="text-rose-500">*</span> : <span className="text-gray-400 normal-case font-normal">(optional)</span>}
                            </Label>
                            <Input
                                value={createForm.program_track}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, program_track: e.target.value }))}
                                placeholder="e.g. Professional Education"
                                className="h-8 rounded-md border-gray-200 text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                    Year Level {createForm.role === 'REVIEWER' ? <span className="text-rose-500">*</span> : <span className="text-gray-400 normal-case font-normal">(optional)</span>}
                                </Label>
                                <Input
                                    value={createForm.yearLevel}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, yearLevel: e.target.value }))}
                                    placeholder="e.g. 4th Year"
                                    className="h-8 rounded-md border-gray-200 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                    Section {createForm.role === 'REVIEWER' ? <span className="text-rose-500">*</span> : <span className="text-gray-400 normal-case font-normal">(optional)</span>}
                                </Label>
                                <Input
                                    value={createForm.section}
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, section: e.target.value }))}
                                    placeholder="e.g. A"
                                    className="h-8 rounded-md border-gray-200 text-xs"
                                />
                            </div>
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
                            {creating ? 'Creating...' : 'Create User'}
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
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Joined</p>
                                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{formatDate(selectedUser.dateJoined)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md rounded-lg font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" /> Edit User
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            Update role and access status for {selectedUser?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Name</Label>
                                <Input value={selectedUser.name} disabled className="h-8 rounded-md border-gray-200 bg-gray-50 text-xs" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Email</Label>
                                <Input value={selectedUser.email} disabled className="h-8 rounded-md border-gray-200 bg-gray-50 text-xs" />
                            </div>

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
