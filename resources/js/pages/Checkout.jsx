import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import { Lock, Truck, CreditCard, Tag, CheckCircle, X } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

export default function Checkout({ mode = 'page', onClose, onSuccess, initialPromoCode = '' }) {
    const { cartItems, cartSummary, clearCart } = useCart();
    const { user } = useAuth();
    const [firstName, setFirstName] = useState(() => (user?.name || '').split(' ').slice(0, 1).join(''));
    const [lastName, setLastName] = useState(() => (user?.name || '').split(' ').slice(1).join(' '));
    const [phone, setPhone] = useState(user?.phone || '');
    const [shippingAddress, setShippingAddress] = useState(user?.shipping_address || user?.address || '');
    const [shippingCity, setShippingCity] = useState(user?.city || '');
    const [shippingRegion, setShippingRegion] = useState(user?.region || '');
    const [shippingZip, setShippingZip] = useState(user?.postal_code || '');
    const [paymentMethod, setPaymentMethod] = useState('cod');
    const [loading, setLoading] = useState(false);
    const [promoCode, setPromoCode] = useState(() => String(initialPromoCode || '').toUpperCase());
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoFeedback, setPromoFeedback] = useState({ type: '', message: '' });
    const [applyingPromo, setApplyingPromo] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [placedOrderNumber, setPlacedOrderNumber] = useState('');
    const [gcashName, setGcashName] = useState('');
    const [gcashMobile, setGcashMobile] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardBank, setCardBank] = useState('');
    const navigate = useNavigate();
    const isModal = mode === 'modal';
    const normalizedPromoCode = String(promoCode || '').trim().toUpperCase();
    const promoDiscount = Number(appliedPromo?.discount_amount || 0);
    const subtotalAmount = Number(cartSummary?.subtotal || 0);
    const shippingAmount = Number(cartSummary?.shipping || 0);
    const discountedSubtotal = Math.max(0, subtotalAmount - promoDiscount);
    const previewTaxAmount = discountedSubtotal * 0.1;
    const previewTotalAmount = discountedSubtotal + previewTaxAmount + shippingAmount;

    const requestItems = useMemo(() => cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
    })), [cartItems]);

    useEffect(() => {
        if (!isModal) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !loading && typeof onClose === 'function') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModal, loading, onClose]);

    useEffect(() => {
        const nextCode = String(initialPromoCode || '').trim().toUpperCase();
        if (!nextCode) {
            return;
        }

        setPromoCode(nextCode);
    }, [initialPromoCode]);

    const applyPromoCode = async (codeToApply = normalizedPromoCode) => {
        const nextCode = String(codeToApply || '').trim().toUpperCase();

        if (!nextCode) {
            setAppliedPromo(null);
            setPromoFeedback({ type: 'error', message: 'Enter a promo code first.' });
            return false;
        }

        try {
            setApplyingPromo(true);
            const response = await orderService.validatePromoCode({
                code: nextCode,
                items: requestItems,
            });

            const promoData = response.data?.data || null;
            setPromoCode(nextCode);
            setAppliedPromo(promoData);
            setPromoFeedback({
                type: 'success',
                message: promoData?.discount_amount > 0
                    ? `${nextCode} applied successfully.`
                    : 'Promo code applied successfully.',
            });
            return true;
        } catch (error) {
            setAppliedPromo(null);
            setPromoFeedback({
                type: 'error',
                message: error?.response?.data?.message || 'Promo code could not be applied.',
            });
            return false;
        } finally {
            setApplyingPromo(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (normalizedPromoCode && (!appliedPromo || String(appliedPromo.code || '').toUpperCase() !== normalizedPromoCode)) {
                const promoApplied = await applyPromoCode(normalizedPromoCode);
                if (!promoApplied) {
                    return;
                }
            }

            const response = await orderService.createOrder({
                items: requestItems,
                payment_method: paymentMethod,
                promo_code: normalizedPromoCode || null,
                shipping_address: shippingAddress,
                shipping_city: shippingCity,
                shipping_region: shippingRegion,
                shipping_zip: shippingZip,
            });

            await clearCart();
            setPlacedOrderNumber(response.data?.data?.order_number || '');
            window.dispatchEvent(new CustomEvent('customer-notifications-refresh'));
            setShowSuccessModal(true);
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);

        if (typeof onSuccess === 'function') {
            onSuccess();
            return;
        }

        navigate('/dashboard/orders');
    };

    const checkoutBody = (
        <div className={`checkout-container${isModal ? ' checkout-container--modal' : ''}`}>
            <div className="checkout-header">
                <h1 className="checkout-title">Checkout</h1>
                <p className="checkout-subtitle">Complete your purchase</p>
            </div>

            <div className="checkout-content">
                {showSuccessModal ? <SuccessModal onClose={handleSuccessClose} orderNumber={placedOrderNumber} /> : null}
                {showPaymentModal ? (
                    <PaymentModal
                        paymentMethod={paymentMethod}
                        onClose={() => {
                            setShowPaymentModal(false);
                            setPaymentMethod('cod');
                        }}
                        onSubmit={() => setShowPaymentModal(false)}
                        gcashName={gcashName}
                        setGcashName={setGcashName}
                        gcashMobile={gcashMobile}
                        setGcashMobile={setGcashMobile}
                        cardNumber={cardNumber}
                        setCardNumber={setCardNumber}
                        cardExpiry={cardExpiry}
                        setCardExpiry={setCardExpiry}
                        cardCvv={cardCvv}
                        setCardCvv={setCardCvv}
                        cardBank={cardBank}
                        setCardBank={setCardBank}
                    />
                ) : null}

                <div className="checkout-grid">
                    <div className="checkout-form-col">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            <div className="checkout-section">
                                <div className="checkout-section-header">
                                    <Truck size={24} className="checkout-icon" />
                                    <h2 className="checkout-section-title">Shipping Address</h2>
                                </div>

                                <div className="checkout-form-group">
                                    <div className="checkout-form-row">
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            className="checkout-input"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            className="checkout-input"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        className="checkout-input"
                                        defaultValue={user?.email || ''}
                                        readOnly
                                        required
                                        style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                                    />

                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        className="checkout-input"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                    />

                                    <textarea
                                        placeholder="Street Address"
                                        value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)}
                                        className="checkout-textarea"
                                        rows="3"
                                        required
                                    />

                                    <div className="checkout-form-row">
                                        <select
                                            value={shippingRegion}
                                            onChange={(e) => setShippingRegion(e.target.value)}
                                            className="checkout-input"
                                            required
                                            style={{ flex: 1 }}
                                        >
                                            <option value="">Select Region</option>
                                            <option value="Caraga">Caraga (Region XIII)</option>
                                            <option value="Northern Mindanao">Northern Mindanao (Region X)</option>
                                            <option value="Davao Region">Davao Region (Region XI)</option>
                                            <option value="SOCCSKSARGEN">SOCCSKSARGEN (Region XII)</option>
                                            <option value="BARMM">BARMM</option>
                                            <option value="Zamboanga Peninsula">Zamboanga Peninsula (Region IX)</option>
                                            <option value="Central Visayas">Central Visayas (Region VII)</option>
                                            <option value="Western Visayas">Western Visayas (Region VI)</option>
                                            <option value="Eastern Visayas">Eastern Visayas (Region VIII)</option>
                                            <option value="Metro Manila">Metro Manila (NCR)</option>
                                            <option value="Calabarzon">Calabarzon (Region IV-A)</option>
                                            <option value="Central Luzon">Central Luzon (Region III)</option>
                                            <option value="Ilocos Region">Ilocos Region (Region I)</option>
                                            <option value="Cagayan Valley">Cagayan Valley (Region II)</option>
                                            <option value="Mimaropa">Mimaropa (Region IV-B)</option>
                                            <option value="Bicol Region">Bicol Region (Region V)</option>
                                            <option value="Cordillera">Cordillera (CAR)</option>
                                        </select>
                                    </div>

                                    <div className="checkout-form-row">
                                        <input
                                            type="text"
                                            placeholder="City/Municipality"
                                            className="checkout-input"
                                            value={shippingCity}
                                            onChange={(e) => setShippingCity(e.target.value)}
                                            required
                                            style={{ flex: 1 }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="ZIP Code"
                                            className="checkout-input"
                                            value={shippingZip}
                                            onChange={(e) => setShippingZip(e.target.value)}
                                            required
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="checkout-section">
                                <div className="checkout-section-header">
                                    <CreditCard size={24} className="checkout-icon" />
                                    <h2 className="checkout-section-title">Payment Method</h2>
                                </div>

                                <div className="checkout-payment-options">
                                    {['cod', 'gcash', 'card'].map((method) => (
                                        <label
                                            key={method}
                                            className={`checkout-payment-option ${paymentMethod === method ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                value={method}
                                                checked={paymentMethod === method}
                                                onChange={(e) => {
                                                    setPaymentMethod(e.target.value);
                                                    if (method === 'gcash' || method === 'card') {
                                                        setShowPaymentModal(true);
                                                    }
                                                }}
                                                className="checkout-radio"
                                            />
                                            <span className="checkout-payment-label">
                                                {method === 'cod'
                                                    ? 'Cash on Delivery'
                                                    : method === 'gcash'
                                                        ? 'GCash'
                                                        : 'Credit Card'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="checkout-section promo-section">
                                <div className="checkout-section-header">
                                    <Tag size={22} className="checkout-icon" />
                                    <h2 className="checkout-section-title">Promo Code</h2>
                                </div>
                                <div className="checkout-promo-row">
                                    <input
                                        type="text"
                                        placeholder="Enter promo code"
                                        value={promoCode}
                                        onChange={(e) => {
                                            const nextValue = e.target.value.toUpperCase();
                                            setPromoCode(nextValue);

                                            if (appliedPromo && String(appliedPromo.code || '').toUpperCase() !== nextValue.trim().toUpperCase()) {
                                                setAppliedPromo(null);
                                            }

                                            if (promoFeedback.type) {
                                                setPromoFeedback({ type: '', message: '' });
                                            }
                                        }}
                                        className="checkout-input promo-input"
                                    />
                                    <button
                                        type="button"
                                        className="checkout-btn-promo"
                                        disabled={applyingPromo}
                                        onClick={() => {
                                            void applyPromoCode();
                                        }}
                                    >
                                        {applyingPromo ? 'Applying...' : 'Apply'}
                                    </button>
                                </div>
                                {promoFeedback.message ? (
                                    <p style={{
                                        margin: '0.75rem 0 0',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        color: promoFeedback.type === 'error' ? '#dc2626' : '#16a34a',
                                    }}>
                                        {promoFeedback.message}
                                    </p>
                                ) : null}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="checkout-btn-place-order"
                            >
                                <Lock size={20} />
                                {loading ? 'Placing Order...' : 'Place Order'}
                            </button>
                        </form>
                    </div>

                    <div className="checkout-summary-col">
                        <div className="checkout-summary-card">
                            <h2 className="checkout-summary-title">Order Summary</h2>

                            <div className="checkout-summary-items">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="checkout-summary-item">
                                        <span className="checkout-item-name">
                                            {item.product?.name} x{item.quantity}
                                        </span>
                                        <span className="checkout-item-price">
                                            {formatCurrency((item.product?.price || 0) * item.quantity)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="checkout-summary-totals">
                                <div className="checkout-total-row">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotalAmount)}</span>
                                </div>

                                {promoDiscount > 0 ? (
                                    <div className="checkout-total-row">
                                        <span>Promo discount {appliedPromo?.code ? `(${appliedPromo.code})` : ''}</span>
                                        <span style={{ color: '#16a34a' }}>- {formatCurrency(promoDiscount)}</span>
                                    </div>
                                ) : null}

                                <div className="checkout-total-row">
                                    <span>Shipping</span>
                                    <span className="checkout-shipping">
                                        {shippingAmount === 0
                                            ? 'FREE'
                                            : formatCurrency(shippingAmount)}
                                    </span>
                                </div>

                                <div className="checkout-total-row">
                                    <span>Tax</span>
                                    <span>{formatCurrency(previewTaxAmount)}</span>
                                </div>
                            </div>

                            <div className="checkout-grand-total">
                                <span>Total</span>
                                <span className="checkout-total-amount">
                                    {formatCurrency(previewTotalAmount)}
                                </span>
                            </div>

                            <div className="checkout-security-badge">
                                <p>
                                    ✓ Secure checkout - Your payment information is safe
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isModal) {
        return (
            <div className="checkout-flow-modal" role="dialog" aria-modal="true" aria-label="Checkout">
                <button
                    type="button"
                    className="checkout-flow-modal__backdrop"
                    onClick={() => {
                        if (!loading && typeof onClose === 'function') {
                            onClose();
                        }
                    }}
                    aria-label="Close checkout"
                />
                <div className="checkout-flow-modal__panel" onClick={(event) => event.stopPropagation()}>
                    <div className="checkout-flow-modal__header">
                        <div>
                            <h2>Checkout</h2>
                            <p>Complete your purchase without leaving the customer panel.</p>
                        </div>
                        <button
                            type="button"
                            className="checkout-flow-modal__close"
                            onClick={() => {
                                if (!loading && typeof onClose === 'function') {
                                    onClose();
                                }
                            }}
                            aria-label="Close checkout"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="checkout-flow-modal__body">
                        {checkoutBody}
                    </div>
                </div>
            </div>
        );
    }

    return checkoutBody;
}

function SuccessModal({ onClose, orderNumber }) {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1500,
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '2.5rem 2rem',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                animation: 'modalSlideIn 0.3s ease'
            }}>
                <div style={{
                    width: '70px',
                    height: '70px',
                    background: '#dcfce7',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem'
                }}>
                    <CheckCircle size={36} color="#16a34a" />
                </div>

                <h2 style={{
                    margin: 0,
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: '0.75rem'
                }}>
                    Checkout Successful
                </h2>

                <p style={{
                    margin: 0,
                    color: '#64748b',
                    marginBottom: '1.5rem',
                    lineHeight: 1.6
                }}>
                    Thank you for your purchase. {orderNumber ? `${orderNumber} is now in processing.` : `We'll process your order soon.`} A confirmation was also sent to your notifications.
                </p>

                <button
                    onClick={onClose}
                    style={{
                        background: '#f97316',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '12px 24px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        width: '100%'
                    }}
                >
                    View My Purchases
                </button>
            </div>
        </div>
    );
}

function PaymentModal({ paymentMethod, onClose, onSubmit, gcashName, setGcashName, gcashMobile, setGcashMobile, cardNumber, setCardNumber, cardExpiry, setCardExpiry, cardCvv, setCardCvv, cardBank, setCardBank }) {
    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSubmit();
    };

    const banks = [
        'Banco de Oro (BDO)',
        'Bank of the Philippine Islands (BPI)',
        'Metropolitan Bank & Trust Company (Metrobank)',
        'Land Bank of the Philippines',
        'Philippine National Bank (PNB)',
        'Security Bank',
        'China Bank',
        'UnionBank',
        'RCBC',
        'East West Bank',
        'PSBank',
        'UCPB',
        'Maybank',
        'ANZ Bank',
        'Citibank',
        'HSBC',
        'Standard Chartered',
        'Other'
    ];

    const inputStyle = {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#1f2937',
        backgroundColor: '#ffffff',
        outline: 'none',
        transition: 'border-color 0.2s'
    };

    const selectStyle = {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#1f2937',
        backgroundColor: '#ffffff',
        outline: 'none',
        transition: 'border-color 0.2s',
        appearance: 'none',
        backgroundImage: 'linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%)',
        backgroundPosition: 'calc(100% - 15px) 50%, calc(100% - 10px) 50%',
        backgroundSize: '5px 5px, 5px 5px',
        backgroundRepeat: 'no-repeat'
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1500,
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '2.5rem',
                maxWidth: '550px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                animation: 'modalSlideIn 0.3s ease'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                        {paymentMethod === 'gcash' ? 'GCash Payment Details' : 'Credit Card Payment Details'}
                    </h2>
                    <button
                        type="button"
                        aria-label="Close payment details"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={24} color="#64748b" />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {paymentMethod === 'gcash' ? (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', marginBottom: '0.5rem' }}>
                                    Account Name
                                </label>
                                <input
                                    type="text"
                                    value={gcashName}
                                    onChange={(e) => setGcashName(e.target.value)}
                                    placeholder="Enter your GCash account name"
                                    required
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', marginBottom: '0.5rem' }}>
                                    Mobile Number
                                </label>
                                <input
                                    type="tel"
                                    value={gcashMobile}
                                    onChange={(e) => setGcashMobile(e.target.value)}
                                    placeholder="09XXXXXXXXX"
                                    required
                                    pattern="[0-9]{11}"
                                    style={inputStyle}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', marginBottom: '0.5rem' }}>
                                    Select Bank
                                </label>
                                <select
                                    value={cardBank}
                                    onChange={(e) => setCardBank(e.target.value)}
                                    required
                                    style={selectStyle}
                                >
                                    <option value="">Choose your bank</option>
                                    {banks.map((bank) => (
                                        <option key={bank} value={bank}>
                                            {bank}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', marginBottom: '0.5rem' }}>
                                    Card Number
                                </label>
                                <input
                                    type="text"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value)}
                                    placeholder="1234 5678 9012 3456"
                                    required
                                    maxLength="19"
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', marginBottom: '0.5rem' }}>
                                        Expiry Date
                                    </label>
                                    <input
                                        type="text"
                                        value={cardExpiry}
                                        onChange={(e) => setCardExpiry(e.target.value)}
                                        placeholder="MM/YY"
                                        required
                                        maxLength="5"
                                        style={inputStyle}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', marginBottom: '0.5rem' }}>
                                        CVV
                                    </label>
                                    <input
                                        type="text"
                                        value={cardCvv}
                                        onChange={(e) => setCardCvv(e.target.value)}
                                        placeholder="123"
                                        required
                                        maxLength="4"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                background: 'white',
                                color: '#64748b',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                border: 'none',
                                borderRadius: '8px',
                                background: '#f97316',
                                color: 'white',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Confirm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
