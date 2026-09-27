import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Bell,
    Activity,
    ChevronDown,
    ChevronRight,
    Headphones,
    Home,
    LogOut,
    Menu,
    Package,
    Search,
    Settings,
    ShoppingBag,
    Users,
    X,
} from 'lucide-react';
import adminService from '../services/adminService';
import { preloadAdminRoute, preloadAllAdminRoutes } from '../utils/adminRoutePreload';
import { useAuth } from '../context/AuthContext';

const SIDEBAR_REFRESH_MS = 30000;
const SIDEBAR_CACHE_KEY = 'admin_sidebar_counts_v2';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});

const SECTION_DETAILS = {
    dashboard: {
        label: 'Dashboard',
        eyebrow: 'Admin Panel',
        title: 'Business command center',
        description: 'Track revenue, inventory, orders, and customer support from one focused workspace.',
    },
    orders: {
        label: 'Orders',
        eyebrow: 'Fulfillment',
        title: 'Order operations',
        description: 'Review customer purchases, update statuses, and keep delivery flow moving.',
    },
    products: {
        label: 'Products',
        eyebrow: 'Inventory',
        title: 'Stock and catalog',
        description: 'Manage your parts catalog with clear visibility into availability and product quality.',
    },
    users: {
        label: 'Users',
        eyebrow: 'Customers',
        title: 'Customer accounts',
        description: 'Monitor customer activity, account health, and repeat-buyer relationships.',
    },
    support: {
        label: 'Customer Service',
        eyebrow: 'Support',
        title: 'Support inbox',
        description: 'Stay on top of customer concerns and keep response times under control.',
    },
    activity: {
        label: 'Activity',
        eyebrow: 'Review queue',
        title: 'Activity and listings',
        description: 'Follow recent changes and review seller parts waiting for approval.',
    },
    account: {
        label: 'Account',
        eyebrow: 'Settings',
        title: 'Admin settings',
        description: 'Manage your profile, preferences, and workspace access details.',
    },
};

