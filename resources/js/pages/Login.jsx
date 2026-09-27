import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        console.log('Login attempt:', { email, password });

        try {
            const data = await login(email, password);
            console.log('Login success:', data);
            // Redirect based on user role
            const userData = data?.user || user;
            console.log('User data:', userData);
            const isAdmin = userData?.role === 'admin' || userData?.is_admin === true;
            console.log('Is admin:', isAdmin);
            if (isAdmin) {
                navigate('/admin/dashboard');
            } else {
                navigate('/dashboard/overview');
            }
        } catch (err) {
            console.error('Login error:', err);
            console.error('Response:', err.response);
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-modal auth-modal--login">
                    <div className="auth-modal__header auth-modal__header--login">
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
                        {error && <div className="alert alert-danger">{error}</div>}
                        
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div className="form-group">
                                <div className="auth-label-row">
                                    <label htmlFor="password">Password</label>
                                    <Link to="/forgot-password" className="auth-link-muted">
                                        Forgot password?
                                    </Link>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password"
                                />
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
        </div>
    );
}
