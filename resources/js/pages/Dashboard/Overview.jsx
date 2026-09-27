import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ShoppingBag, Package, User, MessageSquare } from 'lucide-react';
import orderService from '../../services/orderService';

export default function Overview() {
    const { user } = useAuth();
    const { cartItems } = useCart();
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalSpent: 0,
        cartItems: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const ordersRes = await orderService.getMyOrders();
                const orders = ordersRes.data?.data?.data || ordersRes.data?.data || [];
                const totalSpent = orders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);

                setStats({
                    totalOrders: orders.length,
                    totalSpent: totalSpent,
                    cartItems: cartItems?.length || 0,
                });
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [cartItems]);

    return (
        <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Dashboard
                </h1>
                <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                    Welcome back, <strong>{user?.name || 'Customer'}</strong>
                </p>
            </div>

            {/* Stats Row */}
            <div aria-busy={loading} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Total Orders
                            </p>
                            <h3 style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>{loading ? <span className="cv-skeleton-block cv-skeleton-stat" aria-hidden="true" /> : stats.totalOrders}</h3>
                        </div>
                        <Package size={32} color="#f97316" opacity={0.2} />
                    </div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Total Spent
                            </p>
                            <h3 style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>{loading ? <span className="cv-skeleton-block cv-skeleton-stat" aria-hidden="true" /> : `₱${stats.totalSpent.toFixed(2)}`}</h3>
                        </div>
                        <ShoppingBag size={32} color="#f97316" opacity={0.2} />
                    </div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Cart Items
                            </p>
                            <h3 style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>{loading ? <span className="cv-skeleton-block cv-skeleton-stat" aria-hidden="true" /> : stats.cartItems}</h3>
                        </div>
                        <ShoppingBag size={32} color="#f97316" opacity={0.2} />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Quick Actions
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    <Link to="/dashboard/orders" style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 160ms ease', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#f97316';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(249, 115, 22, 0.15)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <Package size={24} color="#f97316" style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>My Orders</p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Track & manage</p>
                        </div>
                    </Link>

                    <Link to="/dashboard/products" style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 160ms ease', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#f97316';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(249, 115, 22, 0.15)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <ShoppingBag size={24} color="#f97316" style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Shop</p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Browse parts</p>
                        </div>
                    </Link>

                    <Link to="/dashboard/cart" style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 160ms ease', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#f97316';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(249, 115, 22, 0.15)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <ShoppingBag size={24} color="#f97316" style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Cart</p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>View items</p>
                        </div>
                    </Link>

                    <Link to="/dashboard/profile" style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 160ms ease', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#f97316';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(249, 115, 22, 0.15)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <User size={24} color="#f97316" style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Profile</p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Dashboard</p>
                        </div>
                    </Link>

                    <Link to="/dashboard/support" style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 160ms ease', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#f97316';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(249, 115, 22, 0.15)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <MessageSquare size={24} color="#f97316" style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Support</p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Message admin</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Featured Section */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Need Help?
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
                    Have questions about your orders or account? Our support team is here to help you 24/7.
                </p>
                <Link
                    to="/dashboard/support"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(180deg, #fb923c 0%, #f97316 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                    }}
                >
                    Contact Support
                </Link>
            </div>
        </div>
    );
}
