import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import Checkout from '../Checkout';
import PageSkeleton from '../../components/Skeleton';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

export default function DashboardCart() {
    const { cartItems, cartSummary, updateItem, removeItem, loading } = useCart();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const initialPromoCode = searchParams.get('promo') || '';

    useEffect(() => {
        if (!showCheckoutModal) {
            return undefined;
        }

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [showCheckoutModal]);

    if (loading) {
        return <PageSkeleton variant="list" label="Loading your cart" />;
    }

    if (cartItems.length === 0 && !showCheckoutModal) {
        return (
            <section style={{ border: '1px solid #dbe1ea', borderRadius: 14, background: '#ffffff', padding: 24, color: '#0f172a' }}>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>My Cart</h2>
                <p style={{ margin: '8px 0 0', color: '#64748b' }}>No items yet.</p>

                <div style={{ marginTop: 16, border: '1px dashed #cbd5e1', borderRadius: 12, background: '#f8fafc', padding: 22, textAlign: 'center' }}>
                    <ShoppingCart size={42} color="#94a3b8" style={{ margin: '0 auto 10px', display: 'block' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Start adding products to checkout.</p>
                    <Link
                        to="/dashboard/products"
                        style={{ display: 'inline-block', marginTop: 12, borderRadius: 10, background: '#f97316', color: '#ffffff', textDecoration: 'none', fontWeight: 800, padding: '10px 16px' }}
                    >
                        Browse Products
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <>
            {cartItems.length > 0 ? (
                <section style={{ border: '1px solid #dbe1ea', borderRadius: 14, background: '#ffffff', padding: 18, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>Shopping Cart</h2>
                            <p style={{ margin: '6px 0 0', color: '#64748b' }}>{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in cart</p>
                        </div>
                        <Link to="/dashboard/products" style={{ borderRadius: 10, background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', textDecoration: 'none', fontWeight: 800, padding: '9px 12px' }}>
                            Continue Shopping
                        </Link>
                    </div>

                    <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 320px)', gap: 14, alignItems: 'start' }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                            {cartItems.map((item, index) => (
                                <article
                                    key={item.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '76px minmax(0, 1fr) auto',
                                        gap: 12,
                                        padding: 12,
                                        borderTop: index === 0 ? 'none' : '1px solid #e2e8f0',
                                        alignItems: 'center',
                                        background: '#ffffff',
                                    }}
                                >
                                    <div style={{ width: 76, height: 76, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                                        {item.product?.images?.[0] ? (
                                            <img src={item.product.images[0]} alt={item.product?.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                                        ) : (
                                            <ShoppingCart size={18} color="#94a3b8" />
                                        )}
                                    </div>

                                    <div>
                                        <h4 style={{ margin: 0, fontSize: 15, color: '#0f172a', fontWeight: 800 }}>{item.product?.name}</h4>
                                        <p style={{ margin: '4px 0 8px', color: '#64748b', fontSize: 13 }}>{formatCurrency(item.product?.price)} each</p>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: '5px 8px', background: '#f8fafc' }}>
                                            <button type="button" aria-label={`Decrease quantity of ${item.product?.name || 'product'}`} data-tooltip={`Decrease quantity of ${item.product?.name || 'product'}`} onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))} style={{ border: 0, background: 'transparent', color: '#475569', cursor: 'pointer' }}>
                                                <Minus size={15} />
                                            </button>
                                            <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{item.quantity}</span>
                                            <button type="button" aria-label={`Increase quantity of ${item.product?.name || 'product'}`} data-tooltip={`Increase quantity of ${item.product?.name || 'product'}`} onClick={() => updateItem(item.id, item.quantity + 1)} style={{ border: 0, background: 'transparent', color: '#475569', cursor: 'pointer' }}>
                                                <Plus size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: 0, fontWeight: 900, color: '#0f172a' }}>{formatCurrency(Number(item.product?.price || 0) * Number(item.quantity || 0))}</p>
                                        <button type="button" aria-label={`Remove ${item.product?.name || 'product'} from cart`} data-tooltip={`Remove ${item.product?.name || 'product'} from cart`} onClick={() => removeItem(item.id)} style={{ marginTop: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: 6, cursor: 'pointer' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <aside style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#ffffff', padding: 14 }}>
                            <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 800 }}>Order Summary</h3>
                            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(cartSummary?.subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                    <span>Shipping</span>
                                    <span>{formatCurrency(cartSummary?.shipping)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                    <span>Tax</span>
                                    <span>{formatCurrency(cartSummary?.tax)}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: 10, borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ color: '#0f172a' }}>Total</strong>
                                <strong style={{ color: '#f97316', fontSize: 22 }}>{formatCurrency(cartSummary?.total)}</strong>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowCheckoutModal(true)}
                                style={{ marginTop: 12, display: 'block', width: '100%', textAlign: 'center', border: 'none', borderRadius: 10, background: '#f97316', color: '#ffffff', padding: '10px 12px', fontWeight: 800, cursor: 'pointer' }}
                            >
                                Proceed to Checkout
                            </button>
                        </aside>
                    </div>
                </section>
            ) : null}

            {showCheckoutModal ? (
                <Checkout
                    mode="modal"
                    initialPromoCode={initialPromoCode}
                    onClose={() => setShowCheckoutModal(false)}
                    onSuccess={() => {
                        setShowCheckoutModal(false);
                        navigate('/dashboard/orders');
                    }}
                />
            ) : null}
        </>
    );
}
