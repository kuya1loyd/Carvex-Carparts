import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CustomerRoute() {
    const { isAuthenticated, isReady } = useAuth();
    const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const effectivelyAuthenticated = isAuthenticated || Boolean(cachedToken);

    if (!isReady && !effectivelyAuthenticated) {
        return (
            <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', background: '#ffffff' }}>
                <div style={{ width: '38px', height: '38px', border: '3px solid #fee2e2', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
        );
    }

    if (!effectivelyAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
