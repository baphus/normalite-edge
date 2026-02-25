import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShieldCheck, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const PendingApprovalPage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleRefresh = () => {
        // Reload the page to trigger the AuthContext check for updated status
        window.location.reload();
    };

    if (user?.status === 'APPROVED') {
        navigate('/dashboard');
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative font-lexend overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 z-10"></div>
                <div
                    className="w-full h-full bg-cover bg-center blur-sm opacity-20"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuArzNvjpM81ghaYuiyQxM5qpbcgLPEq0jo8N-mkUsqhp24cgYqCleIywecsORTOG8yNrwi5WSxuvAcxTBUXSdXI-qwtnNBKZ6jXC2cPxHRnfGhWX9Ek1iZFqkUkixfJAOK6Cbd2300a9h0fgWx4Vm41iEKXkdk5InX7ez7OOmacb2mWhSSfIzcHggdwKPpuwdkhar-Pnt5HRb_NuLsQ6sy2ESZ51mk7upMt0FcDZCtLjECee98BD7_ALEkLTSLB-kY4Qc_TFKZ5gsny')" }}
                />
            </div>

            <div className="relative z-10 w-full max-w-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-50 text-yellow-500 mb-2 animate-pulse">
                    <Clock size={48} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                        Registration Pending
                    </h1>
                    <p className="text-gray-500">
                        Thank you for joining Normalite EDGE, <span className="font-semibold text-primary">{user?.name}</span>.
                    </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-left flex gap-4">
                    <div className="text-blue-500 mt-1">
                        <ShieldCheck size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-semibold text-blue-900 text-sm">Waiting for Administrator Approval</h3>
                        <p className="text-blue-700 text-xs leading-relaxed">
                            To maintain the integrity of our LET preparation platform, all new accounts must be manually verified by our administration team.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <p className="text-sm text-gray-400">
                        We'll notify you via your school email (<span className="text-gray-600 italic">{user?.email}</span>) once your account is ready.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            className="flex gap-2 py-6 border-gray-200 hover:bg-gray-50 text-gray-600"
                        >
                            <RefreshCw size={18} />
                            Check Status
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={logout}
                            className="flex gap-2 py-6 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-500 opacity-80 z-10">
                © 2024 Normalite EDGE. Cebu Normal University.
            </div>
        </div>
    );
};

export default PendingApprovalPage;
