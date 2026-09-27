import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { TrendingUp, ShoppingCart, Package, Users, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import PageSkeleton from '../../components/Skeleton';

export default function AdminAnalytics() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await adminService.getSalesReport();
                setStats(res.data?.data?.summary);
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const formatMoney = (value) => `₱${Number(value || 0).toFixed(0)}`;

    if (loading) {
        return <PageSkeleton variant="dashboard" label="Loading sales analytics" />;
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
                        Analytics & Reports
                    </h1>
                    <p style={{ margin: 0, fontSize: '15px', color: '#64748b' }}>
                        Track your business performance and growth metrics
                    </p>
                </div>

                {/* Revenue Overview Cards - Top Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                    {/* Total Revenue */}
                    <div style={{ 
                        background: '#ffffff', 
                        borderRadius: '16px', 
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: '#dcfce7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <DollarSign size={22} color="#16a34a" />
                            </div>
                            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Total Revenue</span>
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                            {formatMoney(stats?.total_revenue)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <ArrowUpRight size={14} color="#16a34a" />
                            <span style={{ color: '#16a34a', fontWeight: 500 }}>+12.5%</span>
                            <span style={{ color: '#94a3b8' }}>from last month</span>
                        </div>
                    </div>

                    {/* Monthly Revenue */}
                    <div style={{ 
                        background: '#ffffff', 
                        borderRadius: '16px', 
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: '#dbeafe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <TrendingUp size={22} color="#3b82f6" />
                            </div>
                            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>This Month</span>
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                            {formatMoney(stats?.current_month_revenue)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <ArrowUpRight size={14} color="#16a34a" />
                            <span style={{ color: '#16a34a', fontWeight: 500 }}>+19.1%</span>
                            <span style={{ color: '#94a3b8' }}>from last month</span>
                        </div>
                    </div>

                    {/* Average Order Value */}
                    <div style={{ 
                        background: '#ffffff', 
                        borderRadius: '16px', 
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: '#fef3c7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <ShoppingCart size={22} color="#f59e0b" />
                            </div>
                            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Avg. Order Value</span>
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                            ₱{stats?.avg_order_value?.toFixed(2) || '0.00'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <ArrowUpRight size={14} color="#16a34a" />
                            <span style={{ color: '#16a34a', fontWeight: 500 }}>+5.3%</span>
                            <span style={{ color: '#94a3b8' }}>from last month</span>
                        </div>
                    </div>
                </div>

                {/* Stats Grid - Second Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                    {/* Total Orders */}
                    <div style={{ 
                        background: '#ffffff', 
                        borderRadius: '16px', 
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <Package size={18} color="#3b82f6" />
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Total Orders</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                            {stats?.total_orders?.toLocaleString() || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>orders processed</div>
                    </div>

                    {/* Total Products */}
                    <div style={{ 
                        background: '#ffffff', 
                        borderRadius: '16px', 
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <Package size={18} color="#8b5cf6" />
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Products</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                            {stats?.total_products?.toLocaleString() || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>in inventory</div>
                    </div>

                    {/* Total Users */}
                    <div style={{ 
                        background: '#ffffff', 
                        borderRadius: '16px', 
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <Users size={18} color="#ec4899" />
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Customers</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                            {stats?.total_users?.toLocaleString() || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>registered users</div>
                    </div>

                    {/* Customer Satisfaction */}
                    <div style={{ 
                        background: '#ffffff', 
                        borderRadius: '16px', 
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '16px' }}>⭐</span>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Satisfaction</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                            94.5%
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                            <ArrowDownRight size={12} />
                            <span>-1.2% from last month</span>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    {/* Revenue Trend */}
                    <div style={{ 
                        background: '#ffffff', 
                        borderRadius: '16px', 
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                                Revenue Trend
                            </h3>
                            <select style={{ 
                                padding: '6px 12px', 
                                fontSize: '13px', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '8px',
                                background: '#ffffff',
                                color: '#64748b'
                            }}>
                                <option>Last 6 Months</option>
                                <option>Last 12 Months</option>
                                <option>This Year</option>
                            </select>
                        </div>
                        <div style={{
                            height: '280px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            borderRadius: '12px',
                            border: '1px dashed #e2e8f0',
                            color: '#94a3b8'
                        }}>
                            <div className="cv-skeleton-chart" role="status" aria-label="Loading revenue chart">
                                {[42, 68, 52, 88, 62, 76, 47, 94].map((height, index) => (
                                    <span
                                        className="cv-skeleton-block"
                                        key={index}
                                        style={{ height: `${height}%` }}
                                        aria-hidden="true"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Products / Quick Stats */}
                    <div style={{ 
                        background: '#ffffff', 
                        borderRadius: '16px', 
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                            Performance Summary
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Conversion Rate</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>3.2%</div>
                                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px' }}>+0.5% from last month</div>
                            </div>
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Cart Abandonment</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>24.8%</div>
                                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px' }}>-2.1% from last month</div>
                            </div>
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Repeat Purchase</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>68.3%</div>
                                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px' }}>+4.2% from last month</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
