import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { IconSpinner } from '../components/UI';
import { authService } from '../services/authService';

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token no proporcionado.');
            return;
        }

        authService.verifyEmail(token)
            .then(() => {
                setStatus('success');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err.response?.data?.error || 'Error al verificar el email.');
            });
    }, [token, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 px-6">
            <div className="max-w-md w-full rounded-2xl bg-zinc-900/50 p-8 text-center ring-1 ring-zinc-800">
                {status === 'verifying' && (
                    <div className="flex flex-col items-center gap-4">
                        <IconSpinner className="h-8 w-8 text-emerald-500" />
                        <h2 className="text-xl font-semibold">Verificando correo...</h2>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-emerald-400">¡Correo verificado!</h2>
                        <p className="text-zinc-400">Tu cuenta ha sido activada. Redirigiendo al login...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-red-400">Error de verificación</h2>
                        <p className="text-zinc-400">{message}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-zinc-700"
                        >
                            Volver al inicio
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
