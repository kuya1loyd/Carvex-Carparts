import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        passwordConfirmation: '',
        phone: '',
        address: '',
        city: '',
        region: '',
        postal_code: '',
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [generalError, setGeneralError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [touched, setTouched] = useState({});
    const { register } = useAuth();
    const navigate = useNavigate();

    // Password strength indicator
    const passwordStrength = useMemo(() => {
        const pwd = formData.password;
        if (!pwd) return { score: 0, label: '', color: '' };
        
        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
        if (/\d/.test(pwd)) score++;
        if (/[^a-zA-Z\d]/.test(pwd)) score++;

        const strengthLevels = {
            1: { label: 'Weak', color: 'text-danger' },
            2: { label: 'Fair', color: 'text-warning' },
            3: { label: 'Good', color: 'text-info' },
            4: { label: 'Strong', color: 'text-success' },
            5: { label: 'Very Strong', color: 'text-success' },
        };

        return { score: Math.min(score, 5), ...strengthLevels[Math.min(score, 5)] } || {};
    }, [formData.password]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear field error when user starts typing
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const validateForm = () => {
        const errors = {};
        
        if (!formData.name.trim()) {
            errors.name = 'Full name is required';
        }
        
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }
        
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }
        
        if (formData.password !== formData.passwordConfirmation) {
            errors.passwordConfirmation = 'Passwords do not match';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGeneralError('');
        setSuccessMessage('');

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            await register({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                password_confirmation: formData.passwordConfirmation,
                phone: formData.phone || null,
                address: formData.address || null,
                city: formData.city || null,
                region: formData.region || null,
                postal_code: formData.postal_code || null,
            });
            setSuccessMessage('Account created successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            const validationMessage = Object.values(err.response?.data?.errors || {}).flat()[0];
            const errorMsg = err.response?.data?.message
                || err.response?.data?.error
                || validationMessage
                || (!err.response
                    ? 'Could not reach the signup service. Check that the server is running and try again.'
                    : 'We could not create your account right now. Please try again shortly.');
            setGeneralError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setGoogleLoading(true);
        setGeneralError('');
        let shouldResetLoading = true;

        try {
            const redirectTo = `${window.location.origin}/auth/callback`;
            const response = await authService.getSocialAuthUrl('google', redirectTo);
            const authUrl = response?.data?.url;

            if (authUrl) {
                shouldResetLoading = false;
                window.location.href = authUrl;
                return;
            }

            setGeneralError('Google authentication configuration error. Please try email signup or contact support.');
        } catch (err) {
            const errorMessage = err.response?.data?.message
                || err.message
                || 'Failed to connect to Google. Please check your connection and try again.';
            setGeneralError(errorMessage);
            console.error('Google signup error:', err);
        } finally {
            if (shouldResetLoading) {
                setGoogleLoading(false);
            }
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-modal auth-modal--register" style={{ maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                    <button
                        type="button"
                        className="auth-modal__close"
                        aria-label="Close"
                        style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 26, fontWeight: 700, color: '#64748b', cursor: 'pointer', zIndex: 2 }}
                        onClick={() => window.location.href = '/'}
                    >
                        ×
                    </button>
                    <div className="auth-modal__header" style={{ paddingTop: 10, paddingBottom: 6 }}>
                        <div className="signup-header-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <div className="signup-badge" style={{ marginBottom: 4, marginTop: 0, fontSize: 14, padding: '5px 14px' }}>WELCOME TO CARVEX</div>
                            <h1 style={{ fontSize: 19, margin: 0, fontWeight: 800, letterSpacing: '-1px' }}>Create Your Account</h1>
                            <p className="auth-modal__subtitle" style={{ margin: '6px 0 0 0', fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 1.2 }}>
                                Join thousands of customers finding quality auto parts
                            </p>
                        </div>
                    </div>

                    <div className="auth-modal__body">
                        {/* Success Alert */}
                        {successMessage && (
                            <div className="signup-alert alert-success" role="alert" style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d' }}>
                                <svg className="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <div className="alert-content">
                                    <strong>Success</strong>
                                    <p>{successMessage}</p>
                                </div>
                            </div>
                        )}

                        {/* General Error Alert */}
                        {generalError && (
                            <div className="signup-alert alert-error" role="alert">
                                <svg className="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <div className="alert-content">
                                    <strong>Signup Error</strong>
                                    <p>{generalError}</p>
                                </div>
                            </div>
                        )}


                        {/* Google Sign Up Button (enabled) */}
                        <button
                            type="button"
                            className="btn-signup-google"
                            style={{ margin: '10px 0 8px 0' }}
                            onClick={handleGoogleSignup}
                            disabled={googleLoading || loading}
                            aria-busy={googleLoading}
                        >
                            {googleLoading ? (
                                <span role="status">Connecting to Google...</span>
                            ) : (
                                <>
                                    <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    <span style={{ marginLeft: 8 }}>Continue with Google</span>
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="auth-divider">
                            <span>or sign up with email</span>
                        </div>

                        {/* Email/Password Registration Form */}
                        <form onSubmit={handleSubmit} className="auth-form auth-form--register" noValidate>
                            {/* Full Name Field */}
                            <div className={`form-group ${touched.name && (fieldErrors.name || formData.name) ? 'has-interaction' : ''}`}>
                                <label htmlFor="name" className="form-label">
                                    Full Name <span className="required">*</span>
                                </label>
                                <div className="form-input-wrapper">
                                    <input
                                        id="name"
                                        type="text"
                                        name="name"
                                        className={`form-control ${fieldErrors.name ? 'is-invalid' : formData.name && touched.name ? 'is-valid' : ''}`}
                                        value={formData.name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="John Doe"
                                        disabled={loading || googleLoading}
                                        autoComplete="name"
                                    />
                                    {touched.name && formData.name && !fieldErrors.name && (
                                        <svg className="input-check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                                {fieldErrors.name && (
                                    <div className="field-error">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">!</text>
                                        </svg>
                                        {fieldErrors.name}
                                    </div>
                                )}
                            </div>

                            {/* Email Field */}
                            <div className={`form-group ${touched.email && (fieldErrors.email || formData.email) ? 'has-interaction' : ''}`}>
                                <label htmlFor="email" className="form-label">
                                    Email Address <span className="required">*</span>
                                </label>
                                <div className="form-input-wrapper">
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        className={`form-control ${fieldErrors.email ? 'is-invalid' : formData.email && touched.email ? 'is-valid' : ''}`}
                                        value={formData.email}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="your@email.com"
                                        disabled={loading || googleLoading}
                                        autoComplete="email"
                                    />
                                    {touched.email && formData.email && !fieldErrors.email && (
                                        <svg className="input-check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                                {fieldErrors.email && (
                                    <div className="field-error">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="12" r="10"></circle>
                                        </svg>
                                        {fieldErrors.email}
                                    </div>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className={`form-group ${touched.password && (fieldErrors.password || formData.password) ? 'has-interaction' : ''}`}>
                                <label htmlFor="password" className="form-label">
                                    Password <span className="required">*</span>
                                </label>
                                <div className="form-input-wrapper">
                                    <input
                                        id="password"
                                        type="password"
                                        name="password"
                                        className={`form-control ${fieldErrors.password ? 'is-invalid' : formData.password && touched.password ? 'is-valid' : ''}`}
                                        value={formData.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Min 6 characters"
                                        disabled={loading || googleLoading}
                                        autoComplete="new-password"
                                        minLength="6"
                                    />
                                </div>
                                {formData.password && (
                                    <div className="password-strength-indicator">
                                        <div className="strength-info">
                                            <span className="strength-label">Password strength:</span>
                                            <span className={`strength-value ${passwordStrength.color || 'text-muted'}`}>
                                                {passwordStrength.label}
                                            </span>
                                        </div>
                                        <div className="strength-bar">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`strength-segment ${i < passwordStrength.score ? 'filled' : ''}`}
                                                ></div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {fieldErrors.password && (
                                    <div className="field-error">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="12" r="10"></circle>
                                        </svg>
                                        {fieldErrors.password}
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password Field */}
                            <div className={`form-group ${touched.passwordConfirmation && (fieldErrors.passwordConfirmation || formData.passwordConfirmation) ? 'has-interaction' : ''}`}>
                                <label htmlFor="passwordConfirmation" className="form-label">
                                    Confirm Password <span className="required">*</span>
                                </label>
                                <div className="form-input-wrapper">
                                    <input
                                        id="passwordConfirmation"
                                        type="password"
                                        name="passwordConfirmation"
                                        className={`form-control ${fieldErrors.passwordConfirmation ? 'is-invalid' : formData.passwordConfirmation && formData.password === formData.passwordConfirmation && touched.passwordConfirmation ? 'is-valid' : ''}`}
                                        value={formData.passwordConfirmation}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Re-enter password"
                                        disabled={loading || googleLoading}
                                        autoComplete="new-password"
                                    />
                                    {formData.passwordConfirmation && formData.password === formData.passwordConfirmation && !fieldErrors.passwordConfirmation && touched.passwordConfirmation && (
                                        <svg className="input-check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                                {fieldErrors.passwordConfirmation && (
                                    <div className="field-error">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="12" r="10"></circle>
                                        </svg>
                                        {fieldErrors.passwordConfirmation}
                                    </div>
                                )}
                            </div>

                            {/* Address Fields - Compact Two Column */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                                <div className={`form-group ${touched.phone && formData.phone ? 'has-interaction' : ''}`} style={{ marginBottom: 0 }}>
                                    <label htmlFor="phone" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: '#475569' }}>Phone</label>
                                    <input
                                        id="phone"
                                        type="tel"
                                        name="phone"
                                        className="form-control"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="+63 912 345 6789"
                                        style={{ fontSize: '13px', padding: '8px 10px' }}
                                        disabled={loading || googleLoading}
                                    />
                                </div>
                                <div className={`form-group ${touched.city && formData.city ? 'has-interaction' : ''}`} style={{ marginBottom: 0 }}>
                                    <label htmlFor="city" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: '#475569' }}>City</label>
                                    <input
                                        id="city"
                                        type="text"
                                        name="city"
                                        className="form-control"
                                        value={formData.city}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Manila"
                                        style={{ fontSize: '13px', padding: '8px 10px' }}
                                        disabled={loading || googleLoading}
                                    />
                                </div>
                            </div>

                            {/* Address - Full Width */}
                            <div className={`form-group ${touched.address && formData.address ? 'has-interaction' : ''}`} style={{ marginTop: '10px', marginBottom: 0 }}>
                                <label htmlFor="address" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: '#475569' }}>Street Address</label>
                                <input
                                    id="address"
                                    type="text"
                                    name="address"
                                    className="form-control"
                                    value={formData.address}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="123 Main Street"
                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                    disabled={loading || googleLoading}
                                />
                            </div>

                            {/* Region and Postal Code */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                <div className={`form-group ${touched.region && formData.region ? 'has-interaction' : ''}`} style={{ marginBottom: 0 }}>
                                    <label htmlFor="region" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: '#475569' }}>Region</label>
                                    <input
                                        id="region"
                                        type="text"
                                        name="region"
                                        className="form-control"
                                        value={formData.region}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="NCR"
                                        style={{ fontSize: '13px', padding: '8px 10px' }}
                                        disabled={loading || googleLoading}
                                    />
                                </div>
                                <div className={`form-group ${touched.postal_code && formData.postal_code ? 'has-interaction' : ''}`} style={{ marginBottom: 0 }}>
                                    <label htmlFor="postal_code" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600, color: '#475569' }}>Postal Code</label>
                                    <input
                                        id="postal_code"
                                        type="text"
                                        name="postal_code"
                                        className="form-control"
                                        value={formData.postal_code}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="1234"
                                        style={{ fontSize: '13px', padding: '8px 10px' }}
                                        disabled={loading || googleLoading}
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="btn-signup-submit"
                                disabled={loading || googleLoading}
                                aria-busy={loading}
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>

                        {/* Footer Links */}
                        <div className="auth-footer">
                            <p>
                                Already have an account?
                                {' '}
                                <Link to="/login" className="auth-link-primary">
                                    Sign in here
                                </Link>
                            </p>
                        </div>

                        {/* Privacy Notice */}
                        <div className="signup-privacy-notice">
                            <p>
                                By creating an account, you agree to our
                                {' '}
                                <a href="#" onClick={e => { e.preventDefault(); window.open('/terms', '_blank') || alert('Terms of Service page coming soon.'); }}>Terms of Service</a>
                                {' '}
                                and
                                {' '}
                                <a href="#" onClick={e => { e.preventDefault(); window.open('/privacy', '_blank') || alert('Privacy Policy page coming soon.'); }}>Privacy Policy</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
