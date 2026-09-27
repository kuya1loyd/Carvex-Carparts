import React, { useEffect, useState } from 'react';
import {
    Clock3,
    Eye,
    PackageCheck,
    Search,
    ShoppingBag,
    Trash2,
    Truck,
    X,
} from 'lucide-react';
import adminService from '../../services/adminService';
import PageSkeleton from '../../components/Skeleton';

const ORDER_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'];

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'processing':
            return 'badge-warning';
        case 'shipped':
            return 'badge-info';
        case 'delivered':
            return 'badge-success';
        case 'cancelled':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
};

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [nextStatusByOrderId, setNextStatusByOrderId] = useState({});
    const [updatingOrderId, setUpdatingOrderId] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        let mounted = true;

        const fetchOrders = async () => {
            try {
                const res = await adminService.getAllOrders({
                    params: {
                        include_items: true,
                        include_users: true,
                        per_page: 200,
                    },
                });

                if (!mounted) {
                    return;
                }

                const rows = res.data?.data?.data || [];
                setOrders(rows);
                setNextStatusByOrderId(
                    rows.reduce((acc, order) => {
                        acc[order.id] = order.status || 'processing';
                        return acc;
                    }, {})
                );
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void fetchOrders();

        return () => {
            mounted = false;
        };
    }, []);

    const handleUpdateStatus = async (order) => {
        const nextStatus = nextStatusByOrderId[order.id] || order.status;
        if (!order || !nextStatus || nextStatus === order.status || updatingOrderId === order.id) {
            return;
        }

        try {
            setUpdatingOrderId(order.id);
            await adminService.updateOrderStatus(order.id, nextStatus);
            setOrders((prev) => prev.map((item) => (
                item.id === order.id
                    ? { ...item, status: nextStatus }
                    : item
            )));
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to update order status';
            window.alert(message);
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handleDelete = async (order) => {
        if (!window.confirm(`Are you sure you want to delete order ${order.order_number || order.id}? This action cannot be undone.`)) {
            return;
        }

        try {
            await adminService.deleteOrder(order.id);
            setOrders((prev) => prev.filter((item) => item.id !== order.id));
            window.dispatchEvent(new Event('sidebar-counts-refresh'));
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to delete order';
            window.alert(message);
        }
    };

    const filteredOrders = orders.filter((order) => {
        const needle = searchTerm.trim().toLowerCase();

        if (statusFilter !== 'all' && order.status !== statusFilter) {
            return false;
        }

        if (!needle) {
            return true;
        }

        return [
            order.order_number,
            String(order.id || ''),
            order.tracking_number,
            order.user?.name,
            order.user?.email,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle));
    });

    const stats = {
        total: orders.length,
        processing: orders.filter((order) => order.status === 'processing').length,
        shipped: orders.filter((order) => order.status === 'shipped').length,
        delivered: orders.filter((order) => order.status === 'delivered').length,
        cancelled: orders.filter((order) => order.status === 'cancelled').length,
    };

    if (loading) {
        return <PageSkeleton variant="list" label="Loading order operations" />;
    }

    return (
        <>
            <div className="admin-page">
                <div className="admin-workspace">
                    <section className="admin-hero admin-hero--orders">
                        <div className="admin-hero__content">
                            <span className="admin-hero__eyebrow">Fulfillment desk</span>
                            <h1>Handle every order with more confidence.</h1>
                            <p>
                                Review the queue, update statuses quickly, and keep the customer delivery journey clean and transparent.
                            </p>
                            <div className="admin-chip-row">
                                <span className="admin-chip">{stats.total} orders tracked</span>
                                <span className="admin-chip">{stats.processing} in processing</span>
                                <span className="admin-chip">{stats.shipped} already in transit</span>
                            </div>
                        </div>

                        <div className="admin-hero__aside">
                            <div className="admin-hero__stat">
                                <span>Delivered</span>
                                <strong>{stats.delivered}</strong>
                                <small>Completed customer handoffs.</small>
                            </div>
                            <div className="admin-hero__stat">
                                <span>Cancelled</span>
                                <strong>{stats.cancelled}</strong>
                                <small>Orders removed from active revenue flow.</small>
                            </div>
                        </div>
                    </section>

                    <div className="admin-kpi-grid admin-kpi-grid--compact">
                        <article className="admin-kpi-card">
                            <div className="admin-kpi-card__icon admin-kpi-card__icon--blue">
                                <ShoppingBag size={20} />
                            </div>
                            <div className="admin-kpi-card__content">
                                <span>Total orders</span>
                                <strong>{stats.total}</strong>
                                <small>All captured transactions in the admin panel.</small>
                            </div>
                        </article>

                        <article className="admin-kpi-card">
                            <div className="admin-kpi-card__icon admin-kpi-card__icon--amber">
                                <Clock3 size={20} />
                            </div>
                            <div className="admin-kpi-card__content">
                                <span>Processing</span>
                                <strong>{stats.processing}</strong>
                                <small>Orders waiting for the next fulfillment step.</small>
                            </div>
                        </article>

                        <article className="admin-kpi-card">
                            <div className="admin-kpi-card__icon admin-kpi-card__icon--purple">
                                <Truck size={20} />
                            </div>
                            <div className="admin-kpi-card__content">
                                <span>Shipped</span>
                                <strong>{stats.shipped}</strong>
                                <small>Orders already handed over for delivery.</small>
                            </div>
                        </article>

                        <article className="admin-kpi-card">
                            <div className="admin-kpi-card__icon admin-kpi-card__icon--green">
                                <PackageCheck size={20} />
                            </div>
                            <div className="admin-kpi-card__content">
                                <span>Delivered</span>
                                <strong>{stats.delivered}</strong>
                                <small>Fulfilled purchases that reached the customer.</small>
                            </div>
                        </article>
                    </div>

                    <section className="admin-section-card">
                        <div className="admin-toolbar">
                            <div className="admin-toolbar__search">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by order number, tracking, or customer"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                />
                            </div>

                            <div className="admin-toolbar__filters">
                                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                    <option value="all">All statuses</option>
                                    {ORDER_STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {filteredOrders.length === 0 ? (
                            <div className="admin-empty-state">
                                <ShoppingBag size={44} />
                                <h3>No matching orders</h3>
                                <p>Try a different search term or status filter.</p>
                            </div>
                        ) : (
                            <div className="admin-table-shell">
                                <table className="admin-data-table">
                                    <thead>
                                        <tr>
                                            <th>Order</th>
                                            <th>Customer</th>
                                            <th>Items</th>
                                            <th>Timeline</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrders.map((order) => {
                                            const currentStatus = ORDER_STATUSES.includes(order.status) ? order.status : 'processing';
                                            const selectedStatusRaw = nextStatusByOrderId[order.id] || currentStatus;
                                            const selectedStatus = ORDER_STATUSES.includes(selectedStatusRaw) ? selectedStatusRaw : currentStatus;
                                            const isUpdating = updatingOrderId === order.id;
                                            const canApply = selectedStatus !== currentStatus && !isUpdating;
                                            const itemNames = Array.isArray(order.items)
                                                ? order.items.map((item) => item.product?.name).filter(Boolean)
                                                : [];

                                            return (
                                                <tr key={order.id}>
                                                    <td>
                                                        <div className="admin-table-stack">
                                                            <strong>{order.order_number || `ORD-${String(order.id).padStart(3, '0')}`}</strong>
                                                            <span>#{order.id}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="admin-table-stack">
                                                            <strong>{order.user?.name || 'N/A'}</strong>
                                                            <span>{order.user?.email || 'No email provided'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="admin-table-stack">
                                                            <strong>{itemNames.length || 0} items</strong>
                                                            <span>
                                                                {itemNames.length > 0 ? itemNames.slice(0, 2).join(', ') : 'No product items found'}
                                                                {itemNames.length > 2 ? ` +${itemNames.length - 2} more` : ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="admin-table-stack">
                                                            <strong>{order.created_at ? dateFormatter.format(new Date(order.created_at)) : 'N/A'}</strong>
                                                            <span>{order.tracking_number ? `Tracking ${order.tracking_number}` : 'Tracking pending'}</span>
                                                        </div>
                                                    </td>
                                                    <td>{currencyFormatter.format(Number(order.total_amount || order.total || 0))}</td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(currentStatus)}`}>
                                                            {currentStatus}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="admin-inline-controls">
                                                            <select
                                                                value={selectedStatus}
                                                                onChange={(event) => {
                                                                    const value = event.target.value;
                                                                    setNextStatusByOrderId((prev) => ({ ...prev, [order.id]: value }));
                                                                }}
                                                                disabled={isUpdating}
                                                                className="admin-select-compact"
                                                            >
                                                                {ORDER_STATUSES.map((value) => (
                                                                    <option key={value} value={value}>
                                                                        {value.charAt(0).toUpperCase() + value.slice(1)}
                                                                    </option>
                                                                ))}
                                                            </select>

                                                            <button
                                                                type="button"
                                                                className="btn btn-success btn-sm"
                                                                onClick={() => handleUpdateStatus(order)}
                                                                disabled={!canApply}
                                                            >
                                                                {isUpdating ? 'Applying...' : 'Apply'}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="admin-icon-button"
                                                                onClick={() => setSelectedOrder(order)}
                                                                title="View order"
                                                            >
                                                                <Eye size={16} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="admin-icon-button admin-icon-button--danger"
                                                                onClick={() => handleDelete(order)}
                                                                title="Delete order"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {selectedOrder ? (
                <div className="admin-modal" onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        setSelectedOrder(null);
                    }
                }}>
                    <div className="admin-modal__dialog admin-modal__dialog--wide" onClick={(event) => event.stopPropagation()}>
                        <div className="admin-modal__header">
                            <div>
                                <h2>Order {selectedOrder.order_number || `#${selectedOrder.id}`}</h2>
                                <p>{selectedOrder.created_at ? dateFormatter.format(new Date(selectedOrder.created_at)) : 'N/A'}</p>
                            </div>
                            <button type="button" className="admin-modal__close" aria-label="Close order details" onClick={() => setSelectedOrder(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="admin-modal__body">
                            <section className="admin-modal__section">
                                <h3>Customer details</h3>
                                <div className="admin-modal__grid">
                                    <div>
                                        <span>Name</span>
                                        <strong>{selectedOrder.user?.name || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <span>Email</span>
                                        <strong>{selectedOrder.user?.email || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <span>Phone</span>
                                        <strong>{selectedOrder.user?.phone || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <span>Shipping address</span>
                                        <strong>{selectedOrder.shipping_address || 'N/A'}</strong>
                                    </div>
                                </div>
                            </section>

                            <section className="admin-modal__section">
                                <h3>Order items</h3>
                                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                                    <div className="admin-table-shell">
                                        <table className="admin-data-table">
                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th>Qty</th>
                                                    <th>Unit price</th>
                                                    <th>Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedOrder.items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>{item.product?.name || 'Unknown product'}</td>
                                                        <td>{item.quantity}</td>
                                                        <td>{currencyFormatter.format(Number(item.unit_price || 0))}</td>
                                                        <td>{currencyFormatter.format(Number(item.subtotal || 0))}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="admin-note">No items were found for this order.</p>
                                )}
                            </section>

                            <section className="admin-modal__section">
                                <h3>Payment and fulfillment</h3>
                                <div className="admin-modal__grid">
                                    <div>
                                        <span>Payment method</span>
                                        <strong>{selectedOrder.payment_method || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <span>Payment status</span>
                                        <strong>{selectedOrder.payment_status || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <span>Tracking number</span>
                                        <strong>{selectedOrder.tracking_number || 'Pending'}</strong>
                                    </div>
                                    <div>
                                        <span>Total amount</span>
                                        <strong>{currencyFormatter.format(Number(selectedOrder.total_amount || selectedOrder.total || 0))}</strong>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
