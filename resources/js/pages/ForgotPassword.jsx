import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [resetLink, setResetLink] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await authService.forgotPassword({ email });
            const fallbackLink = response.data?.reset_link || '';

            if (fallbackLink) {
                setResetLink(fallbackLink);
                setSuccess('Email delivery failed. Use the reset link below for now.');
            } else {
                setSuccess('Password reset link has been sent to your email. Please check your inbox.');
            }

            setEmail('');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to send reset link. Please try again.';
            setError(errorMessage);
            console.error('Forgot password error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-modal">
                    <div className="auth-modal__header">
                        <p className="auth-modal__back-link">
                            <Link to="/" className="auth-link">Back to Home</Link>
                        </p>
                        <h1>Reset Password</h1>
                        <p className="auth-modal__subtitle">Enter your email to receive a reset link</p>
                    </div>
                    <div className="auth-modal__body">
                        {error && <div className="alert alert-danger">{error}</div>}
                        {success && <div className="alert alert-success">{success}</div>}
                        {resetLink && (
                            <div className="alert alert-info" style={{textAlign: 'center', padding: '18px 10px', borderRadius: 8, marginBottom: 18}}>
                                <a
                                    href={resetLink}
                                    style={{
                                        display: 'inline-block',
                                        background: '#0ea5e9',
                                        color: '#fff',
                                        padding: '10px 22px',
                                        borderRadius: 6,
                                        fontWeight: 700,
                                        fontSize: 16,
                                        textDecoration: 'none',
                                        marginTop: 4
                                    }}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open Password Reset
                                </a>
                                <div style={{ color: '#64748b', fontSize: 13, marginTop: 10 }}>
                                    This fallback link is shown only because the email could not be delivered.
                                </div>
                            </div>
                        )}
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
                                    disabled={success}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="btn btn-primary btn-block" 
                                disabled={loading || success}
                            >
                                {loading ? 'Sending...' : success ? 'Email Sent' : 'Send Reset Link'}
                            </button>
                        </form>
                        <div className="auth-footer">
                            <p>Remember your password? <Link to="/login" className="auth-link">Back to login</Link></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
