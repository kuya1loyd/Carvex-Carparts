import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import PageSkeleton from './components/Skeleton';
import IconTooltips from './components/IconTooltips';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import CustomerRoute from './components/CustomerRoute';
import AdminLayout from './components/AdminLayout';
import CustomerDashboardLayout from './components/CustomerDashboardLayout';
import {
    loadAdminAccount,
    loadAdminConcerns,
    loadAdminDashboard,
    loadAdminOrders,
    loadAdminProducts,
    loadAdminUsers,
} from './utils/adminRoutePreload';

import Landing from './pages/Landing';
const Home = lazy(() => import('./pages/Home'));
import Products from './pages/Products';
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
import Cart from './pages/Cart';
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Profile = lazy(() => import('./pages/Profile'));
import Login from './pages/Login';
import Register from './pages/Register';
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
import CustomerService from './pages/CustomerService';
import DashboardOverview from './pages/Dashboard/Overview';
import DashboardProfile from './pages/Dashboard/Profile';
import DashboardOrders from './pages/Dashboard/Orders';
import DashboardProducts from './pages/Dashboard/Products';
import DashboardCart from './pages/Dashboard/Cart';
import DashboardSupport from './pages/Dashboard/Support';
import DashboardWishlist from './pages/Dashboard/Wishlist';
import DashboardMessages from './pages/Dashboard/Messages';
import DashboardListings from './pages/Dashboard/Listings';
import DashboardAddresses from './pages/Dashboard/Addresses';
import DashboardCheckout from './pages/Dashboard/Checkout';
import DashboardCheckoutSuccess from './pages/Dashboard/CheckoutSuccess';
const AdminDashboard = lazy(loadAdminDashboard);
const AdminAccount = lazy(loadAdminAccount);
const AdminProducts = lazy(loadAdminProducts);
const AdminProductCreate = lazy(() => import('./pages/Admin/ProductCreate'));
const AdminProductDetail = lazy(() => import('./pages/Admin/ProductDetail'));
const AdminProductEdit = lazy(() => import('./pages/Admin/ProductEdit'));
const AdminOrders = lazy(loadAdminOrders);
const AdminUsers = lazy(loadAdminUsers);
const AdminConcerns = lazy(loadAdminConcerns);
const AdminActivity = lazy(() => import('./pages/Admin/Activity'));
const AdminMessages = lazy(() => import('./pages/Admin/Messages'));
const AdminOrderDetail = lazy(() => import('./pages/Admin/OrderDetail'));

