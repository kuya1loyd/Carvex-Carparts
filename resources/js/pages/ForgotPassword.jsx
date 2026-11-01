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
        <div className="auth-page auth-page--forgot">
            <div className="auth-container">
                <section className="auth-modal" aria-labelledby="forgot-password-heading">
                    <div className="auth-modal__header">
                        <Link to="/" className="auth-brand" aria-label="CarVex home">
                            <span className="auth-brand__mark" aria-hidden="true">C</span>
                            <span>CarVex</span>
                        </Link>
                        <p className="auth-modal__back-link">
                            <Link to="/" className="auth-link">Back to Home</Link>
                        </p>
                        <h1 id="forgot-password-heading">Reset your password</h1>
                        <p className="auth-modal__subtitle">Enter your email to receive a reset link</p>
                    </div>
                    <div className="auth-modal__body">
                        {error && <div className="alert alert-danger" role="alert">{error}</div>}
                        {success && <div className="alert alert-success" role="status">{success}</div>}
                        {resetLink && (
                            <div className="auth-reset-link">
                                <a
                                    href={resetLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open Password Reset
                                </a>
                                <p>This fallback link is available because email delivery failed.</p>
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
                                    disabled={Boolean(success)}
                                    inputMode="email"
                                    aria-invalid={Boolean(error)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="btn btn-primary btn-block" 
                                disabled={loading || Boolean(success)}
                                aria-busy={loading}
                            >
                                {loading ? 'Sending...' : success ? 'Email sent' : 'Send reset link'}
                            </button>
                        </form>
                        <div className="auth-footer">
                            <p>Remember your password? <Link to="/login" className="auth-link">Back to login</Link></p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
