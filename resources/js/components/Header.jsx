import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navGroups = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/products' },
    { label: 'Categories', to: '/#landing-categories', hash: 'landing-categories' },
    { label: 'Deals', to: '/#landing-deals', hash: 'landing-deals' },
    { label: 'Contact', to: '/#landing-contact', hash: 'landing-contact' },
];

export default function Header() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuToggleRef = useRef(null);

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname, location.search, location.hash]);

    useEffect(() => {
        if (!menuOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
                menuToggleRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [menuOpen]);

    const activeLabel = () => {
        const hash = location.hash.replace(/^#/, '');
        const activeHash = navGroups.find((item) => item.hash === hash);
        if (activeHash && location.pathname === '/') return activeHash.label;
        if (location.pathname.startsWith('/products')) return 'Shop';
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
        if (menuOpen) menuToggleRef.current?.focus();
    };

    const closeMenu = () => {
        setMenuOpen(false);
        if (menuOpen) menuToggleRef.current?.focus();
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_validated_at');
        window.location.href = '/';
    };

    return (
        <header className={`site-header${menuOpen ? ' is-menu-open' : ''}`}>
            <div className="header-inner">
                <Link to="/" className="brand-logo" aria-label="CarVex home" onClick={handleHomeClick}>
                    <span className="brand-logo-image-wrap">
                        <img src="/images/carvex.png" className="brand-logo-image" alt="" />
                    </span>
                    <span className="brand-logo-copy"><strong>CarVex</strong><small>Auto parts</small></span>
                </Link>

                <nav id="primary-navigation" className="header-nav" aria-label="Primary navigation">
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
                    {isAuthenticated ? (
                        <button type="button" className="action-link action-link--logout" onClick={handleLogout}>
                            <LogOut size={17} aria-hidden="true" /> <span>Log out</span>
                        </button>
                    ) : (
                        <Link to="/login" className="action-link action-link--login" onClick={closeMenu}>
                            <LogIn size={17} aria-hidden="true" /> <span>Log in</span>
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
        </header>
    );
}
