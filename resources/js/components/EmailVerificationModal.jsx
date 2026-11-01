import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, X, ArrowRight, Loader2 } from 'lucide-react';
import authService from '../services/authService';

export default function EmailVerificationModal({
    isOpen,
    onClose,
    email,
    password,
    debugVerificationUrl,
    onVerified,
}) {
    const [resending, setResending] = useState(false);
    const [resendStatus, setResendStatus] = useState({ success: '', error: '' });
    const [countdown, setCountdown] = useState(0);
    const [activeDebugUrl, setActiveDebugUrl] = useState(debugVerificationUrl || '');
    const [verifying, setVerifying] = useState(false);
    const [verifiedSuccess, setVerifiedSuccess] = useState(false);

    // Synchronize if prop changes
    useEffect(() => {
        if (debugVerificationUrl) {
            setActiveDebugUrl(debugVerificationUrl);
        }
    }, [debugVerificationUrl]);

    // Auto-poll verification status while modal is open
    useEffect(() => {
        if (!isOpen || !email || verifiedSuccess) return;

        let isSubscribed = true;
        const checkStatus = async () => {
            try {
                const res = await authService.checkVerificationStatus(email);
                if (res.data?.verified && isSubscribed) {
                    setVerifiedSuccess(true);
                    setVerifying(true);
                    if (onVerified) {
                        setTimeout(() => {
                            onVerified();
                        }, 700);
                    }
                }
            } catch {
                // Ignore transient polling errors
            }
        };

        const interval = setInterval(checkStatus, 3500);
        return () => {
            isSubscribed = false;
            clearInterval(interval);
        };
    }, [isOpen, email, verifiedSuccess, onVerified]);

    if (!isOpen) return null;

    const handleResend = async () => {
        if (resending || countdown > 0) return;
        setResending(true);
        setResendStatus({ success: '', error: '' });

        try {
            const res = await authService.resendVerification({ email, password: password || 'admincarvex' });
            if (res?.data?.debug_verification_url) {
                setActiveDebugUrl(res.data.debug_verification_url);
            }
            setResendStatus({
                success: `A fresh verification link has been sent to ${email || 'your email'}. Please check your inbox.`,
                error: '',
            });
            setCountdown(60);
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            setResendStatus({
                success: '',
                error: err.response?.data?.message || 'Could not resend verification email. Please try again shortly.',
            });
        } finally {
            setResending(false);
        }
    };

    const handleManualVerifyCheck = async () => {
        if (verifying) return;
        setVerifying(true);
        setResendStatus({ success: '', error: '' });

        try {
            const res = await authService.checkVerificationStatus(email);
            if (res.data?.verified) {
                setVerifiedSuccess(true);
                if (onVerified) {
                    setTimeout(() => {
                        onVerified();
                    }, 500);
                }
            } else {
                // If backend check says not yet verified, try the onVerified callback anyway (which attempts login)
                if (onVerified) {
                    await onVerified();
                }
                setVerifying(false);
            }
        } catch {
            if (onVerified) {
                await onVerified();
            }
            setVerifying(false);
        }
    };

    return (
        <div className="verification-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="verification-modal-title">
            <div className="verification-modal-card" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    className="verification-modal-close"
                    onClick={onClose}
                    aria-label="Close modal"
                >
                    <X size={20} />
                </button>

                <div className="verification-modal-icon-wrap">
                    <div className="verification-modal-icon-circle">
                        {verifiedSuccess ? <CheckCircle2 size={32} style={{ color: '#16a34a' }} /> : <Mail size={32} />}
                    </div>
                </div>

                <div className="verification-modal-header">
                    <h2 id="verification-modal-title">
                        {verifiedSuccess ? 'Email Verified!' : 'Verify Your Email Address'}
                    </h2>
                    <p className="verification-modal-subtitle">
                        {verifiedSuccess ? 'Redirecting to your dashboard...' : 'Action required before signing in'}
                    </p>
                </div>

                <div className="verification-modal-body">
                    {verifiedSuccess ? (
                        <div className="verification-alert verification-alert--success" role="alert">
                            <Loader2 size={18} className="spin" />
                            <span><strong>Verification confirmed!</strong> Logging you in now...</span>
                        </div>
                    ) : (
                        <>
                            <p className="verification-modal-desc">
                                Your account requires email verification before you can access the system. We've sent a verification link to:
                            </p>

                            <div className="verification-modal-email-pill">
                                <strong>{email || 'your email address'}</strong>
                            </div>

                            <p className="verification-modal-note">
                                Please check your Gmail or email inbox (including spam folder) and click the verification button.
                            </p>
                        </>
                    )}

                    {resendStatus.success && (
                        <div className="verification-alert verification-alert--success" role="alert">
                            <CheckCircle2 size={16} />
                            <span>{resendStatus.success}</span>
                        </div>
                    )}

                    {resendStatus.error && (
                        <div className="verification-alert verification-alert--error" role="alert">
                            <AlertCircle size={16} />
                            <span>{resendStatus.error}</span>
                        </div>
                    )}

                    {activeDebugUrl && !verifiedSuccess && (
                        <div className="verification-dev-box">
                            <div className="verification-dev-header">
                                <span className="verification-dev-badge">Local Testing Quick Link</span>
                                <span className="verification-dev-hint">MAIL_MAILER=log</span>
                            </div>
                            <p className="verification-dev-text">
                                Local development mode active: verify this account instantly below:
                            </p>
                            <a href={activeDebugUrl} className="verification-dev-link">
                                Click here to verify and auto-login &rarr;
                            </a>
                        </div>
                    )}
                </div>

                <div className="verification-modal-actions">
                    {onVerified && (
                        <button
                            type="button"
                            className="btn btn-primary btn-block verification-modal-primary-btn"
                            onClick={handleManualVerifyCheck}
                            disabled={verifying}
                        >
                            {verifying ? (
                                <>
                                    <Loader2 size={16} className="spin" />
                                    <span>Verifying & Logging In...</span>
                                </>
                            ) : (
                                <>
                                    <span>I've Verified My Email — Sign In</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    )}

                    {!verifiedSuccess && (
                        <button
                            type="button"
                            className="verification-modal-resend-btn"
                            onClick={handleResend}
                            disabled={resending || countdown > 0 || verifying}
                        >
                            <RefreshCw size={15} className={resending ? 'spin' : ''} />
                            <span>
                                {resending
                                    ? 'Sending verification link...'
                                    : countdown > 0
                                    ? `Resend email in ${countdown}s`
                                    : 'Resend Verification Email'}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
