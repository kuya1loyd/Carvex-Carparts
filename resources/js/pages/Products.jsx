import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import productService from '../services/productService';
import { Filter, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { FALLBACK_PRODUCT_IMAGE, resolveProductImage } from '../utils/productImage';
import PageSkeleton from '../components/Skeleton';

export default function Products() {
    const { addItem } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [addingProductId, setAddingProductId] = useState(null);
    const [addedProductId, setAddedProductId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 8;
    
    const location = useLocation();
    const searchQuery = new URLSearchParams(location.search).get('search') || '';

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');

    const fallbackProducts = [
        { id: 1, name: 'Coolant Radiator Fluid', price: 94.95, category: 'Engine Parts', brand: 'Peak', stock: 15, sku: 'CRF-001', images: ['/images/Coolant Radiator Fluid.jpg'] },
        { id: 2, name: 'Serpentine Belt', price: 229.95, category: 'Engine Parts', brand: 'Gates', stock: 8, sku: 'SB-002', images: ['/images/Serpentine Belt.jpg'] },
        { id: 3, name: 'Shock Absorber', price: 750, category: 'Suspension', brand: 'KYB', stock: 12, sku: 'SA-003', images: ['/images/Shock Absorber.jpg'] },
        { id: 4, name: 'Brake Rotor', price: 299.99, category: 'Brake Systems', brand: 'Brembo', stock: 20, sku: 'BR-004', images: ['/images/Brake Rotor (Disc).jpg'] },
        { id: 5, name: 'Air Filter', price: 145.50, category: 'Engine Parts', brand: 'Bosch', stock: 0, sku: 'AF-005', images: ['/images/Air Filter.jpg'] },
        { id: 6, name: 'Spark Plugs', price: 89.99, category: 'Engine Parts', brand: 'NGK', stock: 25, sku: 'SP-006', images: ['/images/Spar plus.jpg'] },
    ];

    const parsePrice = (value) => {
        const numeric = typeof value === 'string' ? parseFloat(value) : Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
    };

    const parseStock = (value) => {
        const numeric = typeof value === 'string' ? parseInt(value, 10) : Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
    };

    const normalizeProduct = (item, index) => {
        const categoryName = item?.category?.name || item?.category_name || item?.category || 'General';
        return {
            id: item?.id ?? `temp-${index}`,
            name: item?.name || 'Unnamed Product',
            sku: item?.sku || item?.slug || '',
            brand: item?.brand || item?.manufacturer || 'Unknown',
            category: categoryName,
            price: parsePrice(item?.price ?? item?.selling_price ?? item?.amount),
            stock: parseStock(item?.stock ?? item?.quantity ?? item?.inventory),
            images: item?.images || item?.image_url || item?.image || null,
        };
    };

    const extractProductsArray = (response) => {
        const candidates = [
            response?.data?.data?.data,
            response?.data?.data?.products,
            response?.data?.products,
            response?.data?.data,
            response?.data,
            response,
        ];

        for (const candidate of candidates) {
            if (Array.isArray(candidate)) {
                return candidate;
            }
            if (candidate && typeof candidate === 'object') {
                for (const value of Object.values(candidate)) {
                    if (Array.isArray(value)) {
                        return value;
                    }
                }
            }
        }

        return [];
    };

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await productService.getAll({ per_page: 1000 });
                const extracted = extractProductsArray(res);
                const normalized = extracted.map(normalizeProduct).filter((item) => item.name);
                setProducts(normalized.length > 0 ? normalized : fallbackProducts);
            } catch (err) {
                setProducts(fallbackProducts);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const categories = useMemo(() => {
        const names = new Set(products.map((item) => item.category).filter(Boolean));
        return Array.from(names).sort();
    }, [products]);

    const brands = useMemo(() => {
        const names = new Set(products.map((item) => item.brand).filter(Boolean));
        return Array.from(names).sort();
    }, [products]);

    // Apply filters
    useEffect(() => {
        let filtered = products;

        // Category filter
        if (selectedCategory) {
            filtered = filtered.filter((p) => (p.category?.name || p.category) === selectedCategory);
        }

        // Brand filter
        if (selectedBrand) {
            filtered = filtered.filter((p) => p.brand === selectedBrand);
        }

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter((p) =>
                p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredProducts(filtered);
    }, [products, selectedCategory, selectedBrand, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory, selectedBrand, searchQuery]);

    const handleResetFilters = () => {
        setSelectedCategory('');
        setSelectedBrand('');
    };

    const handleAddToCart = async (event, product) => {
        event.preventDefault();
        event.stopPropagation();

        if (!isAuthenticated) {
            const redirect = `${location.pathname}${location.search}`;
            navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
            return;
        }

        if (!product || product.stock === 0 || addingProductId === product.id) {
            return;
        }

        try {
            setAddingProductId(product.id);
            await addItem(product.id, 1, {
                name: product.name,
                price: Number(product.price || 0),
                images: product.images,
                brand: product.brand,
            });

            setAddedProductId(product.id);
            window.setTimeout(() => setAddedProductId((current) => (current === product.id ? null : current)), 1200);
        } catch (error) {
            // Keep silent to avoid interrupting browsing flow.
        } finally {
            setAddingProductId(null);
        }
    };

    const hasActiveFilters = Boolean(selectedCategory) || Boolean(selectedBrand);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * productsPerPage;
        return filteredProducts.slice(start, start + productsPerPage);
    }, [filteredProducts, currentPage]);

    if (loading) {
        return (
            <PageSkeleton variant="cards" label="Loading products" />
        );
    }

    return (
        <>
            <style>{`
                @media (max-width: 1024px) {
                    .products-layout { grid-template-columns: 1fr !important; }
                    .products-sidebar { position: static !important; }
                    .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                }
                @media (max-width: 640px) {
                    .products-grid { grid-template-columns: 1fr !important; }
                    .products-header h1 { font-size: 24px !important; }
                    .products-sidebar { padding: 20px !important; }
                }
            `}</style>
            <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)', paddingTop: 96 }}>
                <div style={{ width: '100%', maxWidth: 1560, margin: '0 auto', padding: '14px 18px 30px' }}>
                    <div className="products-header" style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 999, background: 'rgba(249, 115, 22, 0.12)', color: '#c2410c', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Catalog
                        </span>
                        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1, color: '#0f172a', fontWeight: 800, letterSpacing: '-0.03em' }}>Browse Products</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                            Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
                        </p>
                    </div>

                    <div className="products-layout" style={{ display: 'grid', gridTemplateColumns: '302px minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
                        <aside className="products-sidebar" style={{ position: 'sticky', top: 122, width: '100%', height: 'fit-content', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', border: '1px solid #e2e8f0', borderRadius: 20, padding: 30, alignSelf: 'start', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#0f172a', fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em' }}>
                                <Filter size={18} color="#f97316" />
                                <span>Filters</span>
                            </div>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    style={{ border: 'none', background: 'transparent', color: '#ea580c', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        <section style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid #edf2f7' }}>
                            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Categories</h3>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                style={{
                                    width: '100%',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 12,
                                    padding: '11px 40px 11px 12px',
                                    fontSize: 14,
                                    color: '#1f2937',
                                    backgroundColor: '#ffffff',
                                    appearance: 'none',
                                    backgroundImage: 'linear-gradient(45deg, transparent 50%, #94a3b8 50%), linear-gradient(135deg, #94a3b8 50%, transparent 50%)',
                                    backgroundPosition: 'calc(100% - 18px) 50%, calc(100% - 12px) 50%',
                                    backgroundSize: '6px 6px, 6px 6px',
                                    backgroundRepeat: 'no-repeat',
                                }}
                            >
                                <option value="">All categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </section>

                        <section style={{ marginTop: 18 }}>
                            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Brands</h3>
                            <select
                                value={selectedBrand}
                                onChange={(e) => setSelectedBrand(e.target.value)}
                                style={{
                                    width: '100%',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 12,
                                    padding: '11px 40px 11px 12px',
                                    fontSize: 14,
                                    color: '#1f2937',
                                    backgroundColor: '#ffffff',
                                    appearance: 'none',
                                    backgroundImage: 'linear-gradient(45deg, transparent 50%, #94a3b8 50%), linear-gradient(135deg, #94a3b8 50%, transparent 50%)',
                                    backgroundPosition: 'calc(100% - 18px) 50%, calc(100% - 12px) 50%',
                                    backgroundSize: '6px 6px, 6px 6px',
                                    backgroundRepeat: 'no-repeat',
                                }}
                            >
                                <option value="">All brands</option>
                                {brands.map((brand) => (
                                    <option key={brand} value={brand}>
                                        {brand}
                                    </option>
                                ))}
                            </select>
                        </section>
                    </aside>

                    <main>
                        {filteredProducts.length === 0 ? (
                            <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', borderRadius: 18, padding: 42, textAlign: 'center', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)' }}>
                                <h3 style={{ margin: 0, color: '#0f172a', fontSize: 20 }}>No products found</h3>
                                <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: 14 }}>Try changing filters or the search term.</p>
                            </div>
                        ) : (
                            <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 22 }}>
                                {paginatedProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onAddToCart={handleAddToCart}
                                        isAdding={addingProductId === product.id}
                                        isAdded={addedProductId === product.id}
                                    />
                                ))}
                            </div>
                        )}

                        {filteredProducts.length > productsPerPage && (
                            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#334155',
                                        fontWeight: 700,
                                        borderRadius: 10,
                                        padding: '9px 14px',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === 1 ? 0.55 : 1,
                                    }}
                                >
                                    Previous
                                </button>

                                <span style={{ fontSize: 14, color: '#475569', fontWeight: 700 }}>
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#334155',
                                        fontWeight: 700,
                                        borderRadius: 10,
                                        padding: '9px 14px',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === totalPages ? 0.55 : 1,
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
        </>
    );
}


