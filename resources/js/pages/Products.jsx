import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, PackageSearch, Search } from 'lucide-react';
import productService from '../services/productService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { FALLBACK_PRODUCT_IMAGE, resolveProductImage } from '../utils/productImage';
import PageSkeleton from '../components/Skeleton';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const parsePrice = (value) => {
    const numeric = typeof value === 'string' ? parseFloat(value) : Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const parseStock = (value) => {
    const numeric = typeof value === 'string' ? parseInt(value, 10) : Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const getCatalogPageSize = () => {
    if (typeof window === 'undefined') return 8;
    if (window.innerWidth <= 680) return 4;
    if (window.innerWidth <= 1440) return 6;
    return 8;
};

const normalizeProduct = (item, index) => {
    const categoryName = item?.category?.name || item?.category_name || item?.category || 'General';
    return {
        id: item?.id ?? `temp-${index}`,
        name: item?.name || 'Unnamed Product',
        sku: item?.sku || item?.slug || '',
        brand: item?.brand || item?.manufacturer || 'Unknown',
        category: typeof categoryName === 'string' ? categoryName : 'General',
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
        if (Array.isArray(candidate)) return candidate;
        if (candidate && typeof candidate === 'object') {
            const nestedArray = Object.values(candidate).find(Array.isArray);
            if (nestedArray) return nestedArray;
        }
    }

    return [];
};

export default function Products() {
    const { addItem } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const searchQuery = new URLSearchParams(location.search).get('search') || '';
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [totalProducts, setTotalProducts] = useState(0);
    const [searchInput, setSearchInput] = useState(searchQuery);
    const [sortBy, setSortBy] = useState('catalog');
    const [addingProductId, setAddingProductId] = useState(null);
    const [addedProductId, setAddedProductId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [productsPerPage, setProductsPerPage] = useState(getCatalogPageSize);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        setSearchInput(searchQuery);
        setCurrentPage(1);
    }, [searchQuery]);

    useEffect(() => {
        const resizePageSize = () => setProductsPerPage(getCatalogPageSize());
        window.addEventListener('resize', resizePageSize, { passive: true });
        return () => window.removeEventListener('resize', resizePageSize);
    }, []);

    useEffect(() => {
        let isCurrent = true;

        const fetchProducts = async () => {
            setLoading(true);
            setFetchError(false);

            try {
                const sortOptions = {
                    catalog: { sort_by: 'created_at', sort_order: 'desc' },
                    name: { sort_by: 'name', sort_order: 'asc' },
                    'price-low': { sort_by: 'price', sort_order: 'asc' },
                    'price-high': { sort_by: 'price', sort_order: 'desc' },
                    stock: { sort_by: 'stock', sort_order: 'desc' },
                };
                const params = {
                    per_page: productsPerPage,
                    page: currentPage,
                    ...sortOptions[sortBy],
                };
                if (searchQuery.trim()) params.search = searchQuery.trim();

                const response = await productService.getAll(params);
                const extracted = extractProductsArray(response);
                const normalized = extracted.map(normalizeProduct).filter((item) => item.name);
                const responseTotal = Number(response?.data?.data?.total);
                if (isCurrent) {
                    setProducts(normalized);
                    setTotalProducts(Number.isFinite(responseTotal) ? responseTotal : normalized.length);
                }
            } catch {
                if (isCurrent) {
                    setProducts([]);
                    setTotalProducts(0);
                    setFetchError(true);
                }
            } finally {
                if (isCurrent) setLoading(false);
            }
        };

        fetchProducts();
        return () => { isCurrent = false; };
    }, [currentPage, productsPerPage, reloadKey, searchQuery, sortBy]);

    const totalPages = Math.max(1, Math.ceil(totalProducts / productsPerPage));

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    const handleSearch = (event) => {
        event.preventDefault();
        const query = searchInput.trim();
        setCurrentPage(1);
        navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
    };

    const handleResetFilters = () => {
        setSortBy('catalog');
        setSearchInput('');
        setCurrentPage(1);
        navigate('/products');
    };

    const handleAddToCart = async (event, product) => {
        event.preventDefault();
        event.stopPropagation();

        if (!isAuthenticated) {
            const redirect = `${location.pathname}${location.search}`;
            navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
            return;
        }

        if (!product || product.stock === 0 || addingProductId === product.id) return;

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
            // Keep the browse flow uninterrupted if the cart request fails.
        } finally {
            setAddingProductId(null);
        }
    };

    const hasActiveFilters = Boolean(searchQuery);

    if (loading) return <PageSkeleton variant="cards" label="Loading products" />;

    return (
        <div className="products-page">
            <div className="products-container">
                <header className="products-header">
                    <div>
                        <p className="products-eyebrow">CARVEX PARTS CATALOG</p>
                        <h1>Find your part.</h1>
                        <p className="products-summary">Browse automotive parts by name, brand, or vehicle system.</p>
                    </div>
                </header>

                <div className="products-toolbar">
                    <form className="catalog-search" role="search" onSubmit={handleSearch}>
                        <label className="sr-only" htmlFor="catalog-search">Search products</label>
                        <Search size={18} aria-hidden="true" />
                        <input
                            id="catalog-search"
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search name, SKU, brand, or category"
                        />
                        <button type="submit">Search</button>
                    </form>
                    <label className="sort-control">
                        <span>Sort by</span>
                        <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setCurrentPage(1); }}>
                            <option value="catalog">Catalog order</option>
                            <option value="name">Name, A to Z</option>
                            <option value="price-low">Price, low to high</option>
                            <option value="price-high">Price, high to low</option>
                            <option value="stock">Availability</option>
                        </select>
                    </label>
                </div>

                <main className="products-main" aria-label="Products">
                    <div className="products-results-line" aria-live="polite">
                        <p><strong>{totalProducts}</strong> {totalProducts === 1 ? 'part' : 'parts'} found</p>
                        {searchQuery && <span>Search: “{searchQuery}”</span>}
                    </div>

                    {fetchError ? (
                        <div className="catalog-empty-state catalog-empty-state--error" role="alert">
                            <span className="empty-state-icon"><PackageSearch size={23} aria-hidden="true" /></span>
                            <h2>The catalog is temporarily unavailable.</h2>
                            <p>Our catalog service is having trouble right now. You can still browse all parts or try again in a moment.</p>
                            <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="catalog-empty-state" role="status">
                            <span className="empty-state-icon"><PackageSearch size={23} aria-hidden="true" /></span>
                            <h2>{hasActiveFilters ? 'No matching parts found.' : 'The catalog is empty for now.'}</h2>
                            <p>{hasActiveFilters ? 'Try another search or clear your search.' : 'Check back soon or contact our team for help finding a part.'}</p>
                            {hasActiveFilters && <button type="button" onClick={handleResetFilters}>Clear search</button>}
                        </div>
                    ) : (
                        <div className="products-grid">
                            {products.map((product) => (
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

                    {totalProducts > productsPerPage && (
                        <nav className="catalog-pagination" aria-label="Product pages">
                            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Previous</button>
                            <span>Page {currentPage} of {totalPages}</span>
                            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>Next</button>
                        </nav>
                    )}
                </main>
            </div>
        </div>
    );
}

function ProductCard({ product, onAddToCart, isAdding, isAdded }) {
    const [imageError, setImageError] = useState(false);
    const [imageSrc, setImageSrc] = useState(() => resolveProductImage(product.images));

    useEffect(() => {
        setImageError(false);
        setImageSrc(resolveProductImage(product.images));
    }, [product.images]);

    const stockLabel = product.stock > 0
        ? (product.stock < 10 ? `Low stock Â· ${product.stock} left` : `${product.stock} in stock`)
        : 'Out of stock';

    return (
        <article className="catalog-product-card">
            <Link className="catalog-product-media" to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
                {!imageError ? (
                    <img
                        src={imageSrc}
                        alt={product.name}
                        loading="lazy"
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
                    <span className="catalog-image-fallback">Image unavailable</span>
                )}
                <span className={`catalog-stock-badge${product.stock === 0 ? ' is-empty' : product.stock < 10 ? ' is-low' : ''}`}>
                    {product.stock === 0 ? 'Unavailable' : product.stock < 10 ? 'Low stock' : 'In stock'}
                </span>
            </Link>

            <div className="catalog-product-info">
                <div className="catalog-product-meta">
                    <span>{product.brand}</span>
                    <span>{product.category}</span>
                </div>
                <h2><Link to={`/products/${product.id}`}>{product.name}</Link></h2>
                {product.sku && <p className="catalog-product-sku">SKU {product.sku}</p>}
                <div className="catalog-product-buy-row">
                    <div>
                        <strong className="catalog-product-price">{currencyFormatter.format(product.price)}</strong>
                        <span className={`catalog-product-stock${product.stock === 0 ? ' is-empty' : ''}`}>{stockLabel}</span>
                    </div>
                    <Link className="catalog-view-link" to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
                        <ArrowRight size={17} aria-hidden="true" />
                    </Link>
                </div>
                <button
                    type="button"
                    className={`catalog-add-button${isAdded ? ' is-added' : ''}`}
                    disabled={product.stock === 0 || isAdding}
                    onClick={(event) => onAddToCart(event, product)}
                >
                    {isAdding ? 'Adding to cartâ€¦' : isAdded ? 'Added to cart' : 'Add to cart'}
                </button>
            </div>
        </article>
    );
}