const readCachedSidebarCounts = () => {
    try {
        const raw = localStorage.getItem(SIDEBAR_CACHE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        return {
            products: Number(parsed.products || 0),
            orders: Number(parsed.orders || 0),
            users: Number(parsed.users || 0),
            newConcerns: Number(parsed.newConcerns || 0),
        };
    } catch {
        return null;
    }
};

const getSectionKey = (pathname) => {
    if (pathname.startsWith('/admin/orders')) return 'orders';
    if (pathname.startsWith('/admin/products')) return 'products';
    if (pathname.startsWith('/admin/users')) return 'users';
    if (pathname.startsWith('/admin/activity')) return 'activity';
    if (pathname.startsWith('/admin/customer-service') || pathname.startsWith('/admin/concerns')) return 'support';
    if (pathname.startsWith('/admin/account')) return 'account';
    return 'dashboard';
};

const getInitials = (name) => (
    String(name || 'Admin')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'A'
);

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [sidebarCounts, setSidebarCounts] = useState(() => (
        readCachedSidebarCounts() || {
            products: 0,
            orders: 0,
            users: 0,
            newConcerns: 0,
        }
    ));
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const sidebarRequestIdRef = useRef(0);
    const searchRequestIdRef = useRef(0);
    const profileRef = useRef(null);
    const searchRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    const sectionKey = getSectionKey(location.pathname);
    const section = SECTION_DETAILS[sectionKey];
    const adminName = user?.name || 'Administrator';
    const adminRole = String(user?.role || 'admin');

    const navItems = [
        { to: '/admin/dashboard', label: 'Dashboard', icon: Home, badge: null },
        { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, badge: sidebarCounts.orders || null },
        { to: '/admin/products', label: 'Inventory', icon: Package, badge: sidebarCounts.products || null },
        { to: '/admin/users', label: 'Users', icon: Users, badge: sidebarCounts.users || null },
        { to: '/admin/activity', label: 'Activity', icon: Activity, badge: null },
        { to: '/admin/customer-service', label: 'Support', icon: Headphones, badge: sidebarCounts.newConcerns > 0 ? sidebarCounts.newConcerns : null },
        { to: '/admin/account', label: 'Settings', icon: Settings, badge: null },
    ];

    const breadcrumbs = [
        { label: 'Admin', to: '/admin/dashboard' },
        ...(sectionKey === 'dashboard' ? [] : [{ label: section.label, to: location.pathname }]),
    ];

    const loadSidebarCounts = async () => {
        sidebarRequestIdRef.current += 1;
        const requestId = sidebarRequestIdRef.current;

        try {
            const statsResult = await adminService.getStats({ timeout: 5000 });
            if (sidebarRequestIdRef.current !== requestId) {
                return;
            }

            const statsData = statsResult?.data?.data || {};
            const orders = Number(statsData.total_orders || 0);
            const products = Number(statsData.total_products || 0);
            const users = Number(statsData.total_users || 0);
            const newConcerns = Number(statsData.pending_customer_concerns || 0);

            const nextCounts = {
                products,
                orders,
                users,
                newConcerns,
            };

            setSidebarCounts(nextCounts);
            localStorage.setItem(SIDEBAR_CACHE_KEY, JSON.stringify(nextCounts));
        } catch (error) {
            console.error('Sidebar counts error:', error);
        }
    };

    useEffect(() => {
        preloadAllAdminRoutes();
        void loadSidebarCounts();

        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileDropdownOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchDropdownOpen(false);
            }
        };

        const intervalId = window.setInterval(() => {
            void loadSidebarCounts();
        }, SIDEBAR_REFRESH_MS);

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                void loadSidebarCounts();
            }
        };

        const handleSidebarRefresh = () => {
            void loadSidebarCounts();
        };

        document.addEventListener('click', handleClickOutside);
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('sidebar-counts-refresh', handleSidebarRefresh);
        window.addEventListener('profile-updated', handleSidebarRefresh);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('sidebar-counts-refresh', handleSidebarRefresh);
            window.removeEventListener('profile-updated', handleSidebarRefresh);
            clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
        setSearchDropdownOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        if (logoutLoading) {
            return;
        }

        if (!window.confirm('Are you sure you want to logout from admin?')) {
            return;
        }

        setLogoutLoading(true);
        try {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('user_token');
            navigate('/login');
        } catch {
            navigate('/login');
        } finally {
            setLogoutLoading(false);
        }
    };

    const runSearch = async (query) => {
        searchRequestIdRef.current += 1;
        const requestId = searchRequestIdRef.current;

        try {
            const [ordersRes, productsRes, usersRes, concernsRes] = await Promise.all([
                adminService.getAllOrders({
                    params: { q: query, per_page: 4, include_users: true, include_items: false },
                }),
                adminService.getProducts({
                    params: { q: query, per_page: 4 },
                }),
                adminService.getUsers({
                    params: { q: query, per_page: 4 },
                }),
                adminService.getCustomerConcerns({
                    search: query,
                    per_page: 4,
                }),
            ]);

            if (searchRequestIdRef.current !== requestId) {
                return;
            }

            const orders = ordersRes.data?.data?.data || [];
            const products = productsRes.data?.data?.data || [];
            const users = usersRes.data?.data?.data || [];
            const concerns = concernsRes.data?.data?.data || [];

            const results = [
                ...orders.map((order) => ({
                    type: 'order',
                    id: order.id,
                    title: `Order ${order.order_number || `#${order.id}`}`,
                    subtitle: order.user?.name || 'Customer order',
                    route: `/admin/orders/${order.id}`,
                    amount: order.total_amount || order.total,
                })),
                ...products.map((product) => ({
                    type: 'product',
                    id: product.id,
                    title: product.name,
                    subtitle: product.brand ? `${product.brand} • SKU ${product.sku || 'N/A'}` : `SKU ${product.sku || 'N/A'}`,
                    route: `/admin/products/${product.id}`,
                    amount: product.price,
                })),
                ...users.map((customer) => ({
                    type: 'user',
                    id: customer.id,
                    title: customer.name,
                    subtitle: customer.email,
                    route: `/admin/users?search=${encodeURIComponent(customer.email || customer.name || String(customer.id))}`,
                    amount: customer.orders_total_amount,
                })),
                ...concerns.map((concern) => ({
                    type: 'support',
                    id: concern.id,
                    title: concern.subject || `Support request #${concern.id}`,
                    subtitle: concern.name ? `${concern.name} | ${concern.status || 'pending'}` : (concern.status || 'pending'),
                    route: `/admin/customer-service?request=${concern.id}&search=${encodeURIComponent(concern.subject || concern.name || String(concern.id))}`,
                })),
            ].slice(0, 8);

            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            if (searchRequestIdRef.current === requestId) {
                setSearchResults([]);
            }
        } finally {
            if (searchRequestIdRef.current === requestId) {
                setSearchLoading(false);
            }
        }
    };

    const handleSearchChange = (query) => {
        setSearchQuery(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!query.trim()) {
            setSearchLoading(false);
            setSearchResults([]);
            setSearchDropdownOpen(false);
            return;
        }

        setSearchLoading(true);
        setSearchDropdownOpen(true);

        searchTimeoutRef.current = window.setTimeout(() => {
            void runSearch(query.trim());
        }, 250);
    };

    const handleSearchResultClick = (route) => {
        setSearchQuery('');
        setSearchResults([]);
        setSearchDropdownOpen(false);
        navigate(route);
    };

    return (
        <div className={`admin-portal${mobileMenuOpen ? ' is-mobile-open' : ''}`}>
            <button
                type="button"
                className="admin-portal__scrim"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
            />

            <aside className="admin-portal__sidebar">
                <div className="admin-portal__brand">
                    <Link to="/admin/dashboard" className="admin-portal__brand-link">
                        <span className="admin-portal__brand-mark">C</span>
                        <span className="admin-portal__brand-text">
                            <strong>CarVex</strong>
                            <small>Admin Portal</small>
                        </span>
                    </Link>
                </div>

                <nav className="admin-portal__nav" aria-label="Admin navigation">
                    <span className="admin-portal__nav-label">Workspace</span>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onMouseEnter={() => preloadAdminRoute(item.to)}
                                onFocus={() => preloadAdminRoute(item.to)}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`admin-portal__nav-link${isActive ? ' is-active' : ''}`}
                            >
                                <span className="admin-portal__nav-icon">
                                    <Icon size={18} />
                                </span>
                                <span className="admin-portal__nav-text">{item.label}</span>
                                {item.badge ? (
                                    <span className={`admin-portal__nav-badge${item.to === '/admin/customer-service' ? ' is-alert' : ''}`}>
                                        {item.badge}
                                    </span>
                                ) : null}
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>

            <main className="admin-portal__main">
                <header className="admin-portal__header">
                    <div className="admin-portal__header-main">
                        <button
                            type="button"
                            className="admin-portal__menu-toggle"
                            onClick={() => setMobileMenuOpen((open) => !open)}
                            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
                        >
                            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>

                        <div className="admin-portal__title-block">
                            <div className="admin-portal__breadcrumbs">
                                {breadcrumbs.map((crumb, index) => (
                                    <React.Fragment key={`${crumb.label}-${index}`}>
                                        {index > 0 ? <ChevronRight size={14} /> : null}
                                        {index === breadcrumbs.length - 1 ? (
                                            <span>{crumb.label}</span>
                                        ) : (
                                            <Link to={crumb.to}>{crumb.label}</Link>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="admin-portal__heading">
                                <span>{section.eyebrow}</span>
                                <h1>{section.title}</h1>
                                <p>{section.description}</p>
                            </div>
                        </div>
                    </div>

                    <div className="admin-portal__header-actions">
                        <div ref={searchRef} className="admin-portal__search">
                            <Search size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => handleSearchChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && searchResults.length > 0) {
                                        event.preventDefault();
                                        handleSearchResultClick(searchResults[0].route);
                                    }
                                }}
                                onFocus={() => {
                                    if (searchQuery.trim()) {
                                        setSearchDropdownOpen(true);
                                    }
                                }}
                                placeholder="Search orders, parts, customers, or support"
                            />

                            {searchDropdownOpen ? (
                                <div className="admin-portal__search-dropdown">
                                    {searchLoading ? (
                                        <div className="admin-portal__search-state">Searching the admin workspace...</div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="admin-portal__search-state">No matching results found.</div>
                                    ) : (
                                        searchResults.map((result) => (
                                            <button
                                                key={`${result.type}-${result.id}`}
                                                type="button"
                                                className="admin-portal__search-result"
                                                onClick={() => handleSearchResultClick(result.route)}
                                            >
                                                <span className={`admin-portal__search-type admin-portal__search-type--${result.type}`}>
                                                    {result.type === 'order' ? 'ORD' : result.type === 'product' ? 'PRD' : result.type === 'support' ? 'SUP' : 'USR'}
                                                </span>
                                                <span className="admin-portal__search-copy">
                                                    <strong>{result.title}</strong>
                                                    <small>{result.subtitle}</small>
                                                </span>
                                                {result.amount ? (
                                                    <span className="admin-portal__search-amount">
                                                        {currencyFormatter.format(Number(result.amount || 0))}
                                                    </span>
                                                ) : null}
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : null}
                        </div>

                        <Link
                            to="/admin/customer-service"
                            className="admin-portal__icon-button"
                            aria-label="Open support inbox"
                        >
                            <Bell size={18} />
                            {sidebarCounts.newConcerns > 0 ? (
                                <span className="admin-portal__icon-badge">{sidebarCounts.newConcerns}</span>
                            ) : null}
                        </Link>

                        <div ref={profileRef} className="admin-portal__profile">
                            <button
                                type="button"
                                className="admin-portal__profile-button"
                                onClick={() => setProfileDropdownOpen((open) => !open)}
                            >
                                {user?.profile_picture ? (
                                    <img src={user.profile_picture} alt={adminName} className="admin-portal__avatar admin-portal__avatar--image" />
                                ) : (
                                    <span className="admin-portal__avatar">{getInitials(adminName)}</span>
                                )}
                                <span className="admin-portal__profile-meta">
                                    <strong>{adminName}</strong>
                                    <small>{adminRole}</small>
                                </span>
                                <ChevronDown size={16} />
                            </button>

                            {profileDropdownOpen ? (
                                <div className="admin-portal__profile-dropdown">
                                    <Link
                                        to="/admin/account"
                                        className="admin-portal__profile-link"
                                        onClick={() => setProfileDropdownOpen(false)}
                                    >
                                        <Settings size={16} />
                                        <span>Account settings</span>
                                    </Link>
                                    <button
                                        type="button"
                                        className="admin-portal__profile-link is-danger"
                                        onClick={handleLogout}
                                        disabled={logoutLoading}
                                    >
                                        <LogOut size={16} />
                                        <span>{logoutLoading ? 'Logging out...' : 'Logout'}</span>
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </header>

                <div className="admin-portal__content">
                    <Outlet />
                </div>
            </main>

            {logoutLoading ? (
                <div className="admin-portal__overlay">
                    <div className="admin-portal__overlay-card" role="status" aria-live="polite">
                        <span className="cv-skeleton-block" style={{ width: 180, height: 14, margin: '0 auto 12px' }} />
                        <span className="cv-skeleton-block" style={{ width: 124, height: 14, margin: '0 auto' }} />
                        <p>Signing out of the admin workspace...</p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
