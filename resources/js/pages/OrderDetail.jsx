import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import adminService from '../services/adminService';
import orderService from '../services/orderService';
import PageSkeleton from '../components/Skeleton';
import { CheckCircle2, PackageSearch, Truck, Home, Clock3, CircleDashed, Navigation, Map as MapIcon, ChevronLeft, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const TRACK_STEPS = [
    { key: 'placed', label: 'Order Placed', icon: PackageSearch, description: 'We received your order and are preparing it.' },
    { key: 'processing', label: 'Processing', icon: CircleDashed, description: 'Your order is being packed and checked.' },
    { key: 'shipped', label: 'Shipped', icon: Truck, description: 'Your order is on the way to you.' },
    { key: 'delivered', label: 'Delivered', icon: Home, description: 'The order has reached its destination.' },
];

const normalizeStatus = (value) => String(value || '').toLowerCase().trim();

const formatMoney = (value) => `₱${Number(value || 0).toFixed(2)}`;

const getOrderTotal = (order) => Number(order?.total_amount || order?.total || 0);

const buildTimeline = (order) => {
    const status = normalizeStatus(order?.status);
    const shippedAt = order?.shipped_at ? new Date(order.shipped_at).toLocaleString() : '';
    const deliveredAt = order?.delivered_at ? new Date(order.delivered_at).toLocaleString() : '';
    const createdAt = order?.created_at ? new Date(order.created_at).toLocaleString() : '';

    return [
        { key: 'placed', title: 'Order Placed', time: createdAt, detail: 'We received your order.' },
        { key: 'processing', title: 'Processing', time: status === 'processing' ? 'Now' : 'Completed', detail: 'Packing and verification in progress.' },
        { key: 'shipped', title: 'Shipped', time: shippedAt || 'Pending', detail: 'Your parcel has left the warehouse.' },
        { key: 'delivered', title: 'Delivered', time: deliveredAt || 'Pending', detail: 'Delivered to your address.' },
    ];
};

export default function OrderDetail() {
    const { id } = useParams();
    const location = useLocation();
    const isAdmin = location.pathname.startsWith('/admin');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        const fetchOrder = async () => {
            setLoading(true);
            setError('');

            try {
                const res = isAdmin
                    ? await adminService.getAllOrders({ params: { include_items: true, include_users: true, per_page: 300 } })
                    : await orderService.getOrderById(id);

                const rawOrders = isAdmin
                    ? res.data?.data?.data || res.data?.data || []
                    : [res.data?.data?.data || res.data?.data || null];

                const found = isAdmin
                    ? rawOrders.find((item) => String(item.id) === String(id) || String(item.order_number) === String(id))
                    : rawOrders[0];

                if (mounted) {
                    if (found) {
                        setOrder(found);
                    } else {
                        setError('Order not found');
                    }
                }
            } catch (err) {
                console.error('Failed to fetch order:', err);
                if (mounted) {
                    setError('Failed to load order details');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchOrder();
        return () => {
            mounted = false;
        };
    }, [id, isAdmin]);

    const status = normalizeStatus(order?.status);
    const isCancelled = status === 'cancelled';
    const currentStepIndex = useMemo(() => {
        if (isCancelled) return -1;
        if (status === 'delivered') return 3;
        if (status === 'shipped') return 2;
        return 1;
    }, [isCancelled, status]);

    const currentStep = useMemo(() => {
        if (isCancelled) return null;

        return TRACK_STEPS[Math.max(currentStepIndex, 0)] || TRACK_STEPS[0];
    }, [currentStepIndex, isCancelled]);

    const timeline = useMemo(() => buildTimeline(order), [order]);

    if (loading) {
        return <PageSkeleton variant="detail" label="Loading order details" />;
    }

    if (error) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#0f172a' }}>
                <h2 style={{ color: '#dc2626' }}>{error}</h2>
                <Link to={isAdmin ? '/admin/orders' : '/dashboard/orders'} className="btn btn-outline" style={{ marginTop: '1rem' }}>
                    Back to Orders
                </Link>
            </div>
        );
    }

    if (!order) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#0f172a' }}>
                <h2>Order not found</h2>
                <Link to={isAdmin ? '/admin/orders' : '/dashboard/orders'} className="btn btn-outline" style={{ marginTop: '1rem' }}>
                    Back to Orders
                </Link>
            </div>
        );
    }

    // Get status color
    const getStatusColor = (s) => {
        const statusColors = {
            delivered: { bg: '#dcfce7', color: '#166534', border: '#22c55e' },
            shipped: { bg: '#dbeafe', color: '#1e40af', border: '#3b82f6' },
            processing: { bg: '#fef3c7', color: '#92400e', border: '#f59e0b' },
            cancelled: { bg: '#fee2e2', color: '#991b1b', border: '#ef4444' },
        };
        return statusColors[s] || { bg: '#f3f4f6', color: '#374151', border: '#9ca3af' };
    };

    const statusStyle = getStatusColor(status);

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Back Link */}
                <Link 
                    to={isAdmin ? '/admin/orders' : '/dashboard/orders'} 
                    style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        color: '#64748b', 
                        textDecoration: 'none', 
                        marginBottom: '24px',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'color 0.2s'
                    }}
                >
                    <ChevronLeft size={18} />
                    Back to Orders
                </Link>

                {/* Header Card */}
                <div style={{ 
                    background: '#ffffff', 
                    borderRadius: '16px', 
                    padding: '24px 32px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                                    Order {order.order_number || `#${order.id}`}
                                </h1>
                                <span style={{ 
                                    padding: '6px 14px', 
                                    borderRadius: '20px', 
                                    fontSize: '13px', 
                                    fontWeight: 600,
                                    background: statusStyle.bg,
                                    color: statusStyle.color,
                                    border: `1px solid ${statusStyle.border}`
                                }}>
                                    {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Processing'}
                                </span>
                            </div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                                Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Order Total</p>
                            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
                                {formatMoney(getOrderTotal(order))}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress Timeline */}
                <div style={{ 
                    background: '#ffffff', 
                    borderRadius: '16px', 
                    padding: '32px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                        {/* Progress Line */}
                        <div style={{ 
                            position: 'absolute', 
                            top: '20px', 
                            left: '10%', 
                            right: '10%', 
                            height: '4px', 
                            background: '#e2e8f0',
                            zIndex: 0
                        }}>
                            <div style={{
                                width: isCancelled ? '0%' : `${Math.min((currentStepIndex / 3) * 100, 100)}%`,
                                height: '100%',
                                background: isCancelled ? '#ef4444' : '#22c55e',
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                        
                        {TRACK_STEPS.map((step, index) => {
                            const isComplete = !isCancelled && index <= currentStepIndex;
                            const isCurrent = !isCancelled && index === currentStepIndex;
                            const Icon = step.icon;
                            
                            return (
                                <div key={step.key} style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    zIndex: 1,
                                    flex: 1
                                }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        background: isComplete ? '#22c55e' : isCancelled ? '#ef4444' : '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `3px solid ${isComplete ? '#22c55e' : isCancelled && index === 0 ? '#ef4444' : '#e2e8f0'}`,
                                        marginBottom: '12px'
                                    }}>
                                        <Icon size={20} color={isComplete ? '#ffffff' : isCancelled && index === 0 ? '#ef4444' : '#94a3b8'} />
                                    </div>
                                    <p style={{ 
                                        margin: 0, 
                                        fontSize: '13px', 
                                        fontWeight: isComplete || isCurrent ? 600 : 500, 
                                        color: isComplete || isCurrent ? '#0f172a' : '#94a3b8',
                                        textAlign: 'center'
                                    }}>
                                        {step.label}
                                    </p>
                                    <p style={{ 
                                        margin: '4px 0 0', 
                                        fontSize: '11px', 
                                        color: '#94a3b8',
                                        textAlign: 'center',
                                        maxWidth: '100px'
                                    }}>
                                        {index === currentStepIndex && !isCancelled ? 'Current' : index < currentStepIndex ? 'Completed' : 'Pending'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Two Column Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
                    {/* Left Column */}
                    <div>
                        {/* Order Items */}
                        <div style={{ 
                            background: '#ffffff', 
                            borderRadius: '16px', 
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            overflow: 'hidden',
                            marginBottom: '24px'
                        }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                                    Order Items ({order.items?.length || 0})
                                </h2>
                            </div>
                            <div>
                                {order.items && order.items.length > 0 ? (
                                    order.items.map((item, index) => (
                                        <div 
                                            key={item.id} 
                                            style={{ 
                                                display: 'flex', 
                                                gap: '16px',
                                                padding: '20px 24px',
                                                borderBottom: index < order.items.length - 1 ? '1px solid #f1f5f9' : 'none'
                                            }}
                                        >
                                            {/* Product Image */}
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: '10px',
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                overflow: 'hidden'
                                            }}>
                                                {item.product?.images?.[0] ? (
                                                    <img 
                                                        src={item.product.images[0]} 
                                                        alt={item.product?.name || 'Product'}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <PackageSearch size={28} color="#94a3b8" />
                                                )}
                                            </div>
                                            
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                                                    {item.product?.name || 'Unknown Product'}
                                                </h4>
                                                {item.product?.brand && (
                                                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b' }}>
                                                        {item.product.brand}
                                                    </p>
                                                )}
                                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                                    Qty: {item.quantity}
                                                </p>
                                            </div>
                                            
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                                                    {formatMoney(item.unit_price || item.price)}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                                    × {item.quantity}
                                                </p>
                                                <p style={{ margin: '8px 0 0', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                                                    {formatMoney((item.unit_price || item.price || 0) * item.quantity)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#64748b' }}>
                                        <PackageSearch size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                                        <p>No items in this order</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shipping Info */}
                        <div style={{ 
                            background: '#ffffff', 
                            borderRadius: '16px', 
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: '#eff6ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MapPin size={20} color="#3b82f6" />
                                </div>
                                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                                    Shipping Address
                                </h2>
                            </div>
                            
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                                    {order.user?.name || 'Customer'}
                                </p>
                                <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                                    {order.shipping_address || 'No address provided'}
                                </p>
                                {(order.shipping_city || order.shipping_province || order.shipping_region) && (
                                    <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#64748b' }}>
                                        {[order.shipping_city, order.shipping_province, order.shipping_region].filter(Boolean).join(', ')}
                                        {order.shipping_zip && ` ${order.shipping_zip}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div>
                        {/* Live Tracking Map - At Top */}
                        {(order.status === 'shipped' || order.status === 'processing' || order.status === 'delivered') && (
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <DeliveryMap
                                    status={order.status}
                                    currentStepIndex={currentStepIndex}
                                    isCancelled={isCancelled}
                                    shippingAddress={order.shipping_address}
                                    shippingRegion={order.shipping_region}
                                    shippingCity={order.shipping_city}
                                    shippingProvince={order.shipping_province}
                                />
                            </div>
                        )}

                        {/* Order Summary */}
                        <div style={{ 
                            background: '#ffffff', 
                            borderRadius: '16px', 
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            marginBottom: '24px'
                        }}>
                            <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                                Order Summary
                            </h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: '#64748b' }}>Subtotal</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                        {formatMoney(order.subtotal_amount || (getOrderTotal(order) - Number(order.tax_amount || 0) - Number(order.shipping_amount || 0)))}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: '#64748b' }}>Shipping</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                        {formatMoney(order.shipping_amount)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: '#64748b' }}>Tax</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                        {formatMoney(order.tax_amount)}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ padding: '16px 0 0', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>Total</span>
                                <span style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
                                    {formatMoney(getOrderTotal(order))}
                                </span>
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div style={{ 
                            background: '#ffffff', 
                            borderRadius: '16px', 
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            marginBottom: '24px'
                        }}>
                            <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                                Payment Information
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: '#64748b' }}>Method</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                        {order.payment_method?.toUpperCase() || 'COD'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: '#64748b' }}>Status</span>
                                    <span style={{ 
                                        color: order.payment_status === 'paid' ? '#16a34a' : '#f59e0b',
                                        fontWeight: 500,
                                        textTransform: 'capitalize'
                                    }}>
                                        {order.payment_status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tracking Info */}
                        <div style={{ 
                            background: '#ffffff', 
                            borderRadius: '16px', 
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                                Tracking Information
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#64748b' }}>Tracking Number</p>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                                        {order.tracking_number || 'Not assigned yet'}
                                    </p>
                                </div>
                                {order.shipped_at && (
                                    <div>
                                        <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#64748b' }}>Shipped Date</p>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#0f172a' }}>
                                            {new Date(order.shipped_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                )}
                                {order.delivered_at && (
                                    <div>
                                        <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#64748b' }}>Delivered Date</p>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#0f172a' }}>
                                            {new Date(order.delivered_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DeliveryMap({ status, currentStepIndex, isCancelled, shippingAddress, shippingRegion, shippingCity, shippingProvince }) {
    const mapRef = React.useRef(null);
    const progressPercent = isCancelled ? 0 : Math.min((currentStepIndex / 3) * 100, 100);

    // Simple coordinate lookup based on common Philippine cities
    const getCityCoordinates = (address) => {
        const addr = (address || '').toLowerCase();
        
        // Mindanao cities
        if (addr.includes('davao')) return { coords: [7.1907, 125.4553], name: 'Davao City' };
        if (addr.includes('cdo') || addr.includes('cagayan de oro') || addr.includes('cagayan')) return { coords: [8.4542, 124.6319], name: 'Cagayan de Oro' };
        if (addr.includes('zamboanga')) return { coords: [6.9214, 122.0790], name: 'Zamboanga City' };
        if (addr.includes('general santos') || addr.includes('gensan')) return { coords: [6.1164, 125.1716], name: 'General Santos' };
        if (addr.includes('butuan')) return { coords: [8.9475, 125.5406], name: 'Butuan City' };
        if (addr.includes('cotabato')) return { coords: [7.2236, 124.2464], name: 'Cotabato City' };
        if (addr.includes('iligan')) return { coords: [8.2280, 124.2452], name: 'Iligan City' };
        if (addr.includes('surigao')) return { coords: [9.7840, 125.4888], name: 'Surigao City' };
        if (addr.includes('tandag')) return { coords: [9.0793, 126.1953], name: 'Tandag City' };
        if (addr.includes('bislig')) return { coords: [8.2170, 126.2733], name: 'Bislig City' };
        if (addr.includes('cabadbaran')) return { coords: [9.1008, 125.5435], name: 'Cabadbaran City' };
        if (addr.includes('nasipit')) return { coords: [9.0647, 125.5103], name: 'Nasipit' };
        if (addr.includes('prosperidad')) return { coords: [8.6208, 125.9133], name: 'Prosperidad' };
        if (addr.includes('bayugan')) return { coords: [8.7542, 125.7917], name: 'Bayugan City' };
        if (addr.includes('san jose') && (addr.includes('dinagat') || addr.includes('dinagat islands'))) return { coords: [10.0833, 125.5833], name: 'San Jose, Dinagat Islands' };
        // Caraga Region - various cities and municipalities
        if (addr.includes('caraga')) return { coords: [8.9475, 125.5406], name: 'Caraga Region (Butuan)' };
        if (addr.includes('agusan del norte')) return { coords: [8.9475, 125.5406], name: 'Agusan del Norte' };
        if (addr.includes('agusan del sur')) return { coords: [8.6208, 125.9133], name: 'Agusan del Sur' };
        if (addr.includes('surigao del norte')) return { coords: [9.7840, 125.4888], name: 'Surigao del Norte' };
        if (addr.includes('surigao del sur')) return { coords: [8.2170, 126.2733], name: 'Surigao del Sur' };
        if (addr.includes('dinagat islands')) return { coords: [10.0833, 125.5833], name: 'Dinagat Islands' };
        if (addr.includes('lianga')) return { coords: [8.0466, 126.0903], name: 'Lianga, Surigao del Sur' };
        if (addr.includes('hinatuan')) return { coords: [8.3728, 126.3366], name: 'Hinatuan, Surigao del Sur' };
        if (addr.includes('barobo')) return { coords: [8.5380, 126.2214], name: 'Barobo, Surigao del Sur' };
        if (addr.includes('marihatag')) return { coords: [8.8008, 126.2964], name: 'Marihatag, Surigao del Sur' };
        if (addr.includes('cortes')) return { coords: [9.2802, 126.1809], name: 'Cortes, Surigao del Sur' };
        if (addr.includes('lanuza')) return { coords: [9.2332, 125.9628], name: 'Lanuza, Surigao del Sur' };
        if (addr.includes('carrascal')) return { coords: [9.3669, 125.9504], name: 'Carrascal, Surigao del Sur' };
        if (addr.includes('cantilan')) return { coords: [9.3386, 125.9786], name: 'Cantilan, Surigao del Sur' };
        if (addr.includes('madrid')) return { coords: [9.2630, 125.9644], name: 'Madrid, Surigao del Sur' };
        if (addr.includes('san miguel')) return { coords: [8.9455, 126.0414], name: 'San Miguel, Surigao del Sur' };
        if (addr.includes('tago')) return { coords: [9.0197, 126.0895], name: 'Tago, Surigao del Sur' };
        if (addr.includes('san agustin')) return { coords: [8.7465, 126.2215], name: 'San Agustin, Surigao del Sur' };
        if (addr.includes('del carmen')) return { coords: [9.8711, 125.9693], name: 'Del Carmen, Surigao del Norte' };
        if (addr.includes('sison')) return { coords: [9.6576, 125.9540], name: 'Sison, Surigao del Norte' };
        if (addr.includes('mainit')) return { coords: [9.5402, 125.5248], name: 'Mainit, Surigao del Norte' };
        if (addr.includes('malimono')) return { coords: [9.4174, 125.8023], name: 'Malimono, Surigao del Norte' };
        if (addr.includes('anao')) return { coords: [9.7524, 125.9386], name: 'Anao-aon, Surigao del Norte' };
        if (addr.includes('dapa')) return { coords: [9.7592, 126.0522], name: 'Dapa, Siargao' };
        if (addr.includes('socorro')) return { coords: [9.6225, 125.9652], name: 'Socorro, Surigao del Norte' };
        if (addr.includes('pilar')) return { coords: [9.8620, 126.0981], name: 'Pilar, Surigao del Norte' };
        if (addr.includes('sta monica') || addr.includes('santa monica')) return { coords: [9.7803, 126.0140], name: 'Sta. Monica, Siargao' };
        if (addr.includes('general luna')) return { coords: [9.8040, 126.1738], name: 'General Luna, Siargao' };
        if (addr.includes('tubajon')) return { coords: [10.3280, 125.5718], name: 'Tubajon, Dinagat Islands' };
        if (addr.includes('loreto')) return { coords: [10.3625, 125.5918], name: 'Loreto, Dinagat Islands' };
        if (addr.includes('libjo')) return { coords: [10.1965, 125.5225], name: 'Libjo, Dinagat Islands' };
        if (addr.includes('cinging')) return { coords: [10.2954, 125.6366], name: 'Cagdianao, Dinagat Islands' };
        if (addr.includes('basilisa')) return { coords: [10.1316, 125.5947], name: 'Basilisa, Dinagat Islands' };
        if (addr.includes('tubigon')) return { coords: [8.8524, 125.5704], name: 'Tubigon, Agusan del Norte' };
        if (addr.includes('jabonga')) return { coords: [9.3435, 125.5116], name: 'Jabonga, Agusan del Norte' };
        if (addr.includes('kitcharao')) return { coords: [9.4512, 125.5736], name: 'Kitcharao, Agusan del Norte' };
        if (addr.includes('magallanes')) return { coords: [9.0208, 125.5189], name: 'Magallanes, Agusan del Norte' };
        if (addr.includes('remedios t')) return { coords: [8.8238, 125.5964], name: 'Remedios T. Romualdez, Agusan del Norte' };
        if (addr.includes('buenavista')) return { coords: [8.9768, 125.4086], name: 'Buenavista, Agusan del Norte' };
        if (addr.includes('carmen')) return { coords: [8.9913, 125.2968], name: 'Carmen, Agusan del Norte' };
        if (addr.includes('las nieves')) return { coords: [8.7365, 125.6032], name: 'Las Nieves, Agusan del Norte' };
        if (addr.includes('santiago')) return { coords: [9.3002, 125.5586], name: 'Santiago, Agusan del Norte' };
        if (addr.includes('trento')) return { coords: [8.0458, 126.0636], name: 'Trento, Agusan del Sur' };
        if (addr.includes('bunawan')) return { coords: [8.1681, 125.9950], name: 'Bunawan, Agusan del Sur' };
        if (addr.includes('rosario')) return { coords: [8.3832, 126.0017], name: 'Rosario, Agusan del Sur' };
        if (addr.includes('sta josefa') || addr.includes('santa josefa')) return { coords: [7.9908, 126.0291], name: 'Sta. Josefa, Agusan del Sur' };
        if (addr.includes('talacogon')) return { coords: [8.4376, 125.7877], name: 'Talacogon, Agusan del Sur' };
        if (addr.includes('veruela')) return { coords: [7.7737, 125.9553], name: 'Veruela, Agusan del Sur' };
        if (addr.includes('loreto')) return { coords: [8.1846, 125.8554], name: 'Loreto, Agusan del Sur' };
        if (addr.includes('lapaz')) return { coords: [8.3173, 125.8932], name: 'La Paz, Agusan del Sur' };
        if (addr.includes('esperanza')) return { coords: [8.6762, 125.6496], name: 'Esperanza, Agusan del Sur' };
        if (addr.includes('san luis')) return { coords: [8.4860, 125.7451], name: 'San Luis, Agusan del Sur' };
        if (addr.includes('aguasan')) return { coords: [8.9475, 125.5406], name: 'Agusan Region' };
        if (addr.includes('dipolog')) return { coords: [8.5667, 123.3347], name: 'Dipolog City' };
        if (addr.includes('ozamiz')) return { coords: [8.1458, 123.8403], name: 'Ozamiz City' };
        if (addr.includes('pagadian')) return { coords: [7.8378, 123.4344], name: 'Pagadian City' };
        if (addr.includes('tagum')) return { coords: [7.3581, 125.6973], name: 'Tagum City' };
        if (addr.includes('koronadal') || addr.includes('marbel')) return { coords: [6.4974, 124.8471], name: 'Koronadal City' };
        if (addr.includes('kidapawan')) return { coords: [7.0084, 125.0894], name: 'Kidapawan City' };
        if (addr.includes('valencia') && addr.includes('bukidnon')) return { coords: [7.9127, 125.0779], name: 'Valencia City' };
        if (addr.includes('cagayan') && addr.includes('valley')) return { coords: [8.4542, 124.6319], name: 'Cagayan de Oro' };
        
        // Visayas cities
        if (addr.includes('cebu')) return { coords: [10.3157, 123.8854], name: 'Cebu City' };
        if (addr.includes('iloilo')) return { coords: [10.7202, 122.5621], name: 'Iloilo City' };
        if (addr.includes('bacolod')) return { coords: [10.6763, 122.9509], name: 'Bacolod City' };
        if (addr.includes('tacloban')) return { coords: [11.2543, 125.0060], name: 'Tacloban City' };
        if (addr.includes('dumaguete')) return { coords: [9.3068, 123.3054], name: 'Dumaguete City' };
        if (addr.includes('tagbilaran')) return { coords: [9.6729, 123.8730], name: 'Tagbilaran City' };
        if (addr.includes('roxas')) return { coords: [11.5886, 122.7513], name: 'Roxas City' };
        if (addr.includes('kalibo')) return { coords: [11.7079, 122.3667], name: 'Kalibo' };
        if (addr.includes('boracay')) return { coords: [11.9668, 121.9256], name: 'Boracay' };
        
        // Luzon cities (default to Manila if no match)
        if (addr.includes('baguio')) return { coords: [16.4023, 120.5960], name: 'Baguio City' };
        if (addr.includes('angeles')) return { coords: [15.1401, 120.5928], name: 'Angeles City' };
        if (addr.includes('olongapo')) return { coords: [14.8386, 120.2842], name: 'Olongapo City' };
        if (addr.includes('batangas')) return { coords: [13.7565, 121.0583], name: 'Batangas City' };
        if (addr.includes('lipa')) return { coords: [13.9414, 121.1642], name: 'Lipa City' };
        if (addr.includes('quezon city') || addr.includes('quezon')) return { coords: [14.6760, 121.0437], name: 'Quezon City' };
        if (addr.includes('caloocan')) return { coords: [14.6498, 120.9819], name: 'Caloocan City' };
        if (addr.includes('mandaluyong')) return { coords: [14.5794, 121.0359], name: 'Mandaluyong City' };
        if (addr.includes('makati')) return { coords: [14.5547, 121.0244], name: 'Makati City' };
        if (addr.includes('pasig')) return { coords: [14.5764, 121.0851], name: 'Pasig City' };
        if (addr.includes('taguig')) return { coords: [14.5176, 121.0509], name: 'Taguig City' };
        if (addr.includes('parañaque') || addr.includes('paranaque')) return { coords: [14.4793, 121.0198], name: 'Parañaque City' };
        if (addr.includes('las piñas') || addr.includes('las pinas')) return { coords: [14.4445, 120.9939], name: 'Las Piñas City' };
        if (addr.includes('muntinlupa')) return { coords: [14.4081, 121.0425], name: 'Muntinlupa City' };
        if (addr.includes('valenzuela')) return { coords: [14.7011, 120.9830], name: 'Valenzuela City' };
        if (addr.includes('malabon')) return { coords: [14.6659, 120.9416], name: 'Malabon City' };
        if (addr.includes('navotas')) return { coords: [14.7122, 120.9414], name: 'Navotas City' };
        if (addr.includes('marikina')) return { coords: [14.6507, 121.1029], name: 'Marikina City' };
        if (addr.includes('san mateo') || addr.includes('rizal')) return { coords: [14.6989, 121.1219], name: 'San Mateo, Rizal' };
        if (addr.includes('antipolo')) return { coords: [14.6255, 121.1245], name: 'Antipolo City' };
        if (addr.includes('pasay')) return { coords: [14.5378, 121.0015], name: 'Pasay City' };
        if (addr.includes('san juan')) return { coords: [14.5994, 121.0358], name: 'San Juan City' };
        if (addr.includes('pateros')) return { coords: [14.5392, 121.0637], name: 'Pateros' };
        
        // Default - try to extract any city name from address
        const cityMatch = addr.match(/([a-z\s]+)(?:,|\s+city|\s+province|$)/i);
        const extractedCity = cityMatch ? cityMatch[1].trim() : 'Unknown';
        
        console.log('Geocoding input:', address);
        console.log('Extracted possible city:', extractedCity);
        console.log('Available fields:', { shippingAddress, shippingCity, shippingProvince, shippingRegion });
        
        return { coords: [14.5995, 120.9842], name: `Manila (default) - "${extractedCity}" not in database` };
    };
    
    // Region-based coordinates for better detection
    const getRegionCoordinates = (region, city, province) => {
        const regionLower = (region || '').toLowerCase();
        const cityLower = (city || '').toLowerCase();
        const provinceLower = (province || '').toLowerCase();
        
        // Caraga Region (Region XIII)
        if (regionLower.includes('caraga') || regionLower.includes('xiii') || regionLower.includes('13')) {
            if (cityLower.includes('butuan')) return { coords: [8.9475, 125.5406], name: 'Butuan City, Caraga' };
            if (cityLower.includes('surigao') && provinceLower.includes('sur')) return { coords: [9.0793, 126.1953], name: 'Tandag City, Surigao del Sur' };
            if (cityLower.includes('bayugan')) return { coords: [8.7542, 125.7917], name: 'Bayugan City, Caraga' };
            if (cityLower.includes('cabadbaran')) return { coords: [9.1008, 125.5435], name: 'Cabadbaran City, Caraga' };
            if (provinceLower.includes('surigao del norte')) return { coords: [9.7840, 125.4888], name: 'Surigao del Norte, Caraga' };
            if (provinceLower.includes('surigao del sur')) return { coords: [9.0793, 126.1953], name: 'Surigao del Sur, Caraga' };
            if (provinceLower.includes('agusan del norte')) return { coords: [8.9475, 125.5406], name: 'Agusan del Norte, Caraga' };
            if (provinceLower.includes('agusan del sur')) return { coords: [8.6208, 125.9133], name: 'Agusan del Sur, Caraga' };
            if (provinceLower.includes('dinagat')) return { coords: [10.0833, 125.5833], name: 'Dinagat Islands, Caraga' };
            return { coords: [8.9475, 125.5406], name: 'Caraga Region (Butuan area)' };
        }
        
        // Region X - Northern Mindanao
        if (regionLower.includes('northern mindanao') || regionLower.includes('x') || regionLower.includes('10')) {
            if (cityLower.includes('cagayan')) return { coords: [8.4542, 124.6319], name: 'Cagayan de Oro, Northern Mindanao' };
            if (cityLower.includes('iligan')) return { coords: [8.2280, 124.2452], name: 'Iligan City, Northern Mindanao' };
            if (cityLower.includes('ozamiz')) return { coords: [8.1458, 123.8403], name: 'Ozamiz City, Northern Mindanao' };
            if (cityLower.includes('dipolog')) return { coords: [8.5667, 123.3347], name: 'Dipolog City, Northern Mindanao' };
            return { coords: [8.4542, 124.6319], name: 'Northern Mindanao Region' };
        }
        
        // Region XI - Davao Region
        if (regionLower.includes('davao') || regionLower.includes('xi') || regionLower.includes('11')) {
            if (cityLower.includes('davao')) return { coords: [7.1907, 125.4553], name: 'Davao City, Davao Region' };
            if (cityLower.includes('tagum')) return { coords: [7.3581, 125.6973], name: 'Tagum City, Davao Region' };
            return { coords: [7.1907, 125.4553], name: 'Davao Region' };
        }
        
        // Region XII - SOCCSKSARGEN
        if (regionLower.includes('soccsksargen') || regionLower.includes('xii') || regionLower.includes('12')) {
            if (cityLower.includes('general santos') || cityLower.includes('gensan')) return { coords: [6.1164, 125.1716], name: 'General Santos City, SOCCSKSARGEN' };
            if (cityLower.includes('koronadal')) return { coords: [6.4974, 124.8471], name: 'Koronadal City, SOCCSKSARGEN' };
            if (cityLower.includes('kidapawan')) return { coords: [7.0084, 125.0894], name: 'Kidapawan City, SOCCSKSARGEN' };
            return { coords: [6.4974, 124.8471], name: 'SOCCSKSARGEN Region' };
        }
        
        return null; // No region match
    };
    
    // Override: Try region-based detection first
    // Combine all location data for better geocoding
    const fullLocationString = [
        shippingAddress,
        shippingCity,
        shippingProvince,
        shippingRegion
    ].filter(Boolean).join(', ');
    
    // Get customer position based on combined location data
    const locationData = getCityCoordinates(fullLocationString);
    
    // Override: Try region-based detection first for better accuracy
    const regionData = getRegionCoordinates(shippingRegion, shippingCity, shippingProvince);
    
    // Use region data if available, otherwise fall back to city-based detection
    const finalLocationData = regionData || locationData;
    
    if (regionData) {
        console.log('✅ Region-based detection:', regionData.name);
    } else {
        console.log('📍 City-based detection:', locationData.name);
    }
    
    const customerPos = finalLocationData.coords;
    const detectedCity = finalLocationData.name;
    
    // Warehouse and distribution are near customer but offset for visual route
    const warehousePos = [customerPos[0] + 0.08, customerPos[1] - 0.05];
    const distributionPos = [customerPos[0] + 0.04, customerPos[1] - 0.02];

    const getTruckPosition = () => {
        if (currentStepIndex === 0) return warehousePos;
        if (currentStepIndex === 1) {
            const t = 0.5;
            return [
                warehousePos[0] + (distributionPos[0] - warehousePos[0]) * t,
                warehousePos[1] + (distributionPos[1] - warehousePos[1]) * t
            ];
        }
        if (currentStepIndex === 2) {
            const t = 0.6;
            return [
                distributionPos[0] + (customerPos[0] - distributionPos[0]) * t,
                distributionPos[1] + (customerPos[1] - distributionPos[1]) * t
            ];
        }
        return customerPos;
    };

    React.useEffect(() => {
        if (!mapRef.current) return;

        const map = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: false
        }).setView(getTruckPosition(), 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        const createCustomIcon = (emoji, color, pulse = false) => {
            return L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                    width: 36px;
                    height: 36px;
                    background: ${color};
                    border-radius: 50%;
                    display: flex;
                    alignItems: center;
                    justifyContent: center;
                    font-size: 18px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    border: 3px solid white;
                    ${pulse ? 'animation: pulseMarker 2s infinite;' : ''}
                ">${emoji}</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });
        };

        // Markers
        L.marker(warehousePos, {
            icon: createCustomIcon('📦', '#0ea5e9')
        }).addTo(map).bindPopup('<b>Warehouse</b><br>Order origin');

        L.marker(distributionPos, {
            icon: createCustomIcon('🏭', currentStepIndex >= 1 ? '#0ea5e9' : '#94a3b8')
        }).addTo(map).bindPopup('<b>Distribution Center</b>');

        L.marker(customerPos, {
            icon: createCustomIcon('🏠', currentStepIndex >= 3 ? '#22c55e' : '#f97316', currentStepIndex === 2)
        }).addTo(map).bindPopup(`<b>Delivery Address</b><br>${shippingAddress || 'Your address'}`);

        // Route line
        const routeCoords = [warehousePos, distributionPos, customerPos];
        L.polyline(routeCoords, {
            color: '#0ea5e9',
            weight: 4,
            opacity: 0.6,
            dashArray: currentStepIndex < 3 ? '10, 10' : null
        }).addTo(map);

        // Truck
        if (!isCancelled && currentStepIndex < 3) {
            const truckPos = getTruckPosition();
            L.marker(truckPos, {
                icon: L.divIcon({
                    className: 'truck-marker',
                    html: `<div style="
                        width: 44px;
                        height: 44px;
                        background: linear-gradient(135deg, #f97316, #fb923c);
                        border-radius: 50%;
                        display: flex;
                        alignItems: center;
                        justifyContent: center;
                        box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5);
                        border: 3px solid white;
                        font-size: 22px;
                        animation: truckBounce 1s ease-in-out infinite;
                    ">🚚</div>`,
                    iconSize: [44, 44],
                    iconAnchor: [22, 22]
                }),
                zIndexOffset: 1000
            }).addTo(map).bindPopup('<b>Delivery Truck</b><br>Current location');
        }

        map.fitBounds(routeCoords, { padding: [50, 50] });

        // Invalidate size after a short delay to ensure proper rendering
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        return () => {
            map.remove();
        };
    }, [currentStepIndex, isCancelled, shippingAddress]);

    return (
        <div style={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            height: '350px',
            marginTop: '16px',
            background: '#ffffff'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapIcon size={18} color="#0ea5e9" />
                    <span style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.85rem' }}>Live Tracking</span>
                </div>
                <div style={{
                    background: isCancelled ? '#fee2e2' : currentStepIndex === 3 ? '#dcfce7' : '#dbeafe',
                    color: isCancelled ? '#b91c1c' : currentStepIndex === 3 ? '#16a34a' : '#1d4ed8',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                }}>
                    {isCancelled ? 'Cancelled' : currentStepIndex === 3 ? 'Delivered' : 'In Transit'}
                </div>
            </div>

            {/* Map */}
            <div ref={mapRef} style={{ flex: 1, height: '320px', minHeight: '320px' }} />

            {/* Footer */}
            <div style={{
                padding: '0.75rem 1rem',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isCancelled ? '#ef4444' : currentStepIndex === 3 ? '#22c55e' : '#0ea5e9',
                        animation: isCancelled ? 'none' : 'pulse 2s infinite'
                    }} />
                    <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                        {isCancelled
                            ? 'Order cancelled'
                            : currentStepIndex === 0
                            ? 'At warehouse - Preparing'
                            : currentStepIndex === 1
                            ? 'In transit to distribution'
                            : currentStepIndex === 2
                            ? `Out for delivery - ${Math.round(progressPercent)}%`
                            : 'Delivered'}
                    </span>
                </div>
                <div style={{
                    fontSize: '0.7rem',
                    color: '#64748b',
                    fontWeight: 600,
                    textAlign: 'center'
                }}>
                    📍 Detected: {detectedCity}
                </div>
            </div>

            <style>{`
                @keyframes truckBounce {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-4px) scale(1.05); }
                }
                @keyframes pulseMarker {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
                    50% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
                }
                .custom-marker, .truck-marker {
                    background: transparent !important;
                    border: none !important;
                }
            `}</style>
        </div>
    );
}
