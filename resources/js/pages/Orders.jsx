import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../services/orderService';
import PageSkeleton from '../components/Skeleton';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await orderService.getOrders();
                setOrders(res.data?.data?.data || []);
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    if (loading) {
        return <PageSkeleton variant="list" label="Loading your orders" />;
    }

    return (
        <div className="orders-page" style={{ color: '#0f172a' }}>
            <h1 style={{ margin: '0 0 1rem', color: '#0f172a', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em' }}>My Orders</h1>
            {orders.length === 0 ? (
                <p style={{ color: '#64748b' }}>No orders found</p>
            ) : (
                <div className="orders-list" style={{ display: 'grid', gap: '1rem' }}>
                    {orders.map((order) => (
                        <div key={order.id} className="order-card" style={{ background: '#ffffff', border: '1px solid #dbe1ea', borderRadius: 14, padding: '1rem 1.1rem', color: '#0f172a', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)' }}>
                            <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Order #{order.order_number || order.id}</p>
                            <p style={{ margin: '0.35rem 0 0', color: '#475569' }}>Status: {String(order.status || '').replace(/_/g, ' ')}</p>
                            <p style={{ margin: '0.35rem 0 0', color: '#475569' }}>Tracking: {order.tracking_number || 'Waiting for update'}</p>
                            <p style={{ margin: '0.35rem 0 0.9rem', color: '#0f172a', fontWeight: 700 }}>Total: ₱{Number(order.total_amount || order.total || 0).toFixed(2)}</p>
                            <Link to={`/dashboard/orders/${order.id}`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', borderRadius: 10, padding: '0.75rem 1rem', background: '#f97316', color: '#ffffff', fontWeight: 800, border: 0 }}>
                                Track Order
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
