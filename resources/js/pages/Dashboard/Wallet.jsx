import React, { useEffect, useMemo, useState } from 'react';
import orderService from '../../services/orderService';

export default function DashboardWallet() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadOrders = async () => {
            try {
                const res = await orderService.getOrders({ per_page: 100 });
                const rawOrders = res?.data?.data?.orders || res?.data?.data?.data || [];
                if (mounted) {
                    setOrders(Array.isArray(rawOrders) ? rawOrders : []);
                }
            } catch (error) {
                if (mounted) {
                    setOrders([]);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadOrders();
        return () => {
            mounted = false;
        };
    }, []);

    const { totalSpent, paidCount } = useMemo(() => {
        return orders.reduce(
            (acc, item) => {
                const total = Number(item?.total_amount || 0);
                const isPaid = String(item?.payment_status || '').toLowerCase() === 'completed';
                if (isPaid) {
                    acc.totalSpent += total;
                    acc.paidCount += 1;
                }
                return acc;
            },
            { totalSpent: 0, paidCount: 0 }
        );
    }, [orders]);

    return (
        <section style={{ background: '#ffffff', border: '1px solid #dbe1ea', borderRadius: 14, padding: '1.2rem 1.25rem', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)' }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em' }}>Carvex Wallet</h2>
            <p style={{ margin: '0.45rem 0 0', color: '#64748b', fontSize: 14 }}>Summary of your completed payments.</p>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <article style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.9rem 1rem' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Total Spent</p>
                    <strong style={{ display: 'block', marginTop: 6, fontSize: 28, color: '#0f172a' }}>P{totalSpent.toFixed(2)}</strong>
                </article>
                <article style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.9rem 1rem' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Paid Orders</p>
                    <strong style={{ display: 'block', marginTop: 6, fontSize: 28, color: '#0f172a' }}>{paidCount}</strong>
                </article>
            </div>

            {loading ? (
                <div role="status" aria-label="Loading wallet summary" style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                    <span className="cv-skeleton-block" style={{ width: '48%', height: 14 }} />
                    <span className="cv-skeleton-block" style={{ width: '72%', height: 24 }} />
                </div>
            ) : null}
        </section>
    );
}
