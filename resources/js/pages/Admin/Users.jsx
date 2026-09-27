import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Search, Send, Tag, UserCheck, UserMinus, Users, Wallet, X } from 'lucide-react';
import adminService from '../../services/adminService';
import PageSkeleton from '../../components/Skeleton';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

export default function AdminUsers() {
    const [searchParams] = useSearchParams();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [notificationTarget, setNotificationTarget] = useState(null);
    const [notificationForm, setNotificationForm] = useState({ title: '', message: '' });
    const [sendingNotification, setSendingNotification] = useState(false);
    const [promoTarget, setPromoTarget] = useState(null);
    const [promoForm, setPromoForm] = useState({
        title: 'Exclusive promo from CarVex',
        message: '',
        discount_type: 'percentage',
        discount_value: '10',
        minimum_order_amount: '500',
        expires_in_days: '30',
    });
    const [sendingPromo, setSendingPromo] = useState(false);

    useEffect(() => {
        const nextSearch = searchParams.get('search') || '';
        const nextStatus = searchParams.get('status') || 'all';

        setSearchQuery(nextSearch);
        setStatusFilter(['all', 'active', 'inactive'].includes(nextStatus) ? nextStatus : 'all');
    }, [searchParams]);

    useEffect(() => {
        let mounted = true;

        const fetchUsers = async () => {
            try {
                const response = await adminService.getUsers({ params: { per_page: 200 } });
                const usersData = response.data?.data?.data || response.data?.data || [];

                if (!mounted) {
                    return;
                }

                setUsers(Array.isArray(usersData) ? usersData : []);
            } catch (error) {
                console.error('Failed to fetch users:', error);
                if (mounted) {
                    setUsers([]);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void fetchUsers();

        return () => {
            mounted = false;
        };
    }, []);

    const handleToggleStatus = async (userId) => {
        try {
            await adminService.toggleUserStatus(userId);
            setUsers((prev) => prev.map((user) => (
                user.id === userId ? { ...user, is_active: !user.is_active } : user
            )));
            window.dispatchEvent(new Event('sidebar-counts-refresh'));
        } catch (error) {
            console.error('Failed to toggle user status:', error);
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this customer account?')) {
            return;
        }

        try {
            await adminService.deleteUser({ user_id: userId });
            setUsers((prev) => prev.filter((user) => user.id !== userId));
            window.dispatchEvent(new Event('sidebar-counts-refresh'));
        } catch (error) {
            console.error('Failed to delete user:', error);
            window.alert(error?.response?.data?.message || 'Failed to delete customer.');
        }
    };

    const handleOpenNotificationComposer = (user) => {
        setNotificationTarget(user);
        setNotificationForm({
            title: 'Message from CarVex admin',
            message: '',
        });
    };

    const handleCloseNotificationComposer = () => {
        if (sendingNotification) {
            return;
        }

        setNotificationTarget(null);
        setNotificationForm({ title: '', message: '' });
    };

    const handleOpenPromoComposer = (user) => {
        setPromoTarget(user);
        setPromoForm({
            title: 'Exclusive promo from CarVex',
            message: '',
            discount_type: 'percentage',
            discount_value: '10',
            minimum_order_amount: '500',
            expires_in_days: '30',
        });
    };

    const handleClosePromoComposer = () => {
        if (sendingPromo) {
            return;
        }

        setPromoTarget(null);
    };

    const handleSendNotification = async (event) => {
        event.preventDefault();

        if (!notificationTarget || sendingNotification) {
            return;
        }

        try {
            setSendingNotification(true);
            await adminService.notifyUser(notificationTarget.id, {
                title: notificationForm.title.trim(),
                message: notificationForm.message.trim(),
                link: '/dashboard',
            });
            setNotificationTarget(null);
            setNotificationForm({ title: '', message: '' });
            window.alert('Notification sent to the customer successfully.');
        } catch (error) {
            console.error('Failed to send notification:', error);
            window.alert(error?.response?.data?.message || 'Failed to send notification.');
        } finally {
            setSendingNotification(false);
        }
    };

    const handleSendPromoCode = async (event) => {
        event.preventDefault();

        if (!promoTarget || sendingPromo) {
            return;
        }

        try {
            setSendingPromo(true);
            const response = await adminService.sendPromoCode(promoTarget.id, {
                title: promoForm.title.trim(),
                message: promoForm.message.trim(),
                discount_type: promoForm.discount_type,
                discount_value: Number(promoForm.discount_value || 0),
                minimum_order_amount: Number(promoForm.minimum_order_amount || 0),
                expires_in_days: Number(promoForm.expires_in_days || 30),
            });

            const code = response.data?.data?.code || 'promo code';
            setPromoTarget(null);
            window.alert(`Promo code ${code} was generated and sent to the customer.`);
        } catch (error) {
            console.error('Failed to send promo code:', error);
            window.alert(error?.response?.data?.message || 'Failed to generate and send promo code.');
        } finally {
            setSendingPromo(false);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch = [user.name, user.email, user.phone]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) {
            return false;
        }

        if (statusFilter === 'active') {
            return Boolean(user.is_active);
        }

        if (statusFilter === 'inactive') {
            return !user.is_active;
        }

        return true;
    });

    const stats = {
        total: users.length,
        active: users.filter((user) => user.is_active).length,
        inactive: users.filter((user) => !user.is_active).length,
        repeatBuyers: users.filter((user) => Number(user.orders_count || 0) > 1).length,
        totalRevenue: users.reduce((sum, user) => sum + Number(user.orders_total_amount || 0), 0),
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-workspace">
                    <PageSkeleton variant="dashboard" label="Loading customer accounts" />
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-workspace">
                <section className="admin-hero admin-hero--users">
                    <div className="admin-hero__content">
                        <span className="admin-hero__eyebrow">Customer relationships</span>
                        <h1>See the customer base like a real storefront team.</h1>
                        <p>
                            Watch account health, repeat buyers, and customer value without digging through raw tables.
                        </p>
                        <div className="admin-chip-row">
                            <span className="admin-chip">{stats.total} customer accounts</span>
                            <span className="admin-chip">{stats.repeatBuyers} repeat buyers</span>
                            <span className="admin-chip">{currencyFormatter.format(stats.totalRevenue)} lifetime revenue</span>
                        </div>
                    </div>

                    <div className="admin-hero__aside">
                        <div className="admin-hero__stat">
                            <span>Active customers</span>
                            <strong>{stats.active}</strong>
                            <small>Accounts currently ready to place new orders.</small>
                        </div>
                        <div className="admin-hero__stat">
                            <span>Inactive customers</span>
                            <strong>{stats.inactive}</strong>
                            <small>Accounts that may need re-engagement or review.</small>
                        </div>
                    </div>
                </section>

                <div className="admin-kpi-grid admin-kpi-grid--compact">
                    <article className="admin-kpi-card">
                        <div className="admin-kpi-card__icon admin-kpi-card__icon--blue">
                            <Users size={20} />
                        </div>
                        <div className="admin-kpi-card__content">
                            <span>Total customers</span>
                            <strong>{stats.total}</strong>
                            <small>Every non-admin account in the system.</small>
                        </div>
                    </article>

                    <article className="admin-kpi-card">
                        <div className="admin-kpi-card__icon admin-kpi-card__icon--green">
                            <UserCheck size={20} />
                        </div>
                        <div className="admin-kpi-card__content">
                            <span>Active</span>
                            <strong>{stats.active}</strong>
                            <small>Customers who can currently transact normally.</small>
                        </div>
                    </article>

                    <article className="admin-kpi-card">
                        <div className="admin-kpi-card__icon admin-kpi-card__icon--amber">
                            <UserMinus size={20} />
                        </div>
                        <div className="admin-kpi-card__content">
                            <span>Inactive</span>
                            <strong>{stats.inactive}</strong>
                            <small>Accounts currently switched off or restricted.</small>
                        </div>
                    </article>

                    <article className="admin-kpi-card">
                        <div className="admin-kpi-card__icon admin-kpi-card__icon--purple">
                            <Wallet size={20} />
                        </div>
                        <div className="admin-kpi-card__content">
                            <span>Customer value</span>
                            <strong>{currencyFormatter.format(stats.totalRevenue)}</strong>
                            <small>Total order value generated by these accounts.</small>
                        </div>
                    </article>
                </div>

                <section className="admin-section-card">
                    <div className="admin-toolbar">
                        <div className="admin-toolbar__search">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search customers by name, email, or phone"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>

                        <div className="admin-toolbar__filters">
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                <option value="all">All statuses</option>
                                <option value="active">Active only</option>
                                <option value="inactive">Inactive only</option>
                            </select>
                        </div>
                    </div>

                    {filteredUsers.length === 0 ? (
                        <div className="admin-empty-state">
                            <Users size={44} />
                            <h3>No matching customers</h3>
                            <p>Try another search or switch the status filter.</p>
                        </div>
                    ) : (
                        <div className="admin-table-shell">
                            <table className="admin-data-table">
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Contact</th>
                                        <th>Orders</th>
                                        <th>Revenue</th>
                                        <th>Last order</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="admin-table-stack">
                                                    <strong>{user.name}</strong>
                                                    <span>{user.role || 'customer'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="admin-table-stack">
                                                    <strong>{user.email}</strong>
                                                    <span>{user.phone || 'No phone added'}</span>
                                                </div>
                                            </td>
                                            <td>{Number(user.orders_count || 0)}</td>
                                            <td>{currencyFormatter.format(Number(user.orders_total_amount || 0))}</td>
                                            <td>{user.last_order_at ? dateFormatter.format(new Date(user.last_order_at)) : 'No orders yet'}</td>
                                            <td>
                                                <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                    {user.is_active ? 'active' : 'inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="admin-inline-controls">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => handleOpenNotificationComposer(user)}
                                                    >
                                                        <Bell size={14} />
                                                        Notify
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => handleOpenPromoComposer(user)}
                                                    >
                                                        <Tag size={14} />
                                                        Promo
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={`btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}`}
                                                        onClick={() => handleToggleStatus(user.id)}
                                                    >
                                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDelete(user.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {notificationTarget ? (
                <div className="admin-modal" onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        handleCloseNotificationComposer();
                    }
                }}>
                    <div className="admin-modal__dialog" onClick={(event) => event.stopPropagation()}>
                        <div className="admin-modal__header">
                            <div>
                                <h2>Send customer notification</h2>
                                <p>This message will appear in the customer notification bell inside the dashboard.</p>
                            </div>
                            <button type="button" className="admin-modal__close" aria-label="Close notification composer" onClick={handleCloseNotificationComposer}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="admin-modal__body">
                            <div className="admin-message-recipient">
                                <span>Recipient</span>
                                <strong>{notificationTarget.name}</strong>
                                <small>{notificationTarget.email}</small>
                            </div>

                            <form className="admin-form admin-message-composer" onSubmit={handleSendNotification}>
                                <div className="form-group">
                                    <label htmlFor="customer-notification-title">Notification title</label>
                                    <input
                                        id="customer-notification-title"
                                        type="text"
                                        maxLength={120}
                                        value={notificationForm.title}
                                        onChange={(event) => setNotificationForm((prev) => ({ ...prev, title: event.target.value }))}
                                        placeholder="Write a short notification title"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="customer-notification-message">Message</label>
                                    <textarea
                                        id="customer-notification-message"
                                        rows={6}
                                        maxLength={2000}
                                        value={notificationForm.message}
                                        onChange={(event) => setNotificationForm((prev) => ({ ...prev, message: event.target.value }))}
                                        placeholder="Write the message the customer should see in their notifications."
                                        required
                                    />
                                </div>

                                <div className="admin-message-composer__footer">
                                    <p>The customer will open this message from their dashboard notifications.</p>
                                    <button type="submit" className="btn btn-primary" disabled={sendingNotification}>
                                        <Send size={16} />
                                        {sendingNotification ? 'Sending...' : 'Send notification'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            ) : null}

            {promoTarget ? (
                <div className="admin-modal" onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        handleClosePromoComposer();
                    }
                }}>
                    <div className="admin-modal__dialog" onClick={(event) => event.stopPropagation()}>
                        <div className="admin-modal__header">
                            <div>
                                <h2>Generate promo code</h2>
                                <p>This promo will be generated by admin and sent to the customer notifications.</p>
                            </div>
                            <button type="button" className="admin-modal__close" aria-label="Close promo code composer" onClick={handleClosePromoComposer}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="admin-modal__body">
                            <div className="admin-message-recipient">
                                <span>Recipient</span>
                                <strong>{promoTarget.name}</strong>
                                <small>{promoTarget.email}</small>
                            </div>

                            <form className="admin-form admin-message-composer" onSubmit={handleSendPromoCode}>
                                <div className="form-group">
                                    <label htmlFor="promo-title">Notification title</label>
                                    <input
                                        id="promo-title"
                                        type="text"
                                        maxLength={120}
                                        value={promoForm.title}
                                        onChange={(event) => setPromoForm((prev) => ({ ...prev, title: event.target.value }))}
                                        placeholder="Promo title the customer will see"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="promo-message">Message</label>
                                    <textarea
                                        id="promo-message"
                                        rows={4}
                                        maxLength={500}
                                        value={promoForm.message}
                                        onChange={(event) => setPromoForm((prev) => ({ ...prev, message: event.target.value }))}
                                        placeholder="Optional extra message for the customer."
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="promo-discount-type">Discount type</label>
                                    <select
                                        id="promo-discount-type"
                                        value={promoForm.discount_type}
                                        onChange={(event) => setPromoForm((prev) => ({ ...prev, discount_type: event.target.value }))}
                                    >
                                        <option value="percentage">Percentage off</option>
                                        <option value="fixed">Fixed amount off</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="promo-discount-value">Discount value</label>
                                    <input
                                        id="promo-discount-value"
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={promoForm.discount_value}
                                        onChange={(event) => setPromoForm((prev) => ({ ...prev, discount_value: event.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="promo-minimum-order">Minimum order amount</label>
                                    <input
                                        id="promo-minimum-order"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={promoForm.minimum_order_amount}
                                        onChange={(event) => setPromoForm((prev) => ({ ...prev, minimum_order_amount: event.target.value }))}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="promo-expiry-days">Valid for how many days</label>
                                    <input
                                        id="promo-expiry-days"
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={promoForm.expires_in_days}
                                        onChange={(event) => setPromoForm((prev) => ({ ...prev, expires_in_days: event.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="admin-message-composer__footer">
                                    <p>The customer will receive the generated promo code in their dashboard notifications.</p>
                                    <button type="submit" className="btn btn-primary" disabled={sendingPromo}>
                                        <Tag size={16} />
                                        {sendingPromo ? 'Generating...' : 'Generate and send promo'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
