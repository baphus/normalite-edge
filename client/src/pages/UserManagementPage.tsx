import React, { useState } from 'react';
import {
    Search,
    Download,
    UserPlus,
    Users,
    CheckCircle2,
    Clock,
    UserX,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
    id: string;
    name: string;
    email: string;
    program: string;
    major: string;
    yearSection: string;
    role: 'ADMIN' | 'REVIEWER' | 'REVIEWEE';
    status: 'active' | 'pending' | 'inactive';
    dateJoined: string;
}

const UserManagementPage: React.FC = () => {
    const [users] = useState<User[]>([
        {
            id: '1',
            name: 'Juan Q. Dela Cruz',
            email: 'juan.delacruz@cnu.edu.ph',
            program: 'BSEd',
            major: 'English',
            yearSection: '4 - A',
            role: 'REVIEWEE',
            status: 'active',
            dateJoined: '2023-10-26'
        },
        {
            id: '2',
            name: 'Maria C. Santos',
            email: 'maria.santos@cnu.edu.ph',
            program: 'BEEd',
            major: 'N/A',
            yearSection: '4 - B',
            role: 'REVIEWER',
            status: 'pending',
            dateJoined: '2023-10-25'
        },
        {
            id: '3',
            name: 'Pedro A. Penduko',
            email: 'pedro.penduko@cnu.edu.ph',
            program: 'BSEd',
            major: 'Mathematics',
            yearSection: '3 - A',
            role: 'REVIEWEE',
            status: 'active',
            dateJoined: '2023-10-25'
        }
    ]);

    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleExport = () => {
        console.log("Exporting users...");
        alert("User data exported successfully!");
    };

    const handleResetPassword = (user: User) => {
        alert(`Password reset link sent to ${user.email}`);
    };

    const handleStatusChange = (user: User, newStatus: 'active' | 'inactive') => {
        alert(`User ${user.name} is now ${newStatus}`);
    };

    const stats = [
        { label: 'Total Users', value: '156', icon: <Users size={24} className="text-blue-600" />, color: 'bg-blue-50' },
        { label: 'Active', value: '142', icon: <CheckCircle2 size={24} className="text-green-600" />, color: 'bg-green-50' },
        { label: 'Pending', value: '8', icon: <Clock size={24} className="text-amber-600" />, color: 'bg-amber-50' },
        { label: 'Inactive', value: '6', icon: <UserX size={24} className="text-red-600" />, color: 'bg-red-50' },
    ];

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-gray-500 font-medium tracking-tight">Manage student accounts, faculty access, and system permissions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleExport} className="h-11 rounded-xl border-gray-200 font-bold gap-2">
                        <Download size={18} /> Export
                    </Button>
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-11 rounded-xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 gap-2">
                                <UserPlus size={18} /> Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-[2rem] border-none font-lexend p-8">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-gray-900">Add New User</DialogTitle>
                                <DialogDescription className="font-medium text-gray-500">
                                    Create a new account for a student or faculty member.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-6 font-lexend">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Full Name</Label>
                                    <Input placeholder="Juan Dela Cruz" className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 shadow-none focus:ring-primary/20 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">School Email</Label>
                                    <Input placeholder="juan@cnu.edu.ph" type="email" className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 shadow-none focus:ring-primary/20 font-bold" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Role</Label>
                                        <Select>
                                            <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-gray-100 shadow-xl font-lexend">
                                                <SelectItem value="REVIEWEE" className="font-bold">Reviewee</SelectItem>
                                                <SelectItem value="REVIEWER" className="font-bold">Reviewer</SelectItem>
                                                <SelectItem value="ADMIN" className="font-bold">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Program</Label>
                                        <Select>
                                            <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                                                <SelectValue placeholder="Program" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-gray-100 shadow-xl font-lexend">
                                                <SelectItem value="BSEd" className="font-bold">BSEd</SelectItem>
                                                <SelectItem value="BEEd" className="font-bold">BEEd</SelectItem>
                                                <SelectItem value="BSN" className="font-bold">BSN</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</Button>
                                <Button onClick={() => { setIsAddModalOpen(false); alert('User created successfully!'); }} className="rounded-2xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 h-12 px-8 uppercase tracking-widest text-[10px]">Create Account</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-gray-100 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className={`${stat.color} p-4 rounded-2xl`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters Section */}
            <section className="space-y-6">
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                        <Input
                            placeholder="Search by name, email, or program..."
                            className="pl-12 h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all shadow-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pb-2 md:pb-0">
                        <select className="h-12 px-4 rounded-2xl border-gray-100 bg-gray-50/50 text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20">
                            <option>All Roles</option>
                            <option>Reviewee</option>
                            <option>Reviewer</option>
                            <option>Admin</option>
                        </select>
                        <select className="h-12 px-4 rounded-2xl border-gray-100 bg-gray-50/50 text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20">
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Pending</option>
                            <option>Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
                    <div className="overflow-x-auto overflow-y-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow className="hover:bg-transparent border-gray-50">
                                    <TableHead className="w-[50px] px-6">
                                        <Checkbox className="rounded-md border-gray-300" />
                                    </TableHead>
                                    <TableHead className="px-6 font-black text-[10px] uppercase tracking-widest text-gray-400">User</TableHead>
                                    <TableHead className="px-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Program & Major</TableHead>
                                    <TableHead className="px-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Year / Sec</TableHead>
                                    <TableHead className="px-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Role</TableHead>
                                    <TableHead className="px-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Status</TableHead>
                                    <TableHead className="px-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Joined</TableHead>
                                    <TableHead className="px-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors border-gray-50 group">
                                        <TableCell className="px-6">
                                            <Checkbox className="rounded-md border-gray-300" />
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-900 group-hover:text-primary transition-colors truncate">{user.name}</p>
                                                    <p className="text-xs text-gray-400 font-medium truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6">
                                            <p className="text-sm font-bold text-gray-700">{user.program}</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{user.major}</p>
                                        </TableCell>
                                        <TableCell className="px-6 text-sm font-bold text-gray-500">
                                            {user.yearSection}
                                        </TableCell>
                                        <TableCell className="px-6">
                                            <Badge variant="outline" className={`font-black text-[10px] uppercase tracking-widest border-2 ${user.role === 'ADMIN' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                user.role === 'REVIEWER' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                    'bg-primary/5 text-primary border-primary/10'
                                                }`}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6">
                                            <Badge className={`font-black text-[10px] uppercase tracking-widest border-none ${user.status === 'active' ? 'bg-green-50 text-green-600' :
                                                user.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                                    'bg-red-50 text-red-600'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.status === 'active' ? 'bg-green-600' :
                                                    user.status === 'pending' ? 'bg-amber-600' :
                                                        'bg-red-600'
                                                    }`} />
                                                {user.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6 text-xs font-bold text-gray-400 uppercase">
                                            {new Date(user.dateJoined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </TableCell>
                                        <TableCell className="px-6 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-gray-400 hover:text-primary hover:bg-primary/5">
                                                    <Eye size={18} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(user)}
                                                    className="h-9 w-9 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                >
                                                    <Edit size={18} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50">
                                                    <Trash2 size={18} />
                                                </Button>
                                            </div>
                                            <div className="group-hover:hidden">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-gray-400">
                                                            <MoreVertical size={18} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-xl font-lexend p-2 min-w-[180px]">
                                                        <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-widest text-gray-400 px-3 py-2">Quick Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator className="bg-gray-50" />
                                                        <DropdownMenuItem onClick={() => handleEdit(user)} className="rounded-xl font-bold text-sm py-2 px-3 gap-2">
                                                            <Edit size={16} className="text-blue-500" /> Edit User
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleResetPassword(user)} className="rounded-xl font-bold text-sm py-2 px-3 gap-2">
                                                            <Clock size={16} className="text-amber-500" /> Reset Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleStatusChange(user, user.status === 'active' ? 'inactive' : 'active')}
                                                            className="rounded-xl font-bold text-sm py-2 px-3 gap-2"
                                                        >
                                                            {user.status === 'active' ? (
                                                                <>
                                                                    <UserX size={16} className="text-red-500" /> Deactivate
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 size={16} className="text-green-500" /> Activate
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-gray-50" />
                                                        <DropdownMenuItem className="rounded-xl font-bold text-sm py-2 px-3 gap-2 text-red-600 focus:text-red-600 focus:bg-red-50">
                                                            <Trash2 size={16} /> Delete Account
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Footer / Pagination */}
                    <div className="px-6 py-6 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Showing <span className="text-gray-900">1-12</span> of <span className="text-gray-900">156</span> users
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" disabled className="h-10 w-10 rounded-xl border-gray-100">
                                <ChevronLeft size={18} />
                            </Button>
                            <Button className="h-10 w-10 rounded-xl bg-primary text-white font-black border-none">1</Button>
                            <Button variant="ghost" className="h-10 w-10 rounded-xl font-bold text-gray-500">2</Button>
                            <Button variant="ghost" className="h-10 w-10 rounded-xl font-bold text-gray-500">3</Button>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-gray-100">
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Edit User Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] border-none font-lexend p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-gray-900">Edit User Profile</DialogTitle>
                        <DialogDescription className="font-medium text-gray-500">
                            Update information for {selectedUser?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="grid gap-6 py-6 font-lexend">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Full Name</Label>
                                <Input defaultValue={selectedUser.name} className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 shadow-none focus:ring-primary/20 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">School Email</Label>
                                <Input defaultValue={selectedUser.email} type="email" className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 shadow-none focus:ring-primary/20 font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Role</Label>
                                    <Select defaultValue={selectedUser.role}>
                                        <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-gray-100 shadow-xl font-lexend">
                                            <SelectItem value="REVIEWEE" className="font-bold">Reviewee</SelectItem>
                                            <SelectItem value="REVIEWER" className="font-bold">Reviewer</SelectItem>
                                            <SelectItem value="ADMIN" className="font-bold">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Status</Label>
                                    <Select defaultValue={selectedUser.status}>
                                        <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-gray-100 shadow-xl font-lexend">
                                            <SelectItem value="active" className="font-bold">Active</SelectItem>
                                            <SelectItem value="pending" className="font-bold">Pending</SelectItem>
                                            <SelectItem value="inactive" className="font-bold">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</Button>
                        <Button onClick={() => { setIsEditModalOpen(false); alert('User profile updated successfully!'); }} className="rounded-2xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 h-12 px-8 uppercase tracking-widest text-[10px]">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserManagementPage;
