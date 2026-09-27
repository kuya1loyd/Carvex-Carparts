import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageSkeleton from './Skeleton';

export default function AdminRoute() {
    const { isAuthenticated, isAdmin, isReady } = useAuth();

    if (!isReady) {
        return <PageSkeleton variant="route" label="Checking administrator access" />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
