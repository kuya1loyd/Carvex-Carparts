import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import productService from '../services/productService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ShoppingCart, Heart, Share2, CheckCircle, AlertCircle } from 'lucide-react';
import { FALLBACK_PRODUCT_IMAGE, resolveProductImage } from '../utils/productImage';
import PageSkeleton from '../components/Skeleton';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const normalizePrice = (value) => {
    const numeric = typeof value === 'string' ? parseFloat(value) : Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeStock = (value) => {
    const numeric = typeof value === 'string' ? parseInt(value, 10) : Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

export default function ProductDetail() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [isAdded, setIsAdded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { addItem } = useCart();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setError(null);
                setImageError(false);
                const res = await productService.getById(id);

                if (res.data?.data) {
                    setProduct(res.data.data);
                } else {
                    setError('Product not found');
                }
            } catch (err) {
                console.error('Failed to fetch product:', err);
                setError(err.response?.data?.message || 'Failed to load product');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    const handleAddToCart = async () => {
        if (!isAuthenticated) {
            const redirect = `${location.pathname}${location.search}`;
            navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
            return;
        }

        try {
            await addItem(product.id, quantity, {
                name: product.name,
                price: product.price,
                images: product.images,
                brand: product.brand,
            });
            setIsAdded(true);
            setTimeout(() => setIsAdded(false), 2000);
        } catch (err) {
            console.error('Failed to add to cart:', err);
        }
    };

    if (loading) {
        return <PageSkeleton variant="detail" label="Loading product details" />;
    }

    if (error || !product) {
        return (
            <div className="product-detail-page error-state">
                <div className="state-card">
                    <AlertCircle size={28} />
                    <h2 className="state-title">Product Not Found</h2>
                    <p className="state-copy">
                        {error || 'The product you are looking for does not exist or has been removed.'}
                    </p>
                    <Link to={location.pathname.startsWith('/dashboard/') ? '/dashboard/products' : '/products'} className="link-back">
                        <ChevronLeft size={18} />
                        Back to Products
                    </Link>
                </div>
            </div>
        );
    }

    const categoryLabel = typeof product.category === 'string'
        ? product.category
        : product.category?.name || 'N/A';

    const stockCount = normalizeStock(product.stock);
    const hasGallery = Array.isArray(product.images) && product.images.length > 1;
    const backTo = location.pathname.startsWith('/dashboard/') ? '/dashboard/products' : '/products';

    return (
        <div className="product-detail-page">
            <div className="product-detail-container">
                <div className="product-detail-topbar">
                    <Link to={backTo} className="link-back">
                        <ChevronLeft size={18} />
                        Back to Products
                    </Link>
                </div>

                <div className="product-detail-wrapper">
                    <section className="product-image-section">
                        <div className="product-media-card">
                            <div className="product-main-image">
                                <div className="product-badge-row">
                                    {product.brand ? (
                                        <span className="product-badge product-badge--brand">{product.brand}</span>
                                    ) : <span />}
                                    <span className={`product-badge product-badge--status ${stockCount > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                        {stockCount > 0 ? 'Ready to ship' : 'Unavailable'}
                                    </span>
                                </div>

                                {!imageError ? (
                                    <img
                                        src={resolveProductImage(product.images)}
                                        alt={product.name}
                                        className="main-image"
                                        onError={(event) => {
                                            if (event.currentTarget.dataset.fallbackApplied === '1') {
                                                setImageError(true);
                                                return;
                                            }

                                            event.currentTarget.dataset.fallbackApplied = '1';
                                            event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                                        }}
                                    />
                                ) : (
                                    <div className="product-image-fallback">
                                        <AlertCircle size={28} />
                                        <p>No image available</p>
                                    </div>
                                )}
                            </div>

                            {hasGallery && (
                                <div className="product-thumb-grid">
                                    {product.images.slice(0, 4).map((img, idx) => (
                                        <div key={idx} className="product-thumb">
                                            <img
                                                src={resolveProductImage(img)}
                                                alt={`Product ${idx + 1}`}
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="product-info-section">
                        <div className="product-header">
                            <div className="product-chip-row">
                                {product.brand && (
                                    <span className="product-chip product-chip--brand">{product.brand}</span>
                                )}
                                <span className="product-chip">{categoryLabel}</span>
                            </div>

                            <h1 className="product-title">{product.name}</h1>

                            {product.sku && (
                                <p className="product-sku">SKU: {product.sku}</p>
                            )}
                        </div>

                        <div className="product-summary-card">
                            <div className="product-price-section">
                                <span className="section-eyebrow">Price</span>
                                <p className="product-price">
                                    {currencyFormatter.format(normalizePrice(product.price))}
                                </p>
                            </div>

                            <div className={`product-status ${stockCount > 0 ? 'stock-available' : 'stock-unavailable'}`}>
                                {stockCount > 0 ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                <span>
                                    {stockCount > 0 ? `In stock (${stockCount} available)` : 'Out of stock'}
                                </span>
                            </div>
                        </div>

                        {product.description && (
                            <div className="product-card">
                                <h2 className="section-title">Description</h2>
                                <p className="product-description">{product.description}</p>
                            </div>
                        )}

                        <div className="product-detail-panels">
                            <div className="product-card">
                                <h2 className="section-title">Product info</h2>
                                <div className="product-spec-grid">
                                    <div className="spec-item">
                                        <span className="spec-label">Category</span>
                                        <span className="spec-value">{categoryLabel}</span>
                                    </div>
                                    <div className="spec-item">
                                        <span className="spec-label">Brand</span>
                                        <span className="spec-value">{product.brand || 'N/A'}</span>
                                    </div>
                                    <div className="spec-item">
                                        <span className="spec-label">Stock</span>
                                        <span className="spec-value">
                                            {stockCount > 0 ? `${stockCount} units ready` : 'Currently unavailable'}
                                        </span>
                                    </div>
                                    <div className="spec-item">
                                        <span className="spec-label">Availability</span>
                                        <span className="spec-value">
                                            {stockCount > 0 ? 'Ready to order' : 'Restocking'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <aside className="product-order-panel">
                                <h2 className="section-title">Order panel</h2>

                                <div className="quantity-selector">
                                    <label htmlFor="product-quantity">Quantity</label>
                                    <div className="quantity-input-group">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            disabled={stockCount === 0}
                                        >
                                            -
                                        </button>
                                        <input
                                            id="product-quantity"
                                            type="number"
                                            min="1"
                                            max={stockCount}
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, Math.min(stockCount, parseInt(e.target.value, 10) || 1)))}
                                            disabled={stockCount === 0}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(Math.min(stockCount, quantity + 1))}
                                            disabled={quantity >= stockCount || stockCount === 0}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className="stock-hint">
                                        {stockCount > 0 ? `${stockCount} available` : 'Out of stock'}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddToCart}
                                    disabled={stockCount === 0}
                                    className={`btn-add-to-cart ${isAdded ? 'added' : ''}`}
                                >
                                    {isAdded ? (
                                        <>
                                            <CheckCircle size={18} />
                                            Added to Cart
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingCart size={18} />
                                            Add to Cart
                                        </>
                                    )}
                                </button>

                                <div className="product-support-actions">
                                    <button type="button" className="btn-utility">
                                        <Heart size={17} />
                                        Save
                                    </button>
                                    <button type="button" className="btn-utility">
                                        <Share2 size={17} />
                                        Share
                                    </button>
                                </div>
                            </aside>
                        </div>

                        <div className="product-perks">
                            <div className="perk-card">
                                <CheckCircle size={18} />
                                <div>
                                    <strong>Shipping support</strong>
                                    <p>Free shipping on orders over PHP 1,000.</p>
                                </div>
                            </div>
                            <div className="perk-card">
                                <CheckCircle size={18} />
                                <div>
                                    <strong>Easy returns</strong>
                                    <p>30-day money-back guarantee for eligible items.</p>
                                </div>
                            </div>
                            <div className="perk-card">
                                <CheckCircle size={18} />
                                <div>
                                    <strong>Verified stock</strong>
                                    <p>Authentic products with live stock visibility.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
