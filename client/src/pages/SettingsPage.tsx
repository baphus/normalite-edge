import React from 'react';
import {
    User,
    Bell,
    Lock,
    Globe,
    Shield,
    Mail,
    Smartphone,
    Save,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const userInitials = (user?.name || 'User')
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2);

    const activeSessions: Array<{ device: string; location: string; time: string; icon: React.ReactNode; isCurrent?: boolean }> = [];

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Settings</h1>
                <p className="text-gray-500 font-medium tracking-tight">Manage your account preferences and system configurations.</p>
            </header>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="bg-gray-50/50 p-1.5 rounded-2xl mb-8 flex w-fit overflow-x-auto">
                    <TabsTrigger value="profile" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <User size={14} className="mr-2" /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <Bell size={14} className="mr-2" /> Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <Shield size={14} className="mr-2" /> Security
                    </TabsTrigger>
                    <TabsTrigger value="system" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <Globe size={14} className="mr-2" /> System
                    </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6 animate-in fade-in-50 duration-500">
                    <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black">Personal Information</CardTitle>
                            <CardDescription className="font-medium italic">Update your personal details and how others see you.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary text-3xl font-black ring-4 ring-white shadow-lg">
                                        {userInitials}
                                    </div>
                                    <button className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-md border border-gray-100 text-gray-400 group-hover:text-primary transition-colors">
                                        <Smartphone size={16} />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-gray-900 uppercase tracking-tight">{user?.name || 'User'}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        {user?.role || 'Role'}{user?.program ? ` • ${user.program}` : ''}{user?.major ? ` ${user.major}` : ''}
                                    </p>
                                    <Button variant="link" className="p-0 h-auto text-primary text-xs font-black uppercase tracking-widest">Change Photo</Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</Label>
                                    <Input defaultValue={user?.name || ''} className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        <Input defaultValue={user?.email || ''} className="pl-12 h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</Label>
                                    <Input placeholder="+63 9XX XXX XXXX" className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Language</Label>
                                    <select className="flex h-12 w-full items-center justify-between rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20">
                                        <option>English (US)</option>
                                        <option>Filipino</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" className="h-12 rounded-2xl px-8 font-black border-gray-100">Cancel</Button>
                        <Button className="h-12 rounded-2xl px-8 bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 gap-2">
                            <Save size={18} /> Save Profile
                        </Button>
                    </div>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="space-y-6 animate-in fade-in-50 duration-500">
                    <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black">Notification Preferences</CardTitle>
                            <CardDescription className="font-medium italic">Choose how and when you want to be notified.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between group">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors">Exam Reminders</Label>
                                        <p className="text-xs text-gray-500 font-medium">Receive notifications for upcoming mock exams and deadlines.</p>
                                    </div>
                                    <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                                </div>
                                <div className="flex items-center justify-between group pt-6 border-t border-gray-50">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors">Performance Reports</Label>
                                        <p className="text-xs text-gray-500 font-medium">Weekly summary of your study progress and exam scores.</p>
                                    </div>
                                    <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                                </div>
                                <div className="flex items-center justify-between group pt-6 border-t border-gray-50">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors">Daily Challenges</Label>
                                        <p className="text-xs text-gray-500 font-medium">New flashcards and practice questions available every day.</p>
                                    </div>
                                    <Switch className="data-[state=checked]:bg-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-6 animate-in fade-in-50 duration-500">
                    <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black">Account Security</CardTitle>
                            <CardDescription className="font-medium italic">Manage your password and security settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                            <Input type="password" placeholder="••••••••" className="pl-12 h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">New Password</Label>
                                        <Input type="password" placeholder="••••••••" className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Confirm New Password</Label>
                                        <Input type="password" placeholder="••••••••" className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20" />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button className="h-11 rounded-2xl px-8 bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-[10px]">
                                        Update Password
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white">
                        <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-xl font-black">Active Sessions</CardTitle>
                                <CardDescription className="font-medium italic">Logout from other devices where you are signed in.</CardDescription>
                            </div>
                            <Badge className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">{activeSessions.length} Active</Badge>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="space-y-4">
                                {activeSessions.map((session, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 bg-gray-50/30 group hover:border-primary/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.isCurrent ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                                {session.icon}
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-gray-900">{session.device}</p>
                                                    {session.isCurrent && <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[8px] uppercase tracking-widest px-1.5 py-0">Current</Badge>}
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{session.location} • {session.time}</p>
                                            </div>
                                        </div>
                                        {!session.isCurrent && (
                                            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                <Trash2 size={18} />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {activeSessions.length === 0 && (
                                    <div className="p-4 rounded-2xl border border-dashed border-gray-200 text-sm text-gray-500 font-medium text-center">
                                        No additional active sessions found.
                                    </div>
                                )}
                            </div>
                            <Button variant="outline" className="w-full h-12 rounded-2xl border-gray-100 font-black uppercase tracking-widest text-[10px] text-gray-500 hover:text-primary hover:bg-primary/5 transition-all">
                                Logout from all other devices
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-red-50 shadow-xl shadow-red-200/5 overflow-hidden bg-red-50/10 border-2">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black text-red-600">Danger Zone</CardTitle>
                            <CardDescription className="font-medium italic text-red-400">Actions here are permanent and cannot be undone.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="space-y-0.5 text-center md:text-left">
                                <p className="text-sm font-black text-gray-900">Delete Account</p>
                                <p className="text-xs text-gray-500 font-medium">Once you delete your account, all your data will be permanently removed.</p>
                            </div>
                            <Button variant="ghost" className="h-11 rounded-1.5xl text-red-600 hover:bg-red-600 hover:text-white font-black uppercase tracking-widest text-[10px] gap-2 border border-red-100">
                                <Trash2 size={16} /> Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* System Tab Placeholder */}
                <TabsContent value="system" className="space-y-6 animate-in fade-in-50 duration-500">
                    <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white">
                        <CardContent className="p-20 text-center">
                            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Globe size={40} className="text-gray-200" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">System Settings</h3>
                            <p className="text-sm text-gray-400 font-medium italic mt-2">Server configuration and global application preferences.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SettingsPage;
