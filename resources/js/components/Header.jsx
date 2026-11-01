import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Menu, Shield, ShoppingCart, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LogoutModal from './LogoutModal';

const navGroups = [
    { label: 'Home', to: '/' },
    { label: 'Products', to: '/products' },
    { label: 'Featured', to: '/#landing-deals', hash: 'landing-deals' },
    { label: 'Support', to: '/customer-service' },
];

export default function Header() {
    const { isAuthenticated, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [isScrolled, setIsScrolled] = useState(() => (
        typeof window !== 'undefined' && window.scrollY > 12
    ));
    const navRef = useRef(null);
    const menuToggleRef = useRef(null);
    const cartPath = isAuthenticated && !isAdmin ? '/dashboard/cart' : '/cart';
    const accountPath = isAuthenticated ? (isAdmin ? '/admin/dashboard' : '/dashboard') : '/login';

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname, location.search, location.hash]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 12);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!menuOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
                const isMobile = window.matchMedia('(max-width: 940px)').matches;
                if (isMobile) menuToggleRef.current?.focus();
            }
        };

        const handlePointerDown = (event) => {
            if (!navRef.current?.contains(event.target) && !menuToggleRef.current?.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [menuOpen]);

    const activeLabel = () => {
        const hash = location.hash.replace(/^#/, '');
        const activeHash = navGroups.find((item) => item.hash === hash);
        if (activeHash && location.pathname === '/') return activeHash.label;
        if (location.pathname.startsWith('/products')) return 'Products';
        if (location.pathname === '/customer-service') return 'Support';
        if (location.pathname === '/') return 'Home';
        return '';
    };

    const active = activeLabel();

    const handleHomeClick = (event) => {
        if (location.pathname === '/') {
            event.preventDefault();
            if (window.location.hash) {
                navigate('/', { replace: true });
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setMenuOpen(false);
    };

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const handleLogoutClick = () => {
        setMenuOpen(false);
        setLogoutModalOpen(true);
    };

    const handleConfirmLogout = () => {
        setLogoutLoading(true);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_validated_at');
        setTimeout(() => {
            window.location.href = '/';
        }, 400);
    };

    const headerClasses = [
        'site-header',
        'site-header--light-surface',
        isScrolled ? 'is-scrolled' : '',
        menuOpen ? 'is-menu-open' : '',
    ].filter(Boolean).join(' ');

    return (
        <header className={headerClasses}>
            <div className="header-inner">
                <Link to="/" className="brand-logo" aria-label="CarVex home" onClick={handleHomeClick}>
                    <span className="brand-logo-image-wrap">
                        <img src="/images/carvex.png" className="brand-logo-image" alt="" />
                    </span>
                    <span className="brand-logo-copy"><strong>CarVex</strong><small>Auto parts</small></span>
                </Link>

                <nav ref={navRef} id="primary-navigation" className="header-nav" aria-label="Primary navigation">
                    {navGroups.map((item) => {
                        const isActive = active === item.label;
                        return (
                            <Link
                                key={item.label}
                                to={item.to}
                                className={`nav-link${isActive ? ' active' : ''}`}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={item.label === 'Home' ? handleHomeClick : closeMenu}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="header-actions">
                    <Link to={cartPath} className="header-cart-action" aria-label="Shopping cart" onClick={closeMenu}>
                        <ShoppingCart size={18} aria-hidden="true" /> <span>Cart</span>
                    </Link>
                    {isAuthenticated ? (
                        <>
                            {isAdmin && (
                                <Link
                                    to="/admin/dashboard"
                                    className="header-admin-action"
                                    onClick={closeMenu}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'linear-gradient(135deg, #ff1c1c 0%, #d80000 100%)',
                                        color: '#ffffff',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        textDecoration: 'none',
                                        boxShadow: '0 2px 8px rgba(216,0,0,0.25)',
                                    }}
                                >
                                    <Shield size={15} aria-hidden="true" />
                                    <span>Admin Panel</span>
                                </Link>
                            )}
                            <Link to={accountPath} className="header-account-action" onClick={closeMenu}>
                                <UserRound size={17} aria-hidden="true" /><span>{isAdmin ? 'Dashboard' : 'Account'}</span>
                            </Link>
                            <button type="button" className="action-link action-link--logout" onClick={handleLogoutClick}>
                                <LogOut size={16} aria-hidden="true" /> <span>Log out</span>
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="action-link action-link--login" onClick={closeMenu}>
                            <LogIn size={16} aria-hidden="true" /> <span>Log in</span>
                        </Link>
                    )}
                    <button
                        ref={menuToggleRef}
                        type="button"
                        className="mobile-menu-toggle"
                        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-controls="primary-navigation"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                    </button>
                </div>
            </div>
        <LogoutModal
                isOpen={logoutModalOpen}
                onClose={() => !logoutLoading && setLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                isLoading={logoutLoading}
            />
        </header>
    );
}
