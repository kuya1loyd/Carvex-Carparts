import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute() {
    const { isAuthenticated, isAdmin, isReady } = useAuth();

    const cachedUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('auth_user') || '{}');
        } catch {
            return {};
        }
    })();
    const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const effectivelyAdmin = isAdmin || (cachedToken && String(cachedUser?.role || '').toLowerCase() === 'admin');
    const effectivelyAuthenticated = isAuthenticated || Boolean(cachedToken);

    if (!isReady && !effectivelyAuthenticated) {
        return null;
    }

    if (!effectivelyAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!effectivelyAdmin) {
        return <Navigate to="/dashboard/overview" replace />;
    }

    return <Outlet />;
}
