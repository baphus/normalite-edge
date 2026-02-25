import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, GraduationCap, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const registerSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    middleI: z.string().max(2).optional(),
    lastName: z.string().min(2, 'Last name is required'),
    suffix: z.string().optional(),
    yearLevel: z.string().min(1, 'Year level is required'),
    program: z.string().min(1, 'Program is required'),
    section: z.string().min(1, 'Section is required'),
    major: z.string().optional(),
    email: z.string().email('Invalid school email address').refine(
        (email) => email.toLowerCase().endsWith('@cnu.edu.ph'),
        { message: 'Only @cnu.edu.ph emails are allowed' }
    ),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const majorsByProgram: Record<string, string[]> = {
    "Bachelor of Secondary Education": [
        "Mathematics", "Science", "English", "Filipino", "Social Studies", "Values Education"
    ],
    "Bachelor of Technology and Livelihood Education": [
        "Home Economics"
    ],
};

const RegisterPage: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
    });

    const selectedProgram = watch('program');
    const availableMajors = React.useMemo(() =>
        selectedProgram ? (majorsByProgram[selectedProgram] || []) : [],
        [selectedProgram]
    );

    useEffect(() => {
        if (availableMajors.length === 0) {
            setValue('major', 'Not Applicable');
        } else {
            setValue('major', '');
        }
    }, [selectedProgram, availableMajors, setValue]);

    const onSubmit = async (data: RegisterFormValues) => {
        setLoading(true);
        setError(null);
        try {
            // Construct full name like prototype
            const fullName = `${data.firstName} ${data.middleI ? data.middleI + ' ' : ''}${data.lastName}${data.suffix ? ' ' + data.suffix : ''}`;

            await api.post('/auth/register', {
                name: fullName,
                email: data.email,
                password: data.password,
                program: data.program,
                major: data.major,
                yearLevel: data.yearLevel,
                section: data.section
            });

            navigate('/pending');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error && 'response' in err
                ? (err as { response: { data: { message: string } } }).response.data.message || err.message
                : err instanceof Error ? err.message : 'Registration failed. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative font-lexend overflow-y-auto pt-12 pb-12">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 z-10"></div>
                <div
                    className="w-full h-full bg-cover bg-center blur-sm opacity-20"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuArzNvjpM81ghaYuiyQxM5qpbcgLPEq0jo8N-mkUsqhp24cgYqCleIywecsORTOG8yNrwi5WSxuvAcxTBUXSdXI-qwtnNBKZ6jXC2cPxHRnfGhWX9Ek1iZFqkUkixfJAOK6Cbd2300a9h0fgWx4Vm41iEKXkdk5InX7ez7OOmacb2mWhSSfIzcHggdwKPpuwdkhar-Pnt5HRb_NuLsQ6sy2ESZ51mk7upMt0FcDZCtLjECee98BD7_ALEkLTSLB-kY4Qc_TFKZ5gsny')" }}
                />
            </div>

            <div className="relative z-10 w-full max-w-[580px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
                <div className="pt-8 px-8 pb-2 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 text-primary">
                        <GraduationCap size={36} />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-2">
                        Create your account
                    </h1>
                    <p className="text-gray-500 text-sm md:text-base">
                        Join Normalite EDGE for LET preparation.
                    </p>
                </div>

                {error && (
                    <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                        <ShieldCheck size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>First Name</Label>
                            <Input {...register('firstName')} placeholder="Juan" />
                            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Last Name</Label>
                            <Input {...register('lastName')} placeholder="Dela Cruz" />
                            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label>Year</Label>
                            <Input {...register('yearLevel')} placeholder="4" />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label>Program</Label>
                            <Select onValueChange={(value) => setValue('program', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select program" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Bachelor of Elementary Education">Elementary Education</SelectItem>
                                    <SelectItem value="Bachelor of Secondary Education">Secondary Education</SelectItem>
                                    <SelectItem value="Bachelor of Early Childhood Education">Early Childhood Education</SelectItem>
                                    <SelectItem value="Bachelor of Special Needs Education">Special Needs Education</SelectItem>
                                    <SelectItem value="Bachelor of Physical Education">Physical Education</SelectItem>
                                    <SelectItem value="Bachelor of Culture & Arts Education">Culture & Arts Education</SelectItem>
                                    <SelectItem value="Bachelor of Technology and Livelihood Education">BTLEd</SelectItem>
                                    <SelectItem value="Diploma in Professional Education">DPE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Section</Label>
                            <Input {...register('section')} placeholder="A" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Majorship</Label>
                            <Select
                                disabled={availableMajors.length === 0}
                                onValueChange={(value) => setValue('major', value)}
                                value={watch('major')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={availableMajors.length === 0 ? "N/A" : "Select major"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMajors.map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                    {availableMajors.length === 0 && <SelectItem value="Not Applicable">Not Applicable</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>School Email</Label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                <Mail size={18} />
                            </div>
                            <Input
                                type="email"
                                placeholder="juan@cnu.edu.ph"
                                className="pl-11"
                                {...register('email')}
                            />
                        </div>
                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Password</Label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                <Lock size={18} />
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-11"
                                {...register('password')}
                            />
                        </div>
                        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-6 text-base font-bold bg-primary hover:bg-primary/90 text-white flex gap-2 shadow-lg transition-transform active:scale-[0.99]"
                        >
                            {loading ? 'Creating account...' : 'Sign Up'}
                            {!loading && <ArrowRight size={20} />}
                        </Button>
                    </div>
                </form>

                <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-bold text-primary hover:underline transition-colors">
                            Login
                        </Link>
                    </p>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-500 opacity-80 z-10">
                © 2024 Normalite EDGE. Cebu Normal University.
            </div>
        </div>
    );
};

export default RegisterPage;
