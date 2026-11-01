import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Package,
    Heart,
    ShoppingCart,
    Search,
    Store,
    Headphones,
    MessageCircle,
    Menu,
    X,
    Bell,
    CheckCircle,
    Tag,
    User,
    LogOut,
    Shield,    ChevronDown,
    ArrowUpRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import notificationService from '../services/notificationService';
import LogoutModal from './LogoutModal';
import messageService from '../services/messageService';

const notificationDateFormatter = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const formatNotificationTime = (value) => {
    if (!value) return 'Just now';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Just now';
    return notificationDateFormatter.format(parsed);
};

export default function CustomerDashboardLayout() {
    const { user, logout, isAdmin } = useAuth();
    const { cartCount } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(() => {
        try {
            return Number(sessionStorage.getItem('carvex_unread_notif_count') || 0);
        } catch {
            return 0;
        }
    });
    const [unreadMessageCount, setUnreadMessageCount] = useState(() => {
        try {
            return Number(sessionStorage.getItem('carvex_unread_msg_count') || 0);
        } catch {
            return 0;
        }
    });
    const [activeNotification, setActiveNotification] = useState(null);
    const [copiedPromoCode, setCopiedPromoCode] = useState('');
    const [purchasesDropdownOpen, setPurchasesDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const profileMenuRef = useRef(null);
    const notificationMenuRef = useRef(null);
    const purchasesMenuRef = useRef(null);

    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const handleLogoutClick = () => {
        setMenuOpen(false);
        setMobileNavOpen(false);
        setLogoutModalOpen(true);
    };

    const handleConfirmLogout = async () => {
        setLogoutLoading(true);
        try {
            await logout();
        } finally {
            window.location.href = '/';
        }
    };

    // My Purchases dropdown grouping (My Purchases, My Listings, My Wishlist)
    const purchasesItems = [
        { to: '/dashboard/orders', label: 'My Purchases', icon: Package },
        { to: '/dashboard/listings', label: 'My Listings', icon: Tag },
        { to: '/dashboard/wishlist', label: 'My Wishlist', icon: Heart },
    ];

    const isPurchasesActive = [
        '/dashboard/orders',
        '/dashboard/listings',
        '/dashboard/wishlist',
    ].some((path) => location.pathname === path || location.pathname.startsWith(path + '/'));

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        const query = searchQuery.trim();
        navigate(query ? `/dashboard/products?search=${encodeURIComponent(query)}` : '/dashboard/products');
    };

    const loadNotifications = async ({ silent = false } = {}) => {
        if (!user || isAdmin) {
            return;
        }

        try {
            if (!silent) setNotificationLoading(true);
            const res = await notificationService.getNotifications({ limit: 8 });
            const payload = res.data?.data || {};
            setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
            const unread = Number(payload.unread_count || 0);
            setUnreadNotificationCount(unread);
            try { sessionStorage.setItem('carvex_unread_notif_count', String(unread)); } catch {}
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            if (!silent) setNotificationLoading(false);
        }
    };

    const loadUnreadMessages = async () => {
        if (!user || isAdmin) {
            return;
        }

        try {
            const res = await messageService.getUnreadCount();
            const unread = Number(res.data?.unread_count || 0);
            setUnreadMessageCount(unread);
            try { sessionStorage.setItem('carvex_unread_msg_count', String(unread)); } catch {}
        } catch (error) {
            // Silently ignore background polling errors
        }
    };

    const markNotificationAsReadLocally = (notificationId) => {
        let unreadWasRemoved = false;
        setNotifications((prev) => prev.map((item) => {
            if (item.id !== notificationId || item.read_at) return item;
            unreadWasRemoved = true;
            return { ...item, read_at: new Date().toISOString() };
        }));
        if (unreadWasRemoved) {
            setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
        }
    };

    const handleOpenNotification = async (notification) => {
        if (!notification) return;
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
        if (!activeNotification) return;
        const targetLink = String(activeNotification.link || '').trim() || '/dashboard/support';
        handleCloseNotificationModal();
        navigate(targetLink);
    };

    const handleCopyPromoCode = async () => {
        const promoCode = String(activeNotification?.promo_code || '').trim();
        if (!promoCode) return;
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
        if (markingAllNotifications || unreadNotificationCount === 0) return;
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

    const handleNavLinkClick = (targetPath) => {
        if (location.pathname === targetPath) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setMobileNavOpen(false);
        setMenuOpen(false);
        setNotificationOpen(false);
        setPurchasesDropdownOpen(false);
    };

    useEffect(() => {
        if (!menuOpen && !notificationOpen && !purchasesDropdownOpen) return undefined;

        const handleOutsideClick = (event) => {
            if (menuOpen && profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
            if (notificationOpen && notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
                setNotificationOpen(false);
            }
            if (purchasesDropdownOpen && purchasesMenuRef.current && !purchasesMenuRef.current.contains(event.target)) {
                setPurchasesDropdownOpen(false);
            }
        };

        const timer = setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 10);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleOutsideClick);
        };
    }, [menuOpen, notificationOpen, purchasesDropdownOpen]);

    useEffect(() => {
        setMenuOpen(false);
        setNotificationOpen(false);
        setMobileNavOpen(false);
        setPurchasesDropdownOpen(false);
    }, [location.pathname, location.search]);

    useEffect(() => {
        if (!user || isAdmin) {
            setNotifications([]);
            setUnreadNotificationCount(0);
            setUnreadMessageCount(0);
            return undefined;
        }
        loadNotifications();
        loadUnreadMessages();
        const intervalId = window.setInterval(() => {
            loadNotifications({ silent: true });
            loadUnreadMessages();
        }, 30000);
        return () => window.clearInterval(intervalId);
    }, [user?.id, isAdmin]);

    const avatarUrl = useMemo(() => {
        const val = String(user?.avatar_url || '').trim();
        return val ? val : '';
    }, [user?.avatar_url]);

    return (
        <div className="customer-portal-root customer-portal-root--navbar">
            {/* Top Customer Navbar */}
            <header className="customer-portal-navbar">
                <div className="customer-portal-navbar__inner">
                    {/* Brand & Mobile Toggle */}
                    <div className="customer-portal-navbar__brand-wrap">
                        <button
                            type="button"
                            className="customer-portal-mobile-toggle"
                            onClick={() => setMobileNavOpen(!mobileNavOpen)}
                            aria-label="Toggle navigation menu"
                        >
                            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                        <Link to="/dashboard" className="customer-portal-brand" aria-label="CarVex Dashboard">
                            <span className="customer-portal-brand-image-wrap">
                                <img src="/images/carvex.png" alt="" className="customer-portal-brand-img" />
                            </span>
                            <div className="customer-portal-brand-text">
                                <strong>CarVex</strong>
                                <small>Customer Portal</small>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Horizontal Navigation Links */}
                    <nav className="customer-portal-navbar__links" aria-label="Customer portal main navigation">
                        <NavLink
                            to="/dashboard"
                            end
                            onClick={() => handleNavLinkClick('/dashboard')}
                            className={({ isActive }) => `customer-portal-nav-pill${isActive ? ' is-active' : ''}`}
                        >
                            <LayoutDashboard size={18} />
                            <span>Dashboard</span>
                        </NavLink>

                        <NavLink
                            to="/dashboard/products"
                            onClick={() => handleNavLinkClick('/dashboard/products')}
                            className={({ isActive }) => `customer-portal-nav-pill${isActive ? ' is-active' : ''}`}
                        >
                            <Store size={18} />
                            <span>Browse Parts</span>
                        </NavLink>

                        {/* My Purchases Dropdown (Includes My Purchases, My Listings, My Wishlist) */}
                        <div
                            ref={purchasesMenuRef}
                            className={`customer-nav-dropdown-wrap${purchasesDropdownOpen ? ' is-open' : ''}`}
                            onMouseEnter={() => setPurchasesDropdownOpen(true)}
                            onMouseLeave={() => setPurchasesDropdownOpen(false)}
                        >
                            <button
                                type="button"
                                className={`customer-portal-nav-pill customer-portal-nav-pill--dropdown${isPurchasesActive ? ' is-active' : ''}`}
                                onClick={() => setPurchasesDropdownOpen((prev) => !prev)}
                                aria-expanded={purchasesDropdownOpen}
                                aria-haspopup="true"
                            >
                                <Package size={18} />
                                <span>My Purchases</span>
                                <ChevronDown size={15} className={`customer-nav-chevron${purchasesDropdownOpen ? ' is-rotated' : ''}`} />
                            </button>

                            {purchasesDropdownOpen && (
                                <div className="customer-nav-dropdown-menu" role="menu">
                                    {purchasesItems.map((item) => {
                                        const ItemIcon = item.icon;
                                        return (
                                            <NavLink
                                                key={item.to}
                                                to={item.to}
                                                className={({ isActive }) => `customer-nav-dropdown-item${isActive ? ' is-active' : ''}`}
                                                onClick={() => handleNavLinkClick(item.to)}
                                                role="menuitem"
                                            >
                                                <span className="customer-nav-dropdown-item__icon">
                                                    <ItemIcon size={18} />
                                                </span>
                                                <span className="customer-nav-dropdown-item__label">{item.label}</span>
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <NavLink
                            to="/dashboard/support"
                            onClick={() => handleNavLinkClick('/dashboard/support')}
                            className={({ isActive }) => `customer-portal-nav-pill${isActive ? ' is-active' : ''}`}
                        >
                            <Headphones size={18} />
                            <span>Support</span>
                        </NavLink>
                    </nav>

                    {/* Right-Hand Tools & Profile Actions */}
                    <div className="customer-portal-navbar__actions">
                        <form onSubmit={handleSearchSubmit} className="customer-portal-search-compact" role="search">
                            <Search size={15} className="search-icon" aria-hidden="true" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search parts, orders..."
                                aria-label="Search catalog"
                            />
                        </form>

                        {/* Switch to Admin (if user is admin) */}
                        {isAdmin && (
                            <Link
                                to="/admin/dashboard"
                                className="customer-portal-admin-switcher"
                                title="Switch to Admin Panel"
                            >
                                <Shield size={14} />
                                <span>Admin Panel</span>
                            </Link>
                        )}

                        {/* Cart */}
                        <Link to="/dashboard/cart" className="customer-portal-icon-btn" title="View Cart">
                            <ShoppingCart size={19} aria-hidden="true" />
                            {cartCount > 0 && (
                                <span className="customer-portal-badge">{cartCount > 99 ? '99+' : cartCount}</span>
                            )}
                        </Link>

                        {/* Notifications with prominent badge */}
                        <div ref={notificationMenuRef} className="customer-portal-notif-wrap">
                            <button
                                type="button"
                                className="customer-portal-icon-btn"
                                onClick={() => {
                                    setNotificationOpen((prev) => !prev);
                                    if (!notificationOpen) loadNotifications({ silent: true });
                                }}
                                title={unreadNotificationCount > 0 ? `${unreadNotificationCount} unread notification(s)` : 'Notifications'}
                                aria-label="Notifications"
                            >
                                <Bell size={19} aria-hidden="true" />
                                {unreadNotificationCount > 0 && (
                                    <span className="customer-portal-badge" aria-label={`${unreadNotificationCount} notifications`}>
                                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                    </span>
                                )}
                            </button>

                            {notificationOpen && (
                                <div className="customer-notification-dropdown">
                                    <div className="customer-notification-dropdown__header">
                                        <strong>Notifications</strong>
                                        <span>{unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'All caught up'}</span>
                                    </div>
                                    <div className="customer-notification-dropdown__list">
                                        {notificationLoading && notifications.length === 0 ? (
                                            <div className="customer-notification-empty">Loading notifications...</div>
                                        ) : notifications.length === 0 ? (
                                            <p className="customer-notification-empty">No notifications yet.</p>
                                        ) : (
                                            notifications.map((notification) => (
                                                <button
                                                    key={notification.id}
                                                    type="button"
                                                    className={`customer-notification-item${notification.read_at ? '' : ' is-unread'}`}
                                                    onClick={() => handleOpenNotification(notification)}
                                                >
                                                    <div className="customer-notification-item__meta">
                                                        <strong>{notification.title || 'Notification'}</strong>
                                                        {!notification.read_at && <span className="customer-notification-dot" />}
                                                    </div>
                                                    <p>{notification.message}</p>
                                                    <time>{formatNotificationTime(notification.created_at)}</time>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                    <div className="customer-notification-dropdown__footer">
                                        <Link to="/dashboard/support" onClick={() => setNotificationOpen(false)}>
                                            Open support
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
                            )}
                        </div>

                        {/* Profile Dropdown: Includes Profile Settings, Messages (with badge), and Logout */}
                        <div ref={profileMenuRef} className="customer-portal-profile-wrap">
                            <button
                                type="button"
                                className="customer-portal-profile-trigger"
                                onClick={() => setMenuOpen(!menuOpen)}
                                aria-label="Account menu"
                            >
                                <span className="customer-portal-avatar-thumb">
                                    {avatarUrl ? <img src={avatarUrl} alt="" /> : <User size={16} />}
                                    {unreadMessageCount > 0 && (
                                        <span className="customer-portal-avatar-badge" title={`${unreadMessageCount} new message(s)`} />
                                    )}
                                </span>
                                <span className="customer-portal-username">{user?.name?.split(' ')[0] || 'Account'}</span>
                                {unreadMessageCount > 0 && (
                                    <span className="customer-portal-badge customer-portal-badge--small" title={`${unreadMessageCount} new message(s)`}>
                                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                                    </span>
                                )}
                            </button>

                            {menuOpen && (
                                <div className="customer-profile-dropdown" style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '0.5rem',
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                    minWidth: '190px',
                                    padding: '0.4rem 0',
                                    zIndex: 1000
                                }}>
                                    <Link to="/dashboard/profile" className="customer-profile-dropdown-link" onClick={() => setMenuOpen(false)}>
                                        <User size={15} style={{ marginRight: '8px', opacity: 0.7 }} />
                                        <span>Profile Settings</span>
                                    </Link>
                                    <Link to="/dashboard/messages" className="customer-profile-dropdown-link customer-profile-dropdown-link--messages" onClick={() => setMenuOpen(false)}>
                                        <MessageCircle size={15} style={{ marginRight: '8px', opacity: 0.7 }} />
                                        <span>Messages</span>
                                        {unreadMessageCount > 0 && (
                                            <span className="customer-profile-badge">
                                                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                                            </span>
                                        )}
                                    </Link>
                                    <a href="/" target="_blank" rel="noopener noreferrer" className="customer-profile-dropdown-link" onClick={() => setMenuOpen(false)}>
                                        <Store size={15} style={{ marginRight: '8px', opacity: 0.7 }} />
                                        <span>Browse Public Store</span>
                                        <ArrowUpRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                                    </a>
                                    <button
                                        type="button"
                                        className="customer-profile-dropdown-link customer-profile-dropdown-link--danger"
                                        onClick={handleLogoutClick}
                                    >
                                        <LogOut size={14} style={{ marginRight: '8px' }} />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer Navigation */}
            {mobileNavOpen && (
                <>
                    <div
                        className="customer-portal-scrim"
                        onClick={() => setMobileNavOpen(false)}
                        aria-hidden="true"
                    />
                    <aside className="customer-portal-drawer is-open" aria-label="Mobile navigation">
                        <div className="customer-portal-drawer__header">
                            <Link to="/dashboard" className="customer-portal-brand" onClick={() => setMobileNavOpen(false)}>
                                <span className="customer-portal-brand-image-wrap">
                                    <img src="/images/carvex.png" alt="" className="customer-portal-brand-img" />
                                </span>
                                <div className="customer-portal-brand-text">
                                    <strong>CarVex</strong>
                                    <small>Customer Portal</small>
                                </div>
                            </Link>
                            <button
                                type="button"
                                className="customer-portal-drawer-close"
                                onClick={() => setMobileNavOpen(false)}
                                aria-label="Close menu"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="customer-portal-user-card">
                            <span className="customer-portal-user-avatar">
                                {avatarUrl ? <img src={avatarUrl} alt="" /> : <User size={18} />}
                            </span>
                            <div className="customer-portal-user-info">
                                <strong>{user?.name || 'Customer'}</strong>
                                <small>{user?.email || 'Verified Account'}</small>
                            </div>
                        </div>

                        <nav className="customer-portal-drawer__nav">
                            <NavLink
                                to="/dashboard"
                                end
                                onClick={() => setMobileNavOpen(false)}
                                className={({ isActive }) => `customer-portal-drawer-link${isActive ? ' is-active' : ''}`}
                            >
                                <LayoutDashboard size={20} />
                                <span>Dashboard</span>
                            </NavLink>

                            <NavLink
                                to="/dashboard/products"
                                onClick={() => setMobileNavOpen(false)}
                                className={({ isActive }) => `customer-portal-drawer-link${isActive ? ' is-active' : ''}`}
                            >
                                <Store size={20} />
                                <span>Browse Parts</span>
                            </NavLink>

                            <div className="customer-portal-drawer__section-title">
                                <span>Purchases & Activity</span>
                            </div>

                            <NavLink
                                to="/dashboard/orders"
                                onClick={() => setMobileNavOpen(false)}
                                className={({ isActive }) => `customer-portal-drawer-link${isActive ? ' is-active' : ''}`}
                            >
                                <Package size={20} />
                                <span>My Purchases</span>
                            </NavLink>

                            <NavLink
                                to="/dashboard/listings"
                                onClick={() => setMobileNavOpen(false)}
                                className={({ isActive }) => `customer-portal-drawer-link${isActive ? ' is-active' : ''}`}
                            >
                                <Tag size={20} />
                                <span>My Listings</span>
                            </NavLink>

                            <NavLink
                                to="/dashboard/wishlist"
                                onClick={() => setMobileNavOpen(false)}
                                className={({ isActive }) => `customer-portal-drawer-link${isActive ? ' is-active' : ''}`}
                            >
                                <Heart size={20} />
                                <span>My Wishlist</span>
                            </NavLink>

                            <div className="customer-portal-drawer__section-title">
                                <span>Help & Messages</span>
                            </div>

                            <NavLink
                                to="/dashboard/support"
                                onClick={() => setMobileNavOpen(false)}
                                className={({ isActive }) => `customer-portal-drawer-link${isActive ? ' is-active' : ''}`}
                            >
                                <Headphones size={20} />
                                <span>Support</span>
                            </NavLink>

                            {/* Messages in Mobile Drawer */}
                            <NavLink
                                to="/dashboard/messages"
                                onClick={() => setMobileNavOpen(false)}
                                className={({ isActive }) => `customer-portal-drawer-link${isActive ? ' is-active' : ''}`}
                            >
                                <MessageCircle size={20} />
                                <span>Messages</span>
                                {unreadMessageCount > 0 && (
                                    <span className="customer-profile-badge" style={{ marginLeft: 'auto' }}>
                                        {unreadMessageCount}
                                    </span>
                                )}
                            </NavLink>
                        </nav>

                        <div className="customer-portal-drawer__footer">
                            <a href="/" target="_blank" rel="noopener noreferrer" className="customer-portal-drawer-store-btn" onClick={() => setMobileNavOpen(false)}>
                                <Store size={18} />
                                <span>Browse Public Store</span>
                                <ArrowUpRight size={16} style={{ marginLeft: 'auto' }} />
                            </a>
                            <button type="button" className="customer-portal-logout-btn" onClick={handleLogoutClick}>
                                <LogOut size={16} />
                                <span>Log Out</span>
                            </button>
                        </div>
                    </aside>
                </>
            )}

            {/* Main Content View with comfortable fit */}
            <main className="customer-portal-main-content">
                <div className="customer-portal-content-container">
                    <Outlet />
                </div>
            </main>

            {/* Notification Detail Modal */}
            {activeNotification && (
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
                                <h2>{activeNotification.title || 'Notification details'}</h2>
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
                            <p className="customer-notification-modal__message">{activeNotification.message}</p>
                            {activeNotification.promo_code && (
                                <div className="customer-notification-promo-box">
                                    <span className="customer-notification-promo-box__label">Your Promo Code</span>
                                    <div className="customer-notification-promo-box__row">
                                        <code>{activeNotification.promo_code}</code>
                                        <button type="button" onClick={handleCopyPromoCode}>
                                            {copiedPromoCode === activeNotification.promo_code ? (
                                                <><CheckCircle size={15} /> Copied</>
                                            ) : (
                                                'Copy'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="customer-notification-modal__actions">
                            <button type="button" className="customer-notification-modal__cta" onClick={handleOpenNotificationDestination}>
                                {getNotificationActionLabel(activeNotification)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        
            {/* Logout Confirmation Modal with Loading State */}
            <LogoutModal
                isOpen={logoutModalOpen}
                onClose={() => !logoutLoading && setLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                isLoading={logoutLoading}
            />
        </div>
    );
}
