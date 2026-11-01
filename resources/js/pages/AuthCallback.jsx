import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageSkeleton from '../components/Skeleton';

export default function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { loginWithToken, user } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Check for error from backend first
                const errorParam = searchParams.get('error');
                
                if (errorParam) {
                    const errorMessages = {
                        'google_auth_failed': 'Google authentication could not be completed. Please check the server OAuth configuration and try again.',
                        'google_not_configured': 'Google sign-in is not configured. The site administrator needs to add valid Google OAuth credentials.',
                        'invalid_state': 'Invalid authentication state. Please try again.',
                        'access_denied': 'Access was denied. Please try again.'
                    };
                    let message = errorMessages[errorParam] || `Authentication error: ${errorParam}`;
                    setError(message);
                    return;
                }

                // The backend returns short-lived auth data in the URL fragment so
                // the token is not sent in HTTP referrers or server access logs.
                const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
                const token = hashParams.get('token')
                    || hashParams.get('access_token')
                    || searchParams.get('token');
                
                if (!token) {
                    setError('No authentication token received. Please try again.');
                    setTimeout(() => navigate('/login'), 2000);
                    return;
                }

                window.history.replaceState({}, document.title, window.location.pathname);

                // Store the token
                localStorage.setItem('auth_token', token);
                
                // Get user info to determine dashboard route
                try {
                    const result = await loginWithToken(token);
                    const isAdmin = result?.user?.role === 'admin' || result?.user?.is_admin === true || user?.role === 'admin';
                    
                    // Redirect admins to admin panel, customers to dashboard.
                    window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard';
                } catch (authErr) {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('auth_user');
                    setError('Google sign-in could not be confirmed. Please try again.');
                }
            } catch (err) {
                setError('Authentication failed. Please try again.');
                setTimeout(() => navigate('/login'), 2000);
            }
        };

        handleCallback();
    }, [searchParams, navigate, loginWithToken, user]);

    if (error) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-modal" style={{ maxWidth: '400px' }}>
                        <div className="auth-modal__body" style={{ padding: '40px 20px', textAlign: 'center' }}>
                            <div className="alert alert-danger" style={{ marginBottom: '20px', whiteSpace: 'pre-wrap', textAlign: 'left', fontSize: '14px' }}>
                                {error}
                            </div>
                            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                                Redirecting to login...
                            </p>
                            <button 
                                onClick={() => navigate('/login')}
                                style={{
                                    padding: '10px 20px',
                                    background: '#ff1c1c',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <PageSkeleton variant="route" label="Completing sign-in" />;
}
