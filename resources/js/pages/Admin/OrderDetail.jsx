import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import adminService from '../../services/adminService';
import PageSkeleton from '../../components/Skeleton';

const ORDER_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'];

const formatCurrency = (value) => `PHP ${Number(value || 0).toFixed(2)}`;

export default function AdminOrderDetail() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('processing');
    const [trackingNumber, setTrackingNumber] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadOrder = async () => {
            try {
                setLoading(true);
                const response = await adminService.getOrderById(id);
                const payload = response?.data?.data;
                if (!mounted) {
                    return;
                }

                if (!payload) {
                    setError('Order not found.');
                    return;
                }

                setOrder(payload);
                setStatus(payload.status || 'processing');
                setTrackingNumber(payload.tracking_number || '');
            } catch (requestError) {
                if (mounted) {
                    setError(requestError?.response?.data?.message || 'Failed to load order details.');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadOrder();

        return () => {
            mounted = false;
        };
    }, [id]);

    const handleStatusSave = async () => {
        if (!order || saving) {
            return;
        }

        try {
            setSaving(true);
            setError('');

            await adminService.updateOrderStatus(order.id, status, trackingNumber || undefined);
            setOrder((prev) => (
                prev
                    ? {
                        ...prev,
                        status,
                        tracking_number: trackingNumber || null,
                    }
                    : prev
            ));
        } catch (requestError) {
            setError(requestError?.response?.data?.message || 'Failed to update order status.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-dashboard-modern">
                    <PageSkeleton variant="detail" label="Loading order details" />
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="admin-page">
                <div className="admin-dashboard-modern">
                    <div className="admin-panel" style={{ padding: 20 }}>
                        <h2 style={{ marginTop: 0 }}>Order Not Found</h2>
                        <p style={{ color: '#64748b' }}>{error || 'The order could not be loaded.'}</p>
                        <Link to="/admin/orders" className="btn btn-primary">Back to Orders</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-dashboard-modern">
                <div className="admin-page-header">
                    <div className="header-content">
                        <h1>Order {order.order_number || `#${order.id}`}</h1>
                        <p>Full customer order details and fulfillment controls</p>
                    </div>
                    <div className="header-action">
                        <Link to="/admin/orders" className="btn btn-outline">Back to Orders</Link>
                    </div>
                </div>

                {error && (
                    <div className="admin-panel" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b', marginBottom: 12 }}>
                        {error}
                    </div>
                )}

                <div className="admin-panel" style={{ marginBottom: 16 }}>
                    <div className="admin-panel-header" style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Order Controls</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Status</span>
                            <select
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 6,
                                    fontSize: '0.9rem',
                                    background: '#fff'
                                }}
                            >
                                {ORDER_STATUSES.map((value) => (
                                    <option key={value} value={value}>
                                        {value.charAt(0).toUpperCase() + value.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 2, minWidth: 250 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Tracking Number</span>
                            <input
                                value={trackingNumber}
                                onChange={(event) => setTrackingNumber(event.target.value)}
                                placeholder="Optional tracking reference"
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 6,
                                    fontSize: '0.9rem'
                                }}
                            />
                        </label>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleStatusSave}
                            disabled={saving}
                            style={{
                                padding: '0.5rem 1rem',
                                background: '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                fontWeight: 600,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                <div className="admin-panel" style={{ marginBottom: 16 }}>
                    <div className="admin-panel-header" style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Customer Details</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Name</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{order.user?.name || 'N/A'}</p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Email</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{order.user?.email || 'N/A'}</p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Phone</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{order.user?.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Role</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{order.user?.role || 'customer'}</p>
                        </div>
                    </div>
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Shipping Address</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{order.shipping_address || 'N/A'}</p>
                    </div>
                </div>

                <div className="admin-panel" style={{ marginBottom: 16 }}>
                    <div className="admin-panel-header" style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Payment & Totals</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Payment Method</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{order.payment_method || 'N/A'}</p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Payment Status</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{order.payment_status || 'N/A'}</p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Tax</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{formatCurrency(order.tax_amount)}</p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Shipping</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{formatCurrency(order.shipping_amount)}</p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Total Amount</p>
                            <p style={{ margin: 0, fontSize: '1rem', color: '#059669', fontWeight: 700 }}>{formatCurrency(order.total_amount)}</p>
                        </div>
                    </div>
                </div>

                <div className="admin-panel" style={{ marginBottom: 16 }}>
                    <div className="admin-panel-header" style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Order Items ({Array.isArray(order.items) ? order.items.length : 0})</h3>
                    </div>
                    {!Array.isArray(order.items) || order.items.length === 0 ? (
                        <div className="admin-empty-state" style={{ padding: '32px 0' }}>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>No items found for this order.</p>
                        </div>
                    ) : (
                        <div className="admin-table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>SKU</th>
                                        <th style={{ textAlign: 'center' }}>Qty</th>
                                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item) => (
                                        <tr key={item.id}>
                                            <td style={{ fontWeight: 500 }}>{item.product?.name || 'Unknown Product'}</td>
                                            <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.product?.slug || 'N/A'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>{formatCurrency(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
