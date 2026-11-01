import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ShoppingBag,
    Wallet,
    Package,
    ArrowRight,
    Headphones,
    Flag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import orderService from '../../services/orderService';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const getCachedStats = (userId) => {
    if (!userId) return null;
    try {
        const raw = localStorage.getItem(`carvex_overview_stats_${userId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.totalOrders === 'number') {
            return parsed;
        }
    } catch {
        // Storage access error
    }
    return null;
};

export default function Overview() {
    const { user } = useAuth();
    const { cartItems } = useCart();
    const [orderStats, setOrderStats] = useState(() => getCachedStats(user?.id) || { totalOrders: 0, totalSpent: 0 });
    const [error, setError] = useState('');

    const firstName = useMemo(() => {
        const name = String(user?.name || '').trim();
        return name ? name.split(' ')[0] : 'Member';
    }, [user?.name]);

    useEffect(() => {
        const cached = getCachedStats(user?.id);
        if (cached) {
            setOrderStats(cached);
        }
    }, [user?.id]);

    useEffect(() => {
        let mounted = true;

        const fetchDashboardData = async () => {
            setError('');
            try {
                let totalOrders = 0;
                let totalSpent = 0;

                try {
                    const summaryRes = await orderService.getOrderSummary();
                    const summary = summaryRes.data?.data || {};
                    totalOrders = Number(summary.total_orders || 0);
                    totalSpent = Number(summary.total_spent || 0);
                } catch {
                    const ordersRes = await orderService.getMyOrders();
                    const orders = ordersRes.data?.data?.data || ordersRes.data?.data || [];
                    totalOrders = Array.isArray(orders) ? orders.length : 0;
                    totalSpent = Array.isArray(orders)
                        ? orders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0)
                        : 0;
                }

                if (mounted) {
                    const nextStats = { totalOrders, totalSpent };
                    setOrderStats(nextStats);
                    if (user?.id) {
                        try {
                            localStorage.setItem(`carvex_overview_stats_${user.id}`, JSON.stringify(nextStats));
                        } catch {
                            // Ignore storage error
                        }
                    }
                }
            } catch (fetchError) {
                if (mounted) {
                    setError('Could not sync latest stats. Local summary is shown.');
                }
            }
        };

        void fetchDashboardData();
        return () => {
            mounted = false;
        };
    }, [user?.id]);

    const quickLinks = [
        {
            to: '/dashboard/products',
            title: 'Browse Parts',
            subtitle: 'Find the right parts',
            image: '/images/quick-brake.png',
            alt: 'Brake Rotor',
        },
        {
            to: '/dashboard/listings',
            title: 'My Listings',
            subtitle: 'Manage your listings',
            image: '/images/quick-tag.png',
            alt: 'My Listings',
        },
        {
            to: '/dashboard/wishlist',
            title: 'My Wishlist',
            subtitle: 'Save your favorite items',
            image: '/images/quick-heart.png',
            alt: 'Wishlist',
        },
        {
            to: '/dashboard/orders',
            title: 'My Purchases',
            subtitle: 'Track your orders',
            image: '/images/quick-cart.png',
            alt: 'Purchases',
        },
        {
            to: '/dashboard/support',
            title: 'Support',
            subtitle: 'Get help and assistance',
            image: '/images/quick-headset.png',
            alt: 'Support',
        },
        {
            to: '/dashboard/support',
            title: 'Need a hand?',
            subtitle: 'Contact CarVex support',
            image: '/images/quick-car.png',
            alt: 'CarVex Support',
        },
    ];

    return (
        <div className="overview-page-wrapper">
            {/* HERO BANNER - White Mitsubishi Lancer Evolution X with dynamic red diagonal stripes */}
            <section className="overview-hero-card" aria-label="Welcome banner">
                <div className="overview-hero-content">
                    <span className="overview-hero-eyebrow">YOUR CARVEX ACCOUNT</span>
                    <h1 className="overview-hero-title">
                        Welcome back, <span className="overview-hero-highlight">{firstName}</span>
                    </h1>
                    <p className="overview-hero-subtitle">
                        Keep track of your purchases, saved parts, and seller listings.
                    </p>
                    <div className="overview-hero-accent-bar" aria-hidden="true" />
                </div>

                <div className="overview-hero-image-wrap" aria-hidden="true">
                    <img
                        src="/images/overview-hero-car.png"
                        alt="CarVex Performance Car"
                        className="overview-hero-car-img"
                    />
                </div>
            </section>

            {/* 3 STAT CARDS (Purchases, Total spent, Items in cart) */}
            <section className="overview-stats-grid" aria-label="Account statistics">
                {/* Purchases */}
                <article className="overview-stat-card">
                    <div className="overview-stat-icon-wrap">
                        <ShoppingBag size={24} className="overview-stat-icon" />
                    </div>
                    <div className="overview-stat-data">
                        <span className="overview-stat-label">Purchases</span>
                        <strong className="overview-stat-value">{orderStats.totalOrders}</strong>
                    </div>
                    <Link to="/dashboard/orders" className="overview-stat-action">
                        View history <ArrowRight size={14} />
                    </Link>
                </article>

                {/* Total spent */}
                <article className="overview-stat-card">
                    <div className="overview-stat-icon-wrap">
                        <Wallet size={24} className="overview-stat-icon" />
                    </div>
                    <div className="overview-stat-data">
                        <span className="overview-stat-label">Total spent</span>
                        <strong className="overview-stat-value">{currencyFormatter.format(orderStats.totalSpent)}</strong>
                    </div>
                    <Link to="/dashboard/orders" className="overview-stat-action">
                        View details <ArrowRight size={14} />
                    </Link>
                </article>

                {/* Items in cart */}
                <article className="overview-stat-card">
                    <div className="overview-stat-icon-wrap">
                        <Package size={24} className="overview-stat-icon" />
                    </div>
                    <div className="overview-stat-data">
                        <span className="overview-stat-label">Items in cart</span>
                        <strong className="overview-stat-value">{cartItems?.length || 0}</strong>
                    </div>
                    <Link to="/dashboard/cart" className="overview-stat-action">
                        Go to cart <ArrowRight size={14} />
                    </Link>
                </article>
            </section>

            {/* QUICK LINKS SECTION */}
            <section className="overview-quick-links-section" aria-labelledby="quick-links-heading">
                <header className="overview-quick-links-header">
                    <div className="overview-quick-links-title-wrap">
                        <span className="overview-quick-links-bar" aria-hidden="true" />
                        <h2 id="quick-links-heading">Quick Links</h2>
                    </div>
                    <span className="overview-quick-links-tagline">Your car parts hub at your fingertips</span>
                </header>

                <div className="overview-quick-links-grid">
                    {quickLinks.map((item) => (
                        <Link key={item.title} to={item.to} className="overview-quick-link-card">
                            <div className="overview-quick-link-visual">
                                <img src={item.image} alt={item.alt} />
                            </div>
                            <div className="overview-quick-link-info">
                                <strong>{item.title}</strong>
                                <small>{item.subtitle}</small>
                            </div>
                            <div className="overview-quick-link-arrow" aria-hidden="true">
                                <ArrowRight size={16} />
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* BOTTOM DARK FOOTER RIBBON */}
            <footer className="overview-bottom-ribbon">
                <div className="overview-bottom-ribbon__brand">
                    <div className="overview-checkered-flag" aria-hidden="true">
                        🏁
                    </div>
                    <strong>CarVex</strong>
                    <span className="overview-ribbon-divider">|</span>
                    <span className="overview-ribbon-slogan">Auto parts. Helpful support.</span>
                </div>
                <Link to="/dashboard/support" className="overview-bottom-ribbon__btn">
                    <Headphones size={16} />
                    <span>Open support</span>
                    <ArrowRight size={14} />
                </Link>
            </footer>
        </div>
    );
}