// Product Card Component
function ProductCard({ product, onAddToCart, isAdding, isAdded }) {
    const [imageError, setImageError] = useState(false);
    const [imageSrc, setImageSrc] = useState(() => resolveProductImage(product.images));
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        setImageError(false);
        setImageSrc(resolveProductImage(product.images));
    }, [product.images]);

    return (
        <div
            style={{
                display: 'block',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={{ position: 'relative', width: '100%', height: 240, background: '#f9fafb', overflow: 'hidden' }}>
                {!imageError ? (
                    <img
                        src={imageSrc}
                        alt={product.name}
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain', 
                            padding: 20,
                            transition: 'transform 0.3s ease',
                            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
                        }}
                        onError={(event) => {
                            if (event.currentTarget.dataset.fallbackApplied === '1') {
                                setImageError(true);
                                return;
                            }
                            event.currentTarget.dataset.fallbackApplied = '1';
                            setImageSrc(FALLBACK_PRODUCT_IMAGE);
                        }}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#d1d5db' }}>
                        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                {product.stock === 0 && (
                    <div style={{ position: 'absolute', top: 12, left: 12, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Out of Stock
                    </div>
                )}
                {product.stock > 0 && product.stock < 10 && (
                    <div style={{ position: 'absolute', top: 12, left: 12, background: '#f97316', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Low Stock
                    </div>
                )}
                
                <div style={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12, 
                    background: 'rgba(255, 255, 255, 0.95)', 
                    backdropFilter: 'blur(8px)',
                    borderRadius: 8,
                    padding: 6,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                size={14}
                                color="#fbbf24"
                                fill={i < 4 ? "#fbbf24" : "none"}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {product.brand}
                    </span>
                </div>
                
                <h3 style={{ 
                    margin: 0, 
                    fontSize: 15, 
                    color: '#111827', 
                    fontWeight: 600, 
                    lineHeight: 1.4, 
                    minHeight: 42,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {product.name}
                </h3>

                {product.sku && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>SKU: {product.sku}</p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 22, color: '#111827', fontWeight: 700, letterSpacing: '-0.02em' }}>
                            ₱{Number(product.price || 0).toFixed(2)}
                        </p>
                        <span style={{ fontSize: 12, color: product.stock > 0 ? '#059669' : '#dc2626', fontWeight: 500 }}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Unavailable'}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    disabled={product.stock === 0 || isAdding}
                    onClick={(event) => onAddToCart(event, product)}
                    style={{
                        width: '100%',
                        border: 'none',
                        background: product.stock === 0 
                            ? '#e5e7eb' 
                            : isAdded 
                                ? '#059669' 
                                : isHovered 
                                    ? '#ea580c' 
                                    : '#f97316',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: 14,
                        borderRadius: 10,
                        padding: '12px',
                        cursor: product.stock === 0 || isAdding ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: product.stock === 0 ? 'none' : '0 4px 12px rgba(249, 115, 22, 0.3)',
                    }}
                >
                    {isAdding ? 'Adding...' : isAdded ? '✓ Added' : 'Add to Cart'}
                </button>
            </div>
        </div>
    );
}
