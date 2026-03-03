import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email').refine(
        (email) => email.toLowerCase().endsWith('@cnu.edu.ph'),
        { message: 'Only @cnu.edu.ph emails are allowed' }
    ),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [submitted, setSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = () => {
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen font-lexend flex flex-col relative overflow-hidden bg-[#f8f5f5]">
            {/* Background Decorations */}
            <div className="absolute inset-0 z-0 w-full h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 z-10"></div>
                <div
                    className="w-full h-full bg-cover bg-center opacity-40 blur-sm"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuArzNvjpM81ghaYuiyQxM5qpbcgLPEq0jo8N-mkUsqhp24cgYqCleIywecsORTOG8yNrwi5WSxuvAcxTBUXSdXI-qwtnNBKZ6jXC2cPxHRnfGhWX9Ek1iZFqkUkixfJAOK6Cbd2300a9h0fgWx4Vm41iEKXkdk5InX7ez7OOmacb2mWhSSfIzcHggdwKPpuwdkhar-Pnt5HRb_NuLsQ6sy2ESZ51mk7upMt0FcDZCtLjECee98BD7_ALEkLTSLB-kY4Qc_TFKZ5gsny')" }}
                ></div>
            </div>

            <div className="relative z-20 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-[520px] bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden flex flex-col">
                    <div className="pt-10 px-8 pb-4 text-center">
                        <button onClick={() => navigate('/')} className="inline-flex items-center justify-center mb-6">
                            <img src="/NormaliteEdgeLogo.png" alt="Normalite EDGE" className="h-16 w-16 object-contain" />
                        </button>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Reset your password</h1>
                        <p className="text-gray-500 font-medium text-sm md:text-base px-4">
                            Enter your school email to receive reset instructions.
                        </p>
                    </div>

                    <form className="p-8 pt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">School Email</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                    <Mail size={20} />
                                </div>
                                <Input
                                    className="w-full pl-12 pr-4 h-14 rounded-2xl border-gray-100 bg-gray-50/50 shadow-none focus:ring-primary/20 font-bold"
                                    placeholder="juan@cnu.edu.ph"
                                    type="email"
                                    {...register('email')}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>

                        {submitted && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 font-medium">
                                Password reset is not available yet in the current backend. Please contact an administrator for account recovery.
                            </div>
                        )}

                        <div className="pt-2">
                            <Button type="submit" className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 gap-2 text-base transition-transform active:scale-[0.99]">
                                <span>Send Reset Link</span>
                                <Send size={20} />
                            </Button>
                        </div>
                    </form>

                    <div className="bg-gray-50/50 py-6 text-center border-t border-gray-50">
                        <p className="text-sm font-medium text-gray-500">
                            Remembered your password?{' '}
                            <Link to="/login" className="font-black text-primary hover:underline transition-colors flex items-center justify-center gap-1 mt-1">
                                <ArrowLeft size={14} /> Back to Login
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-6 text-center w-full z-20 pointer-events-none">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">© 2024 Normalite EDGE. Cebu Normal University.</p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
