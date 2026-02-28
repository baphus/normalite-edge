import React, { useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Edit,
    MoreVertical,
    Search,
    Shield,
    Trash2,
    UserCog,
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
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/axios';

type UserRole = 'ADMIN' | 'REVIEWER' | 'REVIEWEE';
type UiStatus = 'active' | 'pending' | 'inactive';

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
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    program?: string | null;
    major?: string | null;
    yearLevel?: string | null;
    section?: string | null;
    createdAt: string;
}

const statusFromApi = (status: UserApiItem['status']): UiStatus => {
    if (status === 'APPROVED') return 'active';
    if (status === 'REJECTED') return 'inactive';
    return 'pending';
};

const statusToApi = (status: UiStatus): UserApiItem['status'] => {
    if (status === 'active') return 'APPROVED';
    if (status === 'inactive') return 'REJECTED';
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
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editRole, setEditRole] = useState<UserRole>('REVIEWEE');
    const [editStatus, setEditStatus] = useState<UiStatus>('pending');

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

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setEditRole(user.role);
        setEditStatus(user.status);
        setIsEditModalOpen(true);
    };

    const handleStatusChange = async (user: User, newStatus: UiStatus) => {
        try {
            setMutatingId(user.id);
            await api.patch(`/users/${user.id}/status`, { status: statusToApi(newStatus) });
            await fetchUsers();
        } catch (error: any) {
            window.alert(error?.response?.data?.message || 'Failed to update status');
        } finally {
            setMutatingId(null);
        }
    };

    const handleDelete = async (user: User) => {
        const shouldDelete = window.confirm(`Delete ${user.name}? This action cannot be undone.`);
        if (!shouldDelete) return;

        try {
            setMutatingId(user.id);
            await api.delete(`/users/${user.id}`);
            if (users.length === 1 && page > 1) {
                setPage((prev) => prev - 1);
            } else {
                await fetchUsers();
            }
        } catch (error: any) {
            window.alert(error?.response?.data?.message || 'Failed to delete user');
        } finally {
            setMutatingId(null);
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
        } catch (error: any) {
            window.alert(error?.response?.data?.message || 'Failed to update user');
        } finally {
            setMutatingId(null);
        }
    };

    const summary = useMemo(() => {
        const active = users.filter((u) => u.status === 'active').length;
        const pending = users.filter((u) => u.status === 'pending').length;
        const inactive = users.filter((u) => u.status === 'inactive').length;
        return { active, pending, inactive };
    }, [users]);

    const totalPages = Math.max(1, Math.ceil(totalUsers / limit));
    const fromCount = totalUsers === 0 ? 0 : (page - 1) * limit + 1;
    const toCount = Math.min(page * limit, totalUsers);

    return (
        <div className="flex flex-col gap-5 font-lexend pb-10">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-sm text-gray-500 font-medium">Compact view of accounts, roles, profile info, and access status.</p>
                </div>
            </header>

            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border-gray-100 rounded-2xl shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total</p>
                            <p className="text-2xl font-black text-gray-900">{totalUsers}</p>
                        </div>
                        <UserCog className="w-5 h-5 text-primary" />
                    </CardContent>
                </Card>
                <Card className="border-gray-100 rounded-2xl shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active</p>
                            <p className="text-2xl font-black text-green-700">{summary.active}</p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-green-700" />
                    </CardContent>
                </Card>
                <Card className="border-gray-100 rounded-2xl shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending</p>
                            <p className="text-2xl font-black text-amber-700">{summary.pending}</p>
                        </div>
                        <Clock className="w-5 h-5 text-amber-700" />
                    </CardContent>
                </Card>
                <Card className="border-gray-100 rounded-2xl shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inactive</p>
                            <p className="text-2xl font-black text-rose-700">{summary.inactive}</p>
                        </div>
                        <UserX className="w-5 h-5 text-rose-700" />
                    </CardContent>
                </Card>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-3 md:p-4 shadow-sm space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name, email, or program"
                            className="h-10 pl-9 rounded-xl border-gray-200"
                        />
                    </div>

                    <Select
                        value={roleFilter}
                        onValueChange={(value) => {
                            setPage(1);
                            setRoleFilter(value as 'ALL' | UserRole);
                        }}
                    >
                        <SelectTrigger className="h-10 w-full md:w-42.5 rounded-xl border-gray-200 bg-white font-semibold">
                            <SelectValue placeholder="Filter role" />
                        </SelectTrigger>
                        <SelectContent className="font-lexend">
                            <SelectItem value="ALL">All Roles</SelectItem>
                            <SelectItem value="REVIEWEE">Reviewee</SelectItem>
                            <SelectItem value="REVIEWER">Reviewer</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                            setPage(1);
                            setStatusFilter(value as 'ALL' | UiStatus);
                        }}
                    >
                        <SelectTrigger className="h-10 w-full md:w-42.5 rounded-xl border-gray-200 bg-white font-semibold">
                            <SelectValue placeholder="Filter status" />
                        </SelectTrigger>
                        <SelectContent className="font-lexend">
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {errorMessage && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                        {errorMessage}
                    </div>
                )}

                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                <TableRow className="border-gray-100">
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">User</TableHead>
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Academic</TableHead>
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Role</TableHead>
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</TableHead>
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Joined</TableHead>
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="px-4 py-9 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                            Loading users...
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="px-4 py-9 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id} className="border-gray-100 hover:bg-gray-50/70 align-top">
                                            <TableCell className="px-4 py-3 min-w-60">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
                                                        {user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">ID: {user.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 min-w-52.5">
                                                <p className="text-sm font-semibold text-gray-800 leading-tight">{user.program}</p>
                                                <p className="text-xs text-gray-500 leading-tight mt-1">{user.major}</p>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1">{user.yearSection}</p>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <Badge variant="outline" className={`text-[10px] uppercase tracking-widest font-black border ${roleBadgeClass[user.role]}`}>
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <Badge variant="outline" className={`text-[10px] uppercase tracking-widest font-black border ${statusBadgeClass[user.status]}`}>
                                                    {user.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-xs font-semibold text-gray-600">
                                                {new Date(user.dateJoined).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled={mutatingId === user.id}>
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="font-lexend min-w-44">
                                                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-gray-500">Quick actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleEdit(user)} className="font-semibold gap-2">
                                                            <Edit className="w-4 h-4" /> Edit user
                                                        </DropdownMenuItem>
                                                        {user.status !== 'active' ? (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(user, 'active')} className="font-semibold gap-2">
                                                                <CheckCircle2 className="w-4 h-4" /> Activate
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(user, 'inactive')} className="font-semibold gap-2">
                                                                <UserX className="w-4 h-4" /> Deactivate
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(user)}
                                                            className="font-semibold gap-2 text-rose-700 focus:text-rose-700 focus:bg-rose-50"
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

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" /> Edit User
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            Update role and access status for {selectedUser?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Name</Label>
                                <Input value={selectedUser.name} disabled className="h-10 rounded-xl border-gray-200 bg-gray-50" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Email</Label>
                                <Input value={selectedUser.email} disabled className="h-10 rounded-xl border-gray-200 bg-gray-50" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Role</Label>
                                    <Select value={editRole} onValueChange={(value) => setEditRole(value as UserRole)}>
                                        <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-white font-semibold">
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
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Status</Label>
                                    <Select value={editStatus} onValueChange={(value) => setEditStatus(value as UiStatus)}>
                                        <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-white font-semibold">
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
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl border-gray-200">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={!!mutatingId} className="rounded-xl bg-primary hover:bg-primary/95 text-white">
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserManagementPage;
