import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit, Eye, Package, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import adminService from '../../services/adminService';
import ProductCreateModal from '../../components/ProductCreateModal';
import ProductDetailModal from '../../components/ProductDetailModal';
import ProductEditModal from '../../components/ProductEditModal';
import PageSkeleton from '../../components/Skeleton';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});

const getCategoryName = (category) => {
    if (!category) return '';
    if (typeof category === 'string') return category;
    if (typeof category === 'object' && category.name) return category.name;
    return '';
};

const getImageUrl = (imageValue) => {
    if (!imageValue) {
        return null;
    }

    let image = imageValue;

    if (Array.isArray(image) && image.length > 0) {
        image = image[0];
    }

    if (typeof image === 'string') {
        if (!image.trim()) {
            return null;
        }
        if (image.startsWith('http')) {
            return image;
        }
        return image.startsWith('/') ? image : `/${image}`;
    }

    if (typeof image === 'object' && image.url) {
        return image.url.startsWith('http') || image.url.startsWith('/') ? image.url : `/${image.url}`;
    }

    if (typeof image === 'object' && image.path) {
        return image.path.startsWith('http') || image.path.startsWith('/') ? image.path : `/${image.path}`;
    }

    return null;
};

const getStockBadgeClass = (stock) => {
    if (stock === 0) return 'badge-danger';
    if (stock <= 10) return 'badge-warning';
    return 'badge-success';
};

const getStockLabel = (stock) => {
    if (stock === 0) return 'out of stock';
    if (stock <= 10) return 'low stock';
    return 'healthy stock';
};

