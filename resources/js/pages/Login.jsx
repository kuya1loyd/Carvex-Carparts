import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EmailVerificationModal from '../components/EmailVerificationModal';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('verified') === '1' ? 'Email verified successfully! You can now sign in.' : '';
    });
    const [loading, setLoading] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [debugVerificationUrl, setDebugVerificationUrl] = useState('');
    const { login, user } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login(email, password);
            const userData = data?.user || user;
            const role = String(userData?.role || '').toLowerCase();
            const isAdmin = role === 'admin' || userData?.is_admin === true;
            if (isAdmin) {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            console.error('Login error:', err);
            const resData = err.response?.data;
            const msg = resData?.message || '';
            const isVerificationNeeded =
                resData?.requires_email_verification === true ||
                msg.toLowerCase().includes('verify your email') ||
                msg.toLowerCase().includes('email is not verified');

            if (isVerificationNeeded) {
                if (resData?.debug_verification_url) {
                    setDebugVerificationUrl(resData.debug_verification_url);
                }
                setShowVerificationModal(true);
            } else {
                setError(msg || 'Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-modal auth-modal--login">
                    <div className="auth-modal__header">
                        <button
                            type="button"
                            className="auth-modal__close"
                            aria-label="Close"
                            onClick={() => navigate('/')}
                        >
                            ×
                        </button>
                        <h1>Welcome Back</h1>
                        <p className="auth-modal__subtitle">Sign in to your CarVex account</p>
                    </div>

                    <div className="auth-modal__body">
                        {successMessage && (
                            <div className="alert alert-success" role="alert" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '0.9rem' }}>
                                {successMessage}
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="auth-form" noValidate>
                            <div className="form-group">
                                <label htmlFor="login-email">Email Address</label>
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <div className="auth-label-row">
                                    <label htmlFor="login-password">Password</label>
                                    <Link to="/forgot-password" className="auth-link-muted">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="auth-password-input-wrap">
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        autoComplete="current-password"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className="auth-eye-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="btn btn-primary btn-block" 
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <p>Don't have an account? <Link to="/register" className="auth-link">Sign up</Link></p>
                        </div>
                    </div>
                </div>
            </div>

            <EmailVerificationModal
                isOpen={showVerificationModal}
                onClose={() => setShowVerificationModal(false)}
                email={email}
                password={password}
                debugVerificationUrl={debugVerificationUrl}
                onVerified={() => handleSubmit()}
            />
        </div>
    );
}
