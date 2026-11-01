import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EmailVerificationModal from '../components/EmailVerificationModal';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(true);

    const [fieldErrors, setFieldErrors] = useState({});
    const [generalError, setGeneralError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [debugVerificationUrl, setDebugVerificationUrl] = useState('');

    const { register, login } = useAuth();
    const navigate = useNavigate();

    // Password strength indicator
    const passwordStrength = useMemo(() => {
        if (!password) return { score: 0, label: '', color: '' };
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z\d]/.test(password)) score++;

        const levels = {
            1: { label: 'Weak', color: '#ef4444' },
            2: { label: 'Fair', color: '#f59e0b' },
            3: { label: 'Good', color: '#3b82f6' },
            4: { label: 'Strong', color: '#10b981' },
            5: { label: 'Very Strong', color: '#10b981' },
        };
        const s = Math.min(Math.max(score, 1), 5);
        return { score: s, ...levels[s] };
    }, [password]);

    const validateForm = () => {
        const errors = {};
        if (!name.trim()) {
            errors.name = 'Full name is required';
        }
        if (!email.trim()) {
            errors.email = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Please enter a valid email address';
        }
        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }
        if (password !== passwordConfirmation) {
            errors.passwordConfirmation = 'Passwords do not match';
        }
        if (!agreeTerms) {
            errors.terms = 'You must agree to the Terms & Privacy Policy';
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
            const res = await register({
                name: name.trim(),
                email: email.trim(),
                password,
                password_confirmation: passwordConfirmation,
            });

            if (res?.data?.requires_email_verification || res?.requires_email_verification) {
                const debugUrl = res?.data?.debug_verification_url || res?.debug_verification_url;
                if (debugUrl) {
                    setDebugVerificationUrl(debugUrl);
                }
                setShowVerificationModal(true);
            } else {
                setSuccessMessage('Account created successfully! Redirecting...');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1200);
            }
        } catch (err) {
            console.error('Registration error:', err);
            const validationErrors = err.response?.data?.errors;
            if (validationErrors) {
                const mapped = {};
                if (validationErrors.name) mapped.name = validationErrors.name[0];
                if (validationErrors.email) mapped.email = validationErrors.email[0];
                if (validationErrors.password) mapped.password = validationErrors.password[0];
                setFieldErrors(mapped);
                setGeneralError(Object.values(validationErrors).flat()[0] || 'Validation failed.');
            } else {
                setGeneralError(err.response?.data?.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-modal auth-modal--register">
                    <div className="auth-modal__header">
                        <button
                            type="button"
                            className="auth-modal__close"
                            aria-label="Close"
                            onClick={() => navigate('/')}
                        >
                            ×
                        </button>
                        <h1>Create Account</h1>
                        <p className="auth-modal__subtitle">Join CarVex to buy and sell auto parts</p>
                    </div>

                    <div className="auth-modal__body">
                        {successMessage && (
                            <div className="alert alert-success" role="alert" style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                                {successMessage}
                            </div>
                        )}

                        {generalError && (
                            <div className="alert alert-danger" role="alert">
                                {generalError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="auth-form" noValidate>
                            <div className="form-group">
                                <label htmlFor="register-name">Full Name</label>
                                <input
                                    id="register-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                                    }}
                                    placeholder="John Doe"
                                    required
                                    autoComplete="name"
                                    disabled={loading}
                                />
                                {fieldErrors.name && (
                                    <div className="auth-field-error">{fieldErrors.name}</div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="register-email">Email Address</label>
                                <input
                                    id="register-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                                    }}
                                    placeholder="your@email.com"
                                    required
                                    autoComplete="email"
                                    disabled={loading}
                                />
                                {fieldErrors.email && (
                                    <div className="auth-field-error">{fieldErrors.email}</div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="register-password">Password</label>
                                <div className="auth-password-input-wrap">
                                    <input
                                        id="register-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                                        }}
                                        placeholder="Min 8 characters"
                                        required
                                        autoComplete="new-password"
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
                                {password && (
                                    <div className="auth-pwd-meter">
                                        <div className="auth-pwd-meter__bar">
                                            {[1, 2, 3, 4, 5].map((lvl) => (
                                                <div
                                                    key={lvl}
                                                    className="auth-pwd-meter__segment"
                                                    style={{
                                                        backgroundColor: lvl <= passwordStrength.score ? passwordStrength.color : '#e5e7eb'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span className="auth-pwd-meter__label" style={{ color: passwordStrength.color }}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                )}
                                {fieldErrors.password && (
                                    <div className="auth-field-error">{fieldErrors.password}</div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="register-confirm">Confirm Password</label>
                                <div className="auth-password-input-wrap">
                                    <input
                                        id="register-confirm"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={passwordConfirmation}
                                        onChange={(e) => {
                                            setPasswordConfirmation(e.target.value);
                                            if (fieldErrors.passwordConfirmation) setFieldErrors({ ...fieldErrors, passwordConfirmation: '' });
                                        }}
                                        placeholder="Re-enter password"
                                        required
                                        autoComplete="new-password"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className="auth-eye-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {fieldErrors.passwordConfirmation && (
                                    <div className="auth-field-error">{fieldErrors.passwordConfirmation}</div>
                                )}
                            </div>

                            <div className="auth-terms-group">
                                <label className="auth-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={agreeTerms}
                                        onChange={(e) => setAgreeTerms(e.target.checked)}
                                    />
                                    <span>
                                        I agree to the <Link to="/terms" target="_blank">Terms</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>
                                    </span>
                                </label>
                                {fieldErrors.terms && (
                                    <div className="auth-field-error">{fieldErrors.terms}</div>
                                )}
                            </div>

                            <button 
                                type="submit" 
                                className="btn btn-primary btn-block" 
                                disabled={loading}
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <p>Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
                        </div>
                    </div>
                </div>
            </div>

            <EmailVerificationModal
                isOpen={showVerificationModal}
                onClose={() => {
                    setShowVerificationModal(false);
                    navigate('/login');
                }}
                email={email}
                password={password}
                debugVerificationUrl={debugVerificationUrl}
                onVerified={async () => {
                    try {
                        if (login) await login(email, password);
                        navigate('/dashboard');
                    } catch {
                        navigate('/login');
                    }
                }}
            />
        </div>
    );
}
