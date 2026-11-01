import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== passwordConfirmation) {
            setMessage('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await authService.resetPassword({ token, password });
            setMessage('Password reset successful. Redirecting to login...');
            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page auth-page--reset">
            <div className="auth-container">
                <div className="auth-modal">
                    <div className="auth-modal__header">
                        <p className="auth-modal__back-link">
                            <Link to="/" className="auth-link">Back to Home</Link>
                        </p>
                        <h1>Reset password</h1>
                        <p className="auth-modal__subtitle">Enter your new password below</p>
                    </div>
                    <div className="auth-modal__body">
                        {!token ? <div className="alert alert-danger" role="alert">This reset link is missing its security token. Request a new link to continue.</div> : null}
                        {message && <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-danger'}`} role={message.includes('success') ? 'status' : 'alert'}>{message}</div>}
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="password">New Password</label>
                                <div className="auth-password-field">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        disabled={loading}
                                    />
                                    <button type="button" className="auth-password-toggle auth-password-toggle--icon" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="passwordConfirmation">Confirm Password</label>
                                <div className="auth-password-field">
                                    <input
                                        id="passwordConfirmation"
                                        type={showConfirmation ? 'text' : 'password'}
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        placeholder="Confirm new password"
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        disabled={loading}
                                    />
                                    <button type="button" className="auth-password-toggle auth-password-toggle--icon" onClick={() => setShowConfirmation((visible) => !visible)} aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirmation}>
                                        {showConfirmation ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                className="btn btn-primary btn-block" 
                                disabled={loading || !token}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                        <div className="auth-footer">
                            <p>Back to <Link to="/login" className="auth-link">Login</Link></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
