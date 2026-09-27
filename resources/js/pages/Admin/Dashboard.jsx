import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowRight,
    ClipboardCheck,
    CircleDollarSign,
    Headphones,
    Package,
    ShoppingBag,
    Users,
} from 'lucide-react';
import adminService from '../../services/adminService';
import PageSkeleton from '../../components/Skeleton';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});

const compactNumberFormatter = new Intl.NumberFormat('en-PH', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

const getStatusBadgeClass = (status) => {
    switch (String(status || '').toLowerCase()) {
        case 'processing':
            return 'badge-warning';
        case 'shipped':
            return 'badge-info';
        case 'delivered':
        case 'active':
            return 'badge-success';
        case 'cancelled':
        case 'inactive':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
};

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            setLoading(true);
            setError('');

            try {
                const statsRes = await adminService.getStats();

                if (!mounted) {
                    return;
                }

                setStats(statsRes.data?.data || {});
            } catch (loadError) {
                console.error('Failed to load dashboard data:', loadError);
                if (mounted) {
                    setError('We could not load the admin dashboard right now.');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void loadData();

        return () => {
            mounted = false;
        };
    }, []);

    if (loading) {
        return <PageSkeleton variant="dashboard" label="Loading admin dashboard" />;
    }

    if (error || !stats) {
        return (
            <div className="admin-page">
                <div className="admin-workspace">
                    <div className="admin-status-card admin-status-card--error">
                        <h3>Dashboard unavailable</h3>
                        <p>{error || 'The dashboard could not be loaded.'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const totalRevenue = Number(stats.total_revenue || 0);
    const totalOrders = Number(stats.total_orders || 0);
    const totalProducts = Number(stats.total_products || 0);
    const totalUsers = Number(stats.total_users || 0);
    const pendingConcerns = Number(stats.pending_customer_concerns || 0);
    const pendingSellerListings = Number(stats.pending_seller_listings || stats.pending_listings || 0);
    const lowStockCount = Number(stats.low_stock_count || 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const recentOrders = stats.recent_orders || [];
    const recentUsers = stats.recent_users || [];
    const recentCustomers = recentUsers.filter((user) => String(user?.role || '').toLowerCase() !== 'admin');
    const lowStockWatchlist = (stats.low_stock_products || []).filter((product) => Number(product.stock || 0) <= 10);
    const activityFeed = stats.recent_activities || [];

    const ordersRoute = '/admin/orders';
    const productsRoute = '/admin/products';
    const lowStockRoute = '/admin/products?stock=low&source=dashboard';
    const supportRoute = '/admin/customer-service';
    const activityRoute = '/admin/activity';
    const usersRoute = '/admin/users';

    const primaryCards = [
        {
            icon: ShoppingBag,
            label: 'Orders in motion',
            value: compactNumberFormatter.format(totalOrders),
            meta: `${recentOrders.length} recent orders are ready for review.`,
            to: ordersRoute,
            action: 'Open orders',
            color: 'blue',
        },
        {
            icon: AlertTriangle,
            label: 'Low stock alert',
            value: compactNumberFormatter.format(lowStockCount),
            meta: lowStockCount > 0 ? 'Open the exact products that need restocking.' : 'Inventory is stable right now.',
            to: lowStockRoute,
            action: 'View low stock products',
            color: lowStockCount > 0 ? 'amber' : 'green',
        },
        {
            icon: ClipboardCheck,
            label: 'Seller listings to review',
            value: compactNumberFormatter.format(pendingSellerListings),
            meta: pendingSellerListings > 0 ? 'New parts are waiting for an admin decision.' : 'No seller listings are waiting for review.',
            to: activityRoute,
            action: 'Open review queue',
            color: pendingSellerListings > 0 ? 'amber' : 'green',
        },
        {
            icon: Headphones,
            label: 'Customer support',
            value: compactNumberFormatter.format(pendingConcerns),
            meta: pendingConcerns > 0 ? 'Customers are waiting for a response.' : 'Support is currently under control.',
            to: supportRoute,
            action: 'Review support inbox',
            color: pendingConcerns > 0 ? 'red' : 'purple',
        },
        {
            icon: Users,
            label: 'Active customers',
            value: compactNumberFormatter.format(totalUsers),
            meta: `${recentCustomers.length} newest customer accounts are visible below.`,
            to: usersRoute,
            action: 'Manage customer accounts',
            color: 'slate',
        },
    ];

    const actionLanes = [
        {
            icon: CircleDollarSign,
            title: 'Revenue booked',
            description: 'Track how much value the storefront has already captured.',
            value: currencyFormatter.format(totalRevenue),
            to: ordersRoute,
            action: 'Review paid orders',
            tone: 'green',
        },
        {
            icon: ShoppingBag,
            title: 'Fulfillment queue',
            description: 'Stay ahead of delivery flow and processing pressure.',
            value: `${totalOrders} total orders`,
            to: ordersRoute,
            action: 'Open order operations',
            tone: 'blue',
        },
        {
            icon: AlertTriangle,
            title: 'Inventory risk',
            description: 'Jump straight into parts that are running low.',
            value: lowStockCount > 0 ? `${lowStockCount} low stock products` : 'No low stock products',
            to: lowStockRoute,
            action: 'Inspect low stock parts',
            tone: lowStockCount > 0 ? 'amber' : 'green',
        },
        {
            icon: ClipboardCheck,
            title: 'Seller review queue',
            description: 'Check submitted parts before they are published in the catalog.',
            value: pendingSellerListings > 0 ? `${pendingSellerListings} listings awaiting review` : 'No listings awaiting review',
            to: activityRoute,
            action: 'Review seller parts',
            tone: pendingSellerListings > 0 ? 'amber' : 'green',
        },
        {
            icon: Headphones,
            title: 'Support coverage',
            description: 'Keep customer replies moving without leaving the dashboard.',
            value: pendingConcerns > 0 ? `${pendingConcerns} tickets waiting` : 'Inbox is under control',
            to: supportRoute,
            action: 'Open support inbox',
            tone: pendingConcerns > 0 ? 'red' : 'purple',
        },
    ];

    return (
        <div className="admin-page">
            <div className="admin-workspace admin-dashboard-shell">
                <section className="admin-hero admin-hero--dashboard">
                    <div className="admin-hero__content">
                        <span className="admin-hero__eyebrow">Operations overview</span>
                        <p>
                            Watch revenue, orders, inventory pressure, and customer support from a faster command center built around action, not clutter.
                        </p>
                        <div className="admin-chip-row">
                            <span className="admin-chip">{currencyFormatter.format(totalRevenue)} revenue</span>
                            <span className="admin-chip">{totalOrders} orders processed</span>
                            <span className="admin-chip">{lowStockCount} low stock items</span>
                            <span className="admin-chip">{pendingSellerListings} seller listings to review</span>
                        </div>
                        <div className="admin-dashboard-actions">
                            <Link to={ordersRoute} className="btn btn-primary">
                                Review orders
                            </Link>
                            <Link to={lowStockRoute} className="btn btn-secondary">
                                Low stock products
                            </Link>
                            <Link to={supportRoute} className="btn btn-secondary">
                                Customer support
                            </Link>
                            <Link to={activityRoute} className="btn btn-secondary">
                                Seller activity
                            </Link>
                        </div>
                    </div>

                    <div className="admin-hero__aside">
                        <div className="admin-hero__stat">
                            <span>Average order value</span>
                            <strong>{currencyFormatter.format(averageOrderValue)}</strong>
                            <small>Higher basket value gives you steadier daily revenue.</small>
                        </div>
                        <div className="admin-hero__stat">
                            <span>Inventory attention</span>
                            <strong>{lowStockCount}</strong>
                            <small>Click below to open the exact products that are running low.</small>
                            <Link to={lowStockRoute} className="admin-hero__stat-link">
                                Open low stock list
                            </Link>
                        </div>
                        <div className="admin-hero__stat">
                            <span>Support queue</span>
                            <strong>{pendingConcerns}</strong>
                            <small>{pendingConcerns > 0 ? 'Customer follow-up is needed today.' : 'Support is calm right now.'}</small>
                        </div>
                    </div>
                </section>

                <div className="admin-kpi-grid admin-dashboard-priority-grid">
                    {primaryCards.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Link key={item.label} to={item.to} className="admin-kpi-card admin-kpi-card--interactive">
                                <div className={`admin-kpi-card__icon admin-kpi-card__icon--${item.color}`}>
                                    <Icon size={20} />
                                </div>
                                <div className="admin-kpi-card__content">
                                    <span>{item.label}</span>
                                    <strong>{item.value}</strong>
                                    <small>{item.meta}</small>
                                    <em className="admin-kpi-card__action">
                                        {item.action}
                                        <ArrowRight size={14} />
                                    </em>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <div className="admin-grid admin-grid--2">
                    <section className="admin-section-card admin-dashboard-section admin-dashboard-section--compact">
                        <div className="admin-section-card__header">
                            <div>
                                <h2>Recent orders</h2>
                                <p>The latest customer purchases entering your pipeline.</p>
                            </div>
                            <Link to={ordersRoute} className="admin-inline-badge">
                                <ShoppingBag size={14} />
                                Open orders
                            </Link>
                        </div>

                        {recentOrders.length === 0 ? (
                            <p className="admin-note">No orders have been placed yet.</p>
                        ) : (
                            <div className="admin-table-shell">
                                <table className="admin-data-table admin-data-table--compact">
                                    <thead>
                                        <tr>
                                            <th>Order</th>
                                            <th>Customer</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>Placed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.slice(0, 4).map((order) => (
                                            <tr key={order.id}>
                                                <td>
                                                    <div className="admin-table-stack">
                                                        <strong>{order.order_number || `#${order.id}`}</strong>
                                                        <span>Tracking {order.tracking_number || 'pending'}</span>
                                                    </div>
                                                </td>
                                                <td>{order.user?.name || 'Customer'}</td>
                                                <td>{currencyFormatter.format(Number(order.total_amount || 0))}</td>
                                                <td>
                                                    <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                                                        {order.status || 'pending'}
                                                    </span>
                                                </td>
                                                <td>{order.created_at ? dateTimeFormatter.format(new Date(order.created_at)) : 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <section className="admin-section-card admin-dashboard-section admin-dashboard-section--compact">
                        <div className="admin-section-card__header">
                            <div>
                                <h2>Recent activity</h2>
                                <p>A live pulse of the newest changes across orders, customers, and support.</p>
                            </div>
                            <Link to={activityRoute} className="admin-inline-badge">Open activity</Link>
                        </div>

                        {activityFeed.length === 0 ? (
                            <p className="admin-note">No recent activity to show.</p>
                        ) : (
                            <div className="admin-feed admin-feed--compact">
                                {activityFeed.slice(0, 4).map((activity) => (
                                    <div key={activity.id} className="admin-feed__item">
                                        <span className={`admin-feed__dot admin-feed__dot--${activity.type}`} />
                                        <div className="admin-feed__content">
                                            <strong>{activity.title}</strong>
                                            <p>{activity.description}</p>
                                            <small>{activity.created_at ? dateTimeFormatter.format(new Date(activity.created_at)) : 'N/A'}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <div className="admin-grid admin-grid--2">
                    <section className="admin-section-card admin-dashboard-section admin-dashboard-section--compact">
                        <div className="admin-section-card__header">
                            <div>
                                <h2>Newest customers</h2>
                                <p>Fresh accounts that may turn into repeat buyers.</p>
                            </div>
                            <Link to={usersRoute} className="admin-inline-badge">
                                <Users size={14} />
                                Open users
                            </Link>
                        </div>

                        {recentCustomers.length === 0 ? (
                            <p className="admin-note">No recent customer registrations yet.</p>
                        ) : (
                            <div className="admin-list-stack admin-list-stack--compact">
                                {recentCustomers.slice(0, 4).map((customer) => (
                                    <div key={customer.id} className="admin-list-row">
                                        <div>
                                            <strong>{customer.name}</strong>
                                            <span>{customer.email}</span>
                                        </div>
                                        <div className="admin-list-row__aside">
                                            <span className={`badge ${getStatusBadgeClass(customer.is_active ? 'active' : 'inactive')}`}>
                                                {customer.is_active ? 'active' : 'inactive'}
                                            </span>
                                            <small>{customer.created_at ? dateTimeFormatter.format(new Date(customer.created_at)) : 'N/A'}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="admin-section-card admin-dashboard-section admin-dashboard-section--compact">
                        <div className="admin-section-card__header">
                            <div>
                                <h2>Inventory summary</h2>
                                <p>Keep the catalog balanced before stock gaps affect customer orders.</p>
                            </div>
                            <Link to={productsRoute} className="admin-inline-badge admin-inline-badge--violet">
                                <Package size={14} />
                                Open inventory
                            </Link>
                        </div>

                        <div className="admin-dashboard-summary-grid">
                            <div className="admin-dashboard-summary-card">
                                <span>Active parts</span>
                                <strong>{compactNumberFormatter.format(totalProducts)}</strong>
                                <small>Products currently listed in the active catalog.</small>
                            </div>
                            <div className="admin-dashboard-summary-card">
                                <span>Low stock</span>
                                <strong>{compactNumberFormatter.format(lowStockCount)}</strong>
                                <small>Products that should be restocked soon.</small>
                            </div>
                            <div className="admin-dashboard-summary-card">
                                <span>Seller review queue</span>
                                <strong>{compactNumberFormatter.format(pendingSellerListings)}</strong>
                                <small>Seller parts waiting for an approval decision.</small>
                            </div>
                            <div className="admin-dashboard-summary-card">
                                <span>Support queue</span>
                                <strong>{compactNumberFormatter.format(pendingConcerns)}</strong>
                                <small>Tickets waiting for admin attention.</small>
                            </div>
                            <div className="admin-dashboard-summary-card">
                                <span>Total customers</span>
                                <strong>{compactNumberFormatter.format(totalUsers)}</strong>
                                <small>Accounts currently tracked in the system.</small>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="admin-grid admin-grid--2">
                    <section className="admin-section-card admin-dashboard-section admin-dashboard-section--lanes">
                        <div className="admin-section-card__header">
                            <div>
                                <h2>Priority lanes</h2>
                                <p>Use these shortcuts when you want to act on the biggest admin tasks first.</p>
                            </div>
                        </div>

                        <div className="admin-dashboard-lanes admin-dashboard-lanes--compact">
                            {actionLanes.map((lane) => {
                                const Icon = lane.icon;

                                return (
                                    <Link key={lane.title} to={lane.to} className={`admin-dashboard-lane admin-dashboard-lane--${lane.tone}`}>
                                        <div className="admin-dashboard-lane__icon">
                                            <Icon size={18} />
                                        </div>
                                        <div className="admin-dashboard-lane__content">
                                            <strong>{lane.title}</strong>
                                            <p>{lane.description}</p>
                                            <span>{lane.value}</span>
                                        </div>
                                        <span className="admin-dashboard-lane__link">
                                            {lane.action}
                                            <ArrowRight size={14} />
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>

                    <section className="admin-section-card admin-dashboard-section admin-dashboard-section--watchlist">
                        <div className="admin-section-card__header">
                            <div>
                                <h2>Low stock watchlist</h2>
                                <p>Click any row to open the filtered inventory view for stock attention.</p>
                            </div>
                            <Link to={lowStockRoute} className="admin-inline-badge admin-inline-badge--warning">
                                <AlertTriangle size={14} />
                                {lowStockCount} flagged
                            </Link>
                        </div>

                        {lowStockWatchlist.length === 0 ? (
                            <p className="admin-note">Inventory levels look healthy right now.</p>
                        ) : (
                            <div className="admin-list-stack admin-list-stack--compact">
                                {lowStockWatchlist.slice(0, 4).map((product) => (
                                    <Link key={product.id} to={lowStockRoute} className="admin-list-row admin-list-row--interactive">
                                        <div>
                                            <strong>{product.name}</strong>
                                            <span>{product.brand || product.sku || 'Inventory item'}</span>
                                        </div>
                                        <div className="admin-list-row__aside">
                                            <span className={`badge ${Number(product.stock || 0) === 0 ? 'badge-danger' : 'badge-warning'}`}>
                                                {Number(product.stock || 0)} left
                                            </span>
                                            <small>Open inventory</small>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

            </div>
        </div>
    );
}
