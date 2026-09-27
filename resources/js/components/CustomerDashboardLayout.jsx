import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Package, Heart, Wallet, ShoppingCart, Search, Store, MessageSquare, Menu, X, Bell, CheckCircle, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import notificationService from '../services/notificationService';

const notificationDateFormatter = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const formatNotificationTime = (value) => {
    if (!value) {
        return 'Just now';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Just now';
    }

    return notificationDateFormatter.format(parsed);
};

export default function CustomerDashboardLayout() {
    const { user, logout } = useAuth();
    const { cartCount } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [activeNotification, setActiveNotification] = useState(null);
    const [copiedPromoCode, setCopiedPromoCode] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const profileMenuRef = useRef(null);
    const mobileNavRef = useRef(null);
    const notificationMenuRef = useRef(null);
    const isAdminUser = String(user?.role || '').toLowerCase().trim() === 'admin';

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            await logout();
            window.location.href = '/';
        }
    };

    const navItems = [
        { to: '/dashboard', label: 'Dashboard', icon: User, end: true },
        { to: '/dashboard/products', label: 'Products', icon: Store },
        { to: '/dashboard/listings', label: 'My Listings', icon: Tag },
        { to: '/dashboard/orders', label: 'My Purchase', icon: Package },
        { to: '/dashboard/support', label: 'Support', icon: MessageSquare },
        { to: '/dashboard/wishlist', label: 'My Wishlist', icon: Heart },
        { to: '/dashboard/wallet', label: 'Carvex Wallet', icon: Wallet },
    ];

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        const query = searchQuery.trim();
        navigate(query ? `/dashboard/products?search=${encodeURIComponent(query)}` : '/dashboard/products');
    };

    const loadNotifications = async ({ silent = false } = {}) => {
        if (!user || isAdminUser) {
            return;
        }

        try {
            if (!silent) {
                setNotificationLoading(true);
            }

            const res = await notificationService.getNotifications({ limit: 8 });
            const payload = res.data?.data || {};
            setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
            setUnreadNotificationCount(Number(payload.unread_count || 0));
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            if (!silent) {
                setNotificationLoading(false);
            }
        }
    };

    const markNotificationAsReadLocally = (notificationId) => {
        let unreadWasRemoved = false;

        setNotifications((prev) => prev.map((item) => {
            if (item.id !== notificationId || item.read_at) {
                return item;
            }

            unreadWasRemoved = true;
            return {
                ...item,
                read_at: new Date().toISOString(),
            };
        }));

        if (unreadWasRemoved) {
            setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
        }
    };

    const handleOpenNotification = async (notification) => {
        if (!notification) {
            return;
        }

        try {
            if (!notification.read_at) {
                markNotificationAsReadLocally(notification.id);
                await notificationService.markAsRead(notification.id);
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            loadNotifications({ silent: true });
        } finally {
            setNotificationOpen(false);
        }
        setActiveNotification(notification);
    };

    const handleCloseNotificationModal = () => {
        setActiveNotification(null);
        setCopiedPromoCode('');
    };

    const handleOpenNotificationDestination = () => {
        if (!activeNotification) {
            return;
        }

        const targetLink = String(activeNotification.link || '').trim() || '/dashboard/support';
        handleCloseNotificationModal();
        navigate(targetLink);
    };

    const handleCopyPromoCode = async () => {
        const promoCode = String(activeNotification?.promo_code || '').trim();
        if (!promoCode) {
            return;
        }

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(promoCode);
                setCopiedPromoCode(promoCode);
            }
        } catch (error) {
            console.error('Failed to copy promo code:', error);
        }
    };

    const getNotificationActionLabel = (notification) => {
        switch (String(notification?.kind || '').toLowerCase()) {
            case 'order_success':
                return 'Open my orders';
            case 'promo_code':
                return 'Use promo in cart';
            case 'support_reply':
                return 'Open support';
            default:
                return 'Open details';
        }
    };

    const getNotificationModalTone = (notification) => {
        switch (String(notification?.kind || '').toLowerCase()) {
            case 'order_success':
                return 'success';
            case 'promo_code':
                return 'promo';
            default:
                return 'default';
        }
    };

    const handleMarkAllNotificationsRead = async () => {
        if (markingAllNotifications || unreadNotificationCount === 0) {
            return;
        }

        try {
            setMarkingAllNotifications(true);
            await notificationService.markAllAsRead();
            setNotifications((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
            setUnreadNotificationCount(0);
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        } finally {
            setMarkingAllNotifications(false);
        }
    };

    useEffect(() => {
        if (!menuOpen) {
            return undefined;
        }

        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    useEffect(() => {
        if (!notificationOpen) {
            return undefined;
        }

        const handleClickOutside = (event) => {
            if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
                setNotificationOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [notificationOpen]);

    useEffect(() => {
        if (!activeNotification) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                handleCloseNotificationModal();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeNotification]);

    // Close mobile nav when clicking outside
    useEffect(() => {
        if (!mobileNavOpen) {
            return undefined;
        }

        const handleClickOutside = (event) => {
            if (mobileNavRef.current && !mobileNavRef.current.contains(event.target)) {
                setMobileNavOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileNavOpen]);

    useEffect(() => {
        setMenuOpen(false);
        setNotificationOpen(false);
        setMobileNavOpen(false);
    }, [location.pathname, location.search]);

    useEffect(() => {
        if (!user || isAdminUser) {
            setNotifications([]);
            setUnreadNotificationCount(0);
            return undefined;
        }

        loadNotifications();

        const intervalId = window.setInterval(() => {
            loadNotifications({ silent: true });
        }, 30000);

        const handleFocus = () => {
            loadNotifications({ silent: true });
        };

        const handleNotificationRefresh = () => {
            loadNotifications({ silent: true });
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('customer-notifications-refresh', handleNotificationRefresh);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('customer-notifications-refresh', handleNotificationRefresh);
        };
    }, [user?.id, isAdminUser]);

    return (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f5f5f5' }}>
            {/* Top Navbar */}
            <header style={{
                background: '#ffffff',
                borderBottom: '1px solid #e5e7eb',
                padding: '0 2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: '64px',
                    maxWidth: '1400px',
                    margin: '0 auto'
                }}>
                    {/* Logo */}
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ff6b35' }}>carvex</span>
                    </Link>

                    {/* Hamburger Menu Button (Mobile) */}
                    <button
                        type="button"
                        aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        onClick={() => setMobileNavOpen(!mobileNavOpen)}
                        style={{
                            display: 'none',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            color: '#374151'
                        }}
                        className="hamburger-btn"
                    >
                        {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    {/* Desktop Navigation */}
                    <nav className="desktop-nav" style={{ display: 'flex', gap: '1.5rem' }}>
                        {navItems.map((item) => (
                            <NavLink
                                key={`${item.to}-${item.label}`}
                                to={item.to}
                                end={item.end}
                                style={({ isActive }) => ({
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: isActive ? '#ff6b35' : '#374151',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    background: isActive ? '#fff1eb' : 'transparent',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    whiteSpace: 'nowrap'
                                })}
                            >
                                {({ isActive }) => {
                                    const Icon = item.icon;
                                    return (
                                        <>
                                            <Icon size={16} />
                                            <span>{item.label}</span>
                                        </>
                                    );
                                }}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Right side: Search, Cart, Profile */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <form onSubmit={handleSearchSubmit} style={{ display: 'flex' }}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search..."
                            style={{
                                padding: '0.4rem 0.75rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                width: '140px'
                            }}
                        />
                        <button
                            type="submit"
                            aria-label="Search dashboard products"
                            style={{
                                background: '#ff6b35',
                                color: 'white',
                                border: 'none',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                marginLeft: '0.3rem'
                            }}
                        >
                            <Search size={16} />
                        </button>
                    </form>

                    <div className="customer-cart-menu">
                        <Link
                            to="/dashboard/cart"
                            className="customer-panel-icon-link"
                            aria-label="Open cart"
                        >
                            <ShoppingCart size={22} />
                            {cartCount > 0 && (
                                <span className="customer-panel-cart-count">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    <div ref={notificationMenuRef} className="customer-notification-menu">
                        <button
                            type="button"
                            className="customer-panel-icon-link"
                            aria-label="Open notifications"
                            onClick={() => {
                                setNotificationOpen((prev) => !prev);
                                if (!notificationOpen) {
                                    loadNotifications({ silent: true });
                                }
                            }}
                        >
                            <Bell size={20} />
                            {unreadNotificationCount > 0 ? (
                                <span className="customer-panel-cart-count">
                                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                </span>
                            ) : null}
                        </button>

                        {notificationOpen ? (
                            <div className="customer-notification-dropdown">
                                <div className="customer-notification-dropdown__header">
                                    <strong>Notifications</strong>
                                    <span>{unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'All caught up'}</span>
                                </div>

                                <div className="customer-notification-dropdown__list">
                                    {notificationLoading && notifications.length === 0 ? (
                                        <div className="customer-notification-empty" role="status" aria-label="Loading notifications">
                                            <span className="cv-skeleton-block" style={{ width: '70%', height: 13, marginBottom: 8 }} />
                                            <span className="cv-skeleton-block" style={{ width: '48%', height: 11 }} />
                                        </div>
                                    ) : notifications.length === 0 ? (
                                        <p className="customer-notification-empty">No notifications yet. Order updates, admin messages, and promo codes will appear here.</p>
                                    ) : notifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            type="button"
                                            className={`customer-notification-item${notification.read_at ? '' : ' is-unread'}`}
                                            onClick={() => handleOpenNotification(notification)}
                                        >
                                            <div className="customer-notification-item__meta">
                                                <strong>{notification.title || 'Notification'}</strong>
                                                {notification.read_at ? null : <span className="customer-notification-dot" />}
                                            </div>
                                            <p>{notification.message || 'Open this notification to view the latest update.'}</p>
                                            <time>{formatNotificationTime(notification.created_at)}</time>
                                        </button>
                                    ))}
                                </div>

                                <div className="customer-notification-dropdown__footer">
                                    <Link to="/dashboard/support" onClick={() => setNotificationOpen(false)}>
                                        Open support inbox
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleMarkAllNotificationsRead}
                                        disabled={markingAllNotifications || unreadNotificationCount === 0}
                                    >
                                        {markingAllNotifications ? 'Updating...' : 'Mark all read'}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div ref={profileMenuRef} style={{ position: 'relative' }}>
                        <ProfileTrigger user={user} onClick={() => setMenuOpen(!menuOpen)} />

                        {menuOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                minWidth: '150px',
                                zIndex: 1000
                            }}>
                                <Link
                                    to="/dashboard/profile"
                                    style={{
                                        display: 'block',
                                        padding: '0.75rem 1rem',
                                        textDecoration: 'none',
                                        color: '#374151',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Profile
                                </Link>
                                <button
                                    type="button"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        background: 'none',
                                        border: 'none',
                                        color: '#dc2626',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {mobileNavOpen && (
                <div
                    ref={mobileNavRef}
                    style={{
                        display: 'none',
                        position: 'absolute',
                        top: '64px',
                        left: 0,
                        right: 0,
                        background: '#ffffff',
                        borderBottom: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        zIndex: 99,
                        padding: '1rem'
                    }}
                    className="mobile-nav-dropdown"
                >
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {navItems.map((item) => (
                            <NavLink
                                key={`mobile-${item.to}-${item.label}`}
                                to={item.to}
                                end={item.end}
                                onClick={() => setMobileNavOpen(false)}
                                style={({ isActive }) => ({
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: isActive ? '#ff6b35' : '#374151',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    background: isActive ? '#fff1eb' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                })}
                            >
                                {({ isActive }) => {
                                    const Icon = item.icon;
                                    return (
                                        <>
                                            <Icon size={20} />
                                            <span>{item.label}</span>
                                        </>
                                    );
                                }}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            )}
            </header>

            <style>{`
                @media (max-width: 1024px) {
                    .hamburger-btn {
                        display: block !important;
                    }
                    .desktop-nav {
                        display: none !important;
                    }
                    .mobile-nav-dropdown {
                        display: block !important;
                    }
                }
            `}</style>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '1.5rem 2rem' }}>
                <Outlet />
            </main>
        </div>

        {activeNotification ? (
            <div className="customer-notification-modal" onClick={handleCloseNotificationModal}>
                <div
                    className={`customer-notification-modal__panel customer-notification-modal__panel--${getNotificationModalTone(activeNotification)}`}
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="customer-notification-modal__header">
                        <div className="customer-notification-modal__intro">
                            <span className={`customer-notification-modal__eyebrow customer-notification-modal__eyebrow--${getNotificationModalTone(activeNotification)}`}>
                                {activeNotification.kind === 'order_success'
                                    ? 'Successful checkout'
                                    : activeNotification.kind === 'promo_code'
                                        ? 'Promo code'
                                        : 'Notification'}
                            </span>
                            <h2>{activeNotification.title || 'Notification'}</h2>
                            <p>{formatNotificationTime(activeNotification.created_at)}</p>
                        </div>

                        <button
                            type="button"
                            className="customer-notification-modal__close"
                            onClick={handleCloseNotificationModal}
                            aria-label="Close notification"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="customer-notification-modal__body">
                        {activeNotification.kind === 'order_success' ? (
                            <div className="customer-notification-modal__highlight customer-notification-modal__highlight--success">
                                <CheckCircle size={22} />
                                <div>
                                    <strong>{activeNotification.order_number || activeNotification.subject || 'Order received'}</strong>
                                    <span>Your order was placed successfully and is now in processing.</span>
                                </div>
                            </div>
                        ) : null}

                        {activeNotification.kind === 'promo_code' ? (
                            <div className="customer-notification-modal__highlight customer-notification-modal__highlight--promo">
                                <Tag size={22} />
                                <div>
                                    <strong>{activeNotification.promo_code || activeNotification.subject || 'Promo code'}</strong>
                                    <span>Use this code during checkout to claim your discount.</span>
                                </div>
                            </div>
                        ) : null}

                        <div className="customer-notification-modal__message">
                            <p>{activeNotification.full_message || activeNotification.message || 'No extra message was included.'}</p>
                        </div>

                        {activeNotification.promo_code ? (
                            <div className="customer-notification-modal__promo-card">
                                <span>Promo code</span>
                                <strong>{activeNotification.promo_code}</strong>
                                {activeNotification.expires_at ? (
                                    <small>Valid until {formatNotificationTime(activeNotification.expires_at)}</small>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    <div className="customer-notification-modal__footer">
                        {activeNotification.promo_code ? (
                            <button
                                type="button"
                                className="customer-notification-modal__ghost"
                                onClick={handleCopyPromoCode}
                            >
                                {copiedPromoCode === activeNotification.promo_code ? 'Copied' : 'Copy code'}
                            </button>
                        ) : <span />}

                        <div className="customer-notification-modal__actions">
                            <button
                                type="button"
                                className="customer-notification-modal__secondary"
                                onClick={handleCloseNotificationModal}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="customer-notification-modal__primary"
                                onClick={handleOpenNotificationDestination}
                            >
                                {getNotificationActionLabel(activeNotification)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ) : null}
        </>
    );
}

function ProfileTrigger({ user, onClick }) {
    const avatarUrl = useMemo(() => {
        const value = String(user?.avatar_url || '').trim();
        if (!value) return '';
        const timestamp = user?.avatar_updated_at || Date.now();
        return value.includes('?') ? `${value}&t=${timestamp}` : `${value}?t=${timestamp}`;
    }, [user?.avatar_url, user?.avatar_updated_at]);

    return (
        <button
            type="button"
            aria-label={`Open account menu for ${user?.name || 'customer'}`}
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem'
            }}
        >
            <span style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6'
            }}>
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={user?.name || 'Customer'}
                        style={{
                            width: '36px',
                            height: '36px',
                            objectFit: 'cover',
                            borderRadius: '50%'
                        }}
                    />
                ) : (
                    <User size={20} />
                )}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{user?.name || 'Customer'}</span>
        </button>
    );
}