function RouteLoader() {
    return (
        <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', background: '#ffffff' }}>
            <div style={{ width: '38px', height: '38px', border: '3px solid #fee2e2', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
    );
}

function GuestOnly({ children }) {
    const { isReady, isAuthenticated, isAdmin } = useAuth();
    const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const effectivelyAuthenticated = isAuthenticated || Boolean(cachedToken);

    if (!isReady) {
        return <RouteLoader />;
    }

    if (effectivelyAuthenticated) {
        return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
    }

    return children;
}

function LandingEntry() {
    const { isAuthenticated, isAdmin } = useAuth();
    const location = useLocation();

    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const queryParams = new URLSearchParams(location.search || '');
    const hasRecoveryToken = Boolean(hashParams.get('access_token') || queryParams.get('access_token'));
    const recoveryType = (hashParams.get('type') || queryParams.get('type') || '').toLowerCase();

    if (hasRecoveryToken && recoveryType === 'recovery') {
        return <Navigate to={`/reset-password${location.search}${window.location.hash || ''}`} replace />;
    }

    const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const effectivelyAuthenticated = isAuthenticated || Boolean(cachedToken);

    if (effectivelyAuthenticated) {
        return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
    }

    return <Landing />;
}

function ProductsEntry() {
    const { isAuthenticated, isAdmin } = useAuth();
    const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const effectivelyAuthenticated = isAuthenticated || Boolean(cachedToken);

    if (effectivelyAuthenticated) {
        return <Navigate to={isAdmin ? '/admin/products' : '/dashboard/products'} replace />;
    }

    return <Products />;
}

function SupportEntry() {
    const { isAuthenticated, isAdmin } = useAuth();
    const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const effectivelyAuthenticated = isAuthenticated || Boolean(cachedToken);

    if (effectivelyAuthenticated) {
        return <Navigate to={isAdmin ? '/admin/customer-service' : '/dashboard/support'} replace />;
    }

    return <CustomerService />;
}

function CatchAllEntry() {
    const { isAuthenticated, isAdmin } = useAuth();
    const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const effectivelyAuthenticated = isAuthenticated || Boolean(cachedToken);

    if (effectivelyAuthenticated) {
        return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
    }

    return <Navigate to="/" replace />;
}

function CartEntry() {
    const { isAuthenticated, isAdmin } = useAuth();

    if (isAuthenticated && !isAdmin) {
        return <Navigate to="/dashboard/cart" replace />;
    }

    return <Cart />;
}

function OrderDetailRedirect() {
    const { id } = useParams();

    if (!id) {
        return <Navigate to="/dashboard/orders" replace />;
    }

    return <Navigate to={`/dashboard/orders/${id}`} replace />;
}

export default function App() {
    return (
        <ErrorBoundary>
            <Router>
                <AuthProvider>
                    <CartProvider>
                    <IconTooltips />
                    <Suspense fallback={<RouteLoader />}>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
                        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />

                        {/* Layout Routes */}
                        <Route element={<Layout />}>
                            <Route path="/" element={<LandingEntry />} />
                            <Route path="/home" element={<LandingEntry />} />
                            <Route path="/products" element={<ProductsEntry />} />
                            <Route path="/products/:id" element={<ProductDetail />} />
                            <Route path="/customer-service" element={<SupportEntry />} />
                            <Route path="/cart" element={<CartEntry />} />
                            <Route path="/customer-home" element={<Home />} />

                            {/* Protected Customer Routes */}
                            <Route element={<CustomerRoute />}>
                                <Route path="/checkout" element={<Navigate to="/dashboard/checkout" replace />} />
                                <Route path="/orders" element={<Navigate to="/dashboard/orders" replace />} />
                                <Route path="/orders/:id" element={<OrderDetailRedirect />} />
                                <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
                            </Route>

                        </Route>

                        <Route element={<CustomerRoute />}>
                            <Route element={<CustomerDashboardLayout />}>
                                <Route path="/dashboard" element={<DashboardOverview />} />
                                <Route path="/dashboard/overview" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard/profile" element={<DashboardProfile />} />
                                <Route path="/dashboard/settings" element={<DashboardProfile />} />
                                <Route path="/dashboard/orders" element={<DashboardOrders />} />
                                <Route path="/dashboard/orders/:id" element={<OrderDetail />} />
                                <Route path="/dashboard/products" element={<DashboardProducts />} />
                                <Route path="/dashboard/products/:id" element={<ProductDetail />} />
                                <Route path="/dashboard/support" element={<DashboardSupport />} />
                                <Route path="/dashboard/garage" element={<Navigate to="/dashboard/products" replace />} />
                                <Route path="/dashboard/wishlist" element={<DashboardWishlist />} />
                                <Route path="/dashboard/wallet" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard/messages" element={<DashboardMessages />} />
                                <Route path="/dashboard/listings" element={<DashboardListings />} />
                                <Route path="/dashboard/addresses" element={<DashboardAddresses />} />
                                <Route path="/dashboard/cart" element={<DashboardCart />} />
                                <Route path="/dashboard/checkout" element={<DashboardCheckout />} />
                                <Route path="/dashboard/legacy-home" element={<Home />} />
                                <Route path="/dashboard/checkout-success" element={<DashboardCheckoutSuccess />} />
                                <Route path="/dashboard/legacy-orders" element={<Orders />} />
                                <Route path="/dashboard/legacy-profile" element={<Profile />} />
                            </Route>
                        </Route>

        {/* Protected Admin Routes */}
                        <Route element={<AdminRoute />}>
                            <Route element={<AdminLayout />}>
                                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                                <Route path="/admin/account" element={<AdminAccount />} />
                                <Route path="/admin/products" element={<AdminProducts />} />
                                <Route path="/admin/products/new" element={<AdminProductCreate />} />
                                <Route path="/admin/products/:id" element={<AdminProductDetail />} />
                                <Route path="/admin/products/:id/edit" element={<AdminProductEdit />} />
                                <Route path="/admin/orders" element={<AdminOrders />} />
                                <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
                                <Route path="/admin/users" element={<AdminUsers />} />
                                <Route path="/admin/activity" element={<AdminActivity />} />
                                <Route path="/admin/messages" element={<AdminMessages />} />
                                <Route path="/admin/customer-service" element={<AdminConcerns />} />
                                <Route path="/admin/concerns" element={<Navigate to="/admin/customer-service" replace />} />
                            </Route>
                        </Route>

                        {/* Catch all */}
                        <Route path="*" element={<CatchAllEntry />} />
                    </Routes>
                    </Suspense>
                </CartProvider>
            </AuthProvider>
        </Router>
        </ErrorBoundary>
    );
}
