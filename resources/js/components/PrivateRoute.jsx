import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageSkeleton from './Skeleton';

export default function PrivateRoute() {
    const { isAuthenticated, isReady } = useAuth();

    if (!isReady) {
        return <PageSkeleton variant="route" label="Checking your session" />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
