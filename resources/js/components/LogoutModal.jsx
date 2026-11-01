import React from 'react';
import { LogOut, Loader2, AlertCircle } from 'lucide-react';

export default function LogoutModal({ isOpen, onClose, onConfirm, isLoading }) {
    if (!isOpen) return null;

    return (
        <div
            className="carvex-logout-modal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(4px)',
                display: 'grid',
                placeItems: 'center',
                padding: '1rem',
                animation: 'cvFadeIn 0.18s ease-out',
            }}
            onClick={isLoading ? undefined : onClose}
        >
            <div
                className="carvex-logout-modal-card"
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '420px',
                    padding: '2rem 1.75rem',
                    textAlign: 'center',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    animation: 'cvScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-modal-title"
            >
                {/* Warning Icon Badge */}
                <div
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: '#fef2f2',
                        color: '#ef4444',
                        display: 'grid',
                        placeItems: 'center',
                        margin: '0 auto 1.25rem',
                        boxShadow: '0 0 0 8px #fee2e2',
                    }}
                >
                    <LogOut size={26} />
                </div>

                <h3
                    id="logout-modal-title"
                    style={{
                        margin: '0 0 0.5rem',
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        color: '#0f172a',
                    }}
                >
                    Confirm Logout
                </h3>

                <p
                    style={{
                        margin: '0 0 1.75rem',
                        fontSize: '0.98rem',
                        color: '#64748b',
                        lineHeight: 1.5,
                    }}
                >
                    {isLoading
                        ? 'Signing out of your CarVex account. Please wait...'
                        : 'Are you sure you want to logout? You will need to sign in again to access your dashboard and saved parts.'}
                </p>

                {/* Actions */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        justifyContent: 'center',
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        style={{
                            flex: 1,
                            padding: '0.75rem 1.25rem',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            fontSize: '0.98rem',
                            fontWeight: 700,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        style={{
                            flex: 1,
                            padding: '0.75rem 1.25rem',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            fontSize: '0.98rem',
                            fontWeight: 700,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={18} className="spin-animate" />
                                <span>Logging out...</span>
                            </>
                        ) : (
                            <>
                                <LogOut size={16} />
                                <span>Log Out</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

