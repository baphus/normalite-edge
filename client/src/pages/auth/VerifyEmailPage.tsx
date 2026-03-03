import React from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';

type VerifyState = 'loading' | 'success' | 'error';

const VerifyEmailPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [state, setState] = React.useState<VerifyState>('loading');
    const [message, setMessage] = React.useState('Verifying your email...');

    React.useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setState('error');
            setMessage('Missing verification token.');
            return;
        }

        api.post('/auth/verify-email', { token })
            .then(() => {
                setState('success');
                setMessage('Email verified successfully. You can now log in.');
            })
            .catch((error) => {
                setState('error');
                setMessage(error?.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
            });
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-lexend bg-background">
            <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-xl p-8 text-center space-y-4">
                <button onClick={() => navigate('/')} className="inline-flex items-center justify-center">
                    <img src="/NormaliteEdgeLogo.png" alt="Normalite EDGE" className="h-14 w-14 object-contain" />
                </button>
                <div className="flex justify-center">
                    {state === 'loading' && <LoaderCircle className="animate-spin text-primary" size={42} />}
                    {state === 'success' && <CheckCircle2 className="text-green-600" size={42} />}
                    {state === 'error' && <CircleAlert className="text-red-600" size={42} />}
                </div>

                <h1 className="text-2xl font-bold text-gray-900">Email Verification</h1>
                <p className="text-sm text-gray-600">{message}</p>

                <div className="pt-2">
                    <Link to="/login">
                        <Button className="w-full">Go to Login</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