export default function AdminProducts() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState('all');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [creatingProduct, setCreatingProduct] = useState(false);

    useEffect(() => {
        const nextSearch = searchParams.get('q') || '';
        const nextCategory = searchParams.get('category') || 'all';
        const requestedStockFilter = searchParams.get('stock') || 'all';
        const allowedStockFilters = new Set(['all', 'healthy', 'low', 'out']);

        setSearchTerm(nextSearch);
        setCategoryFilter(nextCategory);
        setStockFilter(allowedStockFilters.has(requestedStockFilter) ? requestedStockFilter : 'all');
    }, [searchParams]);

    useEffect(() => {
        let mounted = true;

        const fetchProducts = async () => {
            try {
                const res = await adminService.getProducts({ params: { per_page: 200 } });
                if (mounted) {
                    setProducts(res.data?.data?.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch products:', err);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void fetchProducts();

        return () => {
            mounted = false;
        };
    }, []);

    const refreshProducts = async () => {
        try {
            const res = await adminService.getProducts({ params: { per_page: 200 } });
            setProducts(res.data?.data?.data || []);
            window.dispatchEvent(new Event('sidebar-counts-refresh'));
        } catch (err) {
            console.error('Failed to refresh products:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            await adminService.deleteProduct(id);
            setProducts((prev) => prev.filter((product) => product.id !== id));
            window.dispatchEvent(new Event('sidebar-counts-refresh'));
        } catch (err) {
            console.error('Delete error details:', err.response?.data || err.message);
            window.alert(err.response?.data?.message || `Failed to delete product: ${err.message}`);
        }
    };

    const categories = useMemo(
        () => ['all', ...new Set(products.map((product) => getCategoryName(product.category)).filter(Boolean))],
        [products]
    );

    const filteredProducts = products.filter((product) => {
        const categoryName = getCategoryName(product.category);
        const stock = Number(product.stock || 0);
        const matchesSearch = [
            product.name,
            product.brand,
            product.sku,
            product.supplier,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) {
            return false;
        }

        if (categoryFilter !== 'all' && categoryName !== categoryFilter) {
            return false;
        }

        if (stockFilter === 'healthy' && stock <= 10) {
            return false;
        }

        if (stockFilter === 'low' && !(stock > 0 && stock <= 10)) {
            return false;
        }

        if (stockFilter === 'out' && stock !== 0) {
            return false;
        }

        return true;
    });

    const stats = {
        total: products.length,
        totalUnits: products.reduce((sum, product) => sum + Number(product.stock || 0), 0),
        categories: categories.filter((category) => category !== 'all').length,
        lowStock: products.filter((product) => {
            const stock = Number(product.stock || 0);
            return stock > 0 && stock <= 10;
        }).length,
        outOfStock: products.filter((product) => Number(product.stock || 0) === 0).length,
        missingImages: products.filter((product) => !getImageUrl(product.images)).length,
    };

    const hasDashboardInventoryFilter = ['low', 'out', 'healthy'].includes(stockFilter) || searchParams.get('category') || searchParams.get('q');

    const handleToolbarSearchChange = (value) => {
        setSearchTerm(value);
    };

    const handleCategoryFilterChange = (value) => {
        setCategoryFilter(value);
    };

    const handleStockFilterChange = (value) => {
        setStockFilter(value);
    };

    const clearDashboardInventoryFilter = () => {
        setSearchParams({});
        setSearchTerm('');
        setCategoryFilter('all');
        setStockFilter('all');
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-workspace">
                    <PageSkeleton variant="dashboard" label="Loading inventory workspace" />
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-workspace">
                <section className="admin-hero admin-hero--products">
                    <div className="admin-hero__content">
                        <span className="admin-hero__eyebrow">Inventory control</span>
                        <h1>Present the catalog like a serious retail operation.</h1>
                        <p>
                            Monitor stock health, spot thin inventory, and keep product data polished for the storefront.
                        </p>
                        <div className="admin-chip-row">
                            <span className="admin-chip">{stats.total} active product records</span>
                            <span className="admin-chip">{stats.totalUnits} total units on hand</span>
                            <span className="admin-chip">{stats.lowStock} low stock alerts</span>
                        </div>
                    </div>

                    <div className="admin-hero__aside">
                        <div className="admin-hero__stat">
                            <span>Categories</span>
                            <strong>{stats.categories}</strong>
                            <small>Distinct catalog groups available to customers.</small>
                        </div>
                        <div className="admin-hero__stat">
                            <span>Missing product photos</span>
                            <strong>{stats.missingImages}</strong>
                            <small>SKUs that still need stronger visual merchandising.</small>
                        </div>
                    </div>
                </section>

                <div className="admin-kpi-grid admin-kpi-grid--compact">
                    <article className="admin-kpi-card">
                        <div className="admin-kpi-card__icon admin-kpi-card__icon--slate">
                            <Package size={20} />
                        </div>
                        <div className="admin-kpi-card__content">
                            <span>Total products</span>
                            <strong>{stats.total}</strong>
                            <small>Every part currently managed in the admin catalog.</small>
                        </div>
                    </article>

                    <article className="admin-kpi-card">
                        <div className="admin-kpi-card__icon admin-kpi-card__icon--green">
                            <Package size={20} />
                        </div>
                        <div className="admin-kpi-card__content">
                            <span>Total units</span>
                            <strong>{stats.totalUnits}</strong>
                            <small>Combined stock count across the visible catalog.</small>
                        </div>
                    </article>

                    <article className="admin-kpi-card">
                        <div className="admin-kpi-card__icon admin-kpi-card__icon--amber">
                            <TriangleAlert size={20} />
                        </div>
                        <div className="admin-kpi-card__content">
                            <span>Low stock</span>
                            <strong>{stats.lowStock}</strong>
                            <small>Items that should be reviewed before demand spikes.</small>
                        </div>
                    </article>

                    <article className="admin-kpi-card">
                        <div className="admin-kpi-card__icon admin-kpi-card__icon--red">
                            <TriangleAlert size={20} />
                        </div>
                        <div className="admin-kpi-card__content">
                            <span>Out of stock</span>
                            <strong>{stats.outOfStock}</strong>
                            <small>Products that are currently unavailable to customers.</small>
                        </div>
                    </article>
                </div>

                <section className="admin-section-card">
                    <div className="admin-section-card__header">
                        <div>
                            <h2>Catalog workspace</h2>
                            <p>Search, filter, and maintain inventory quality in one place.</p>
                        </div>
                        <button type="button" className="btn btn-primary" onClick={() => setCreatingProduct(true)}>
                            <Plus size={16} />
                            Add new part
                        </button>
                    </div>

                    <div className="admin-toolbar">
                        <div className="admin-toolbar__search">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, brand, SKU, or supplier"
                                value={searchTerm}
                                onChange={(event) => handleToolbarSearchChange(event.target.value)}
                            />
                        </div>

                        <div className="admin-toolbar__filters">
                            <select value={categoryFilter} onChange={(event) => handleCategoryFilterChange(event.target.value)}>
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category === 'all' ? 'All categories' : category}
                                    </option>
                                ))}
                            </select>

                            <select value={stockFilter} onChange={(event) => handleStockFilterChange(event.target.value)}>
                                <option value="all">All stock states</option>
                                <option value="healthy">Healthy stock</option>
                                <option value="low">Low stock</option>
                                <option value="out">Out of stock</option>
                            </select>
                        </div>
                    </div>

                    {hasDashboardInventoryFilter ? (
                        <div className="admin-callout admin-callout--info">
                            <div>
                                <strong>Filtered inventory view</strong>
                                <p style={{ margin: '0.25rem 0 0' }}>
                                    {stockFilter === 'low'
                                        ? 'Showing parts that are running low on stock.'
                                        : stockFilter === 'out'
                                            ? 'Showing products that are currently out of stock.'
                                            : stockFilter === 'healthy'
                                                ? 'Showing products with healthy stock levels.'
                                                : 'Showing a filtered inventory view.'}
                                </p>
                            </div>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={clearDashboardInventoryFilter}>
                                Clear filters
                            </button>
                        </div>
                    ) : null}

                    {products.length > 0 && stats.missingImages === products.length ? (
                        <div className="admin-callout admin-callout--warning">
                            Product images have not been added yet. Adding photos will make the admin catalog and storefront feel much more complete.
                        </div>
                    ) : null}

                    {filteredProducts.length === 0 ? (
                        <div className="admin-empty-state">
                            <Package size={44} />
                            <h3>No products match this view</h3>
                            <p>Try another search or create a new inventory item.</p>
                            <button type="button" className="btn btn-primary" onClick={() => setCreatingProduct(true)}>
                                <Plus size={16} />
                                Add product
                            </button>
                        </div>
                    ) : (
                        <div className="admin-table-shell">
                            <table className="admin-data-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>SKU</th>
                                        <th>Category</th>
                                        <th>Price</th>
                                        <th>Stock</th>
                                        <th>Status</th>
                                        <th>Supplier</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product) => {
                                        const imageUrl = getImageUrl(product.images);
                                        const stock = Number(product.stock || 0);

                                        return (
                                            <tr key={product.id}>
                                                <td>
                                                    <div className="admin-product-cell">
                                                        <div className="admin-product-cell__thumb">
                                                            {imageUrl ? (
                                                                <img src={imageUrl} alt={product.name} />
                                                            ) : (
                                                                <Package size={18} />
                                                            )}
                                                        </div>
                                                        <div className="admin-table-stack">
                                                            <strong>{product.name}</strong>
                                                            <span>{product.brand || 'No brand specified'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{product.sku || 'N/A'}</td>
                                                <td>{getCategoryName(product.category) || 'Uncategorized'}</td>
                                                <td>{currencyFormatter.format(Number(product.price || 0))}</td>
                                                <td>{stock}</td>
                                                <td>
                                                    <span className={`badge ${getStockBadgeClass(stock)}`}>
                                                        {getStockLabel(stock)}
                                                    </span>
                                                </td>
                                                <td>{product.supplier || 'N/A'}</td>
                                                <td>
                                                    <div className="admin-inline-controls">
                                                        <button
                                                            type="button"
                                                            className="admin-icon-button"
                                                            title="View product"
                                                            onClick={() => setSelectedProduct(product)}
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="admin-icon-button"
                                                            title="Edit product"
                                                            onClick={() => setEditingProduct(product)}
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="admin-icon-button admin-icon-button--danger"
                                                            title="Delete product"
                                                            onClick={() => handleDelete(product.id)}
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

                {selectedProduct ? (
                    <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
                ) : null}

                {editingProduct ? (
                    <ProductEditModal
                        product={editingProduct}
                        onClose={() => setEditingProduct(null)}
                        onSave={refreshProducts}
                    />
                ) : null}

                {creatingProduct ? (
                    <ProductCreateModal
                        isOpen={creatingProduct}
                        onClose={() => setCreatingProduct(false)}
                        onSuccess={refreshProducts}
                    />
                ) : null}
            </div>
        </div>
    );
}
