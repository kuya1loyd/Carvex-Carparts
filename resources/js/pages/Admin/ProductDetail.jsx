import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { ChevronLeft, Package } from 'lucide-react';
import PageSkeleton from '../../components/Skeleton';

export default function AdminProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await adminService.getProducts();
                const products = res.data?.data?.data || [];
                const found = products.find(p => p.id === parseInt(id));
                
                if (found) {
                    setProduct(found);
                } else {
                    setError('Product not found');
                }
            } catch (err) {
                console.error('Failed to fetch product:', err);
                setError('Failed to load product');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const getImageUrl = (img) => {
        if (!img) return null;
        
        if (Array.isArray(img) && img.length > 0) {
            img = img[0];
        }
        
        if (typeof img === 'string') {
            if (img.startsWith('http')) return img;
            if (!img.startsWith('/')) img = '/' + img;
            if (img.startsWith('/')) return `/storage${img}`;
            return img;
        }
        
        if (typeof img === 'object' && img.url) {
            return img.url.startsWith('http') ? img.url : `/storage${img.url}`;
        }
        
        if (typeof img === 'object' && img.path) {
            return img.path.startsWith('http') ? img.path : `/storage${img.path}`;
        }
        
        return null;
    };

    const getCategoryName = (cat) => {
        if (!cat) return '';
        if (typeof cat === 'string') return cat;
        if (typeof cat === 'object' && cat.name) return cat.name;
        return '';
    };

    const getStockBadgeClass = (stock) => {
        if (stock === 0) return 'badge-danger';
        if (stock < 10) return 'badge-warning';
        return 'badge-success';
    };

    const getStockLabel = (stock) => {
        if (stock === 0) return 'Out of Stock';
        if (stock < 10) return 'Low Stock';
        return 'In Stock';
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-dashboard-modern">
                    <PageSkeleton variant="detail" label="Loading product details" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-page">
                <div className="admin-dashboard-modern">
                    <button 
                        onClick={() => navigate('/admin/products')}
                        style={{
                            all: 'unset',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            color: '#3b82f6',
                            marginBottom: '1rem',
                            fontSize: '0.95rem'
                        }}
                    >
                        <ChevronLeft size={18} />
                        Back to Inventory
                    </button>
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: '#fee2e2',
                        borderRadius: '0.5rem',
                        color: '#991b1b'
                    }}>
                        <h2>{error}</h2>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="admin-page">
                <div className="admin-dashboard-modern">
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <h2>Product not found</h2>
                        <Link to="/admin/products" className="btn btn-outline" style={{ marginTop: '1rem' }}>
                            Back to Inventory
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-dashboard-modern">
                <button 
                    onClick={() => navigate('/admin/products')}
                    style={{
                        all: 'unset',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        color: '#3b82f6',
                        marginBottom: '1rem',
                        fontSize: '0.95rem'
                    }}
                >
                    <ChevronLeft size={18} />
                    Back to Inventory
                </button>

                <div className="admin-panel" style={{ maxWidth: '1000px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        {/* Image Section */}
                        <div>
                            <div style={{
                                width: '100%',
                                height: '300px',
                                borderRadius: '0.5rem',
                                background: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                marginBottom: '1rem'
                            }}>
                                {getImageUrl(product.image) ? (
                                    <img 
                                        src={getImageUrl(product.image)} 
                                        alt={product.name}
                                        style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover' 
                                        }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <Package size={48} color="#94a3b8" />
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <Link 
                                    to={`/admin/products/${product.id}/edit`}
                                    className="btn btn-primary"
                                    style={{ flex: 1, textAlign: 'center' }}
                                >
                                    Edit Product
                                </Link>
                            </div>
                        </div>

                        {/* Product Info */}
                        <div>
                            <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{product.name}</h1>
                            
                            <div style={{ marginBottom: '1.5rem' }}>
                                <span className={`badge ${getStockBadgeClass(product.stock || 0)}`} style={{ marginRight: '0.5rem' }}>
                                    {getStockLabel(product.stock || 0)}
                                </span>
                                {product.is_active ? (
                                    <span className="badge badge-success">Active</span>
                                ) : (
                                    <span className="badge badge-danger">Inactive</span>
                                )}
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>SKU</strong>
                                    <p style={{ margin: '0.25rem 0 0.75rem 0' }}>{product.sku || 'N/A'}</p>
                                </div>

                                <div>
                                    <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Category</strong>
                                    <p style={{ margin: '0.25rem 0 0.75rem 0' }}>{getCategoryName(product.category) || 'N/A'}</p>
                                </div>

                                <div>
                                    <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Price</strong>
                                    <p style={{ margin: '0.25rem 0 0.75rem 0', fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                                        P{(Number(product.price) || 0).toFixed(2)}
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Stock</strong>
                                    <p style={{ margin: '0.25rem 0 0.75rem 0', fontSize: '1.25rem' }}>
                                        {product.stock || 0} units
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Supplier</strong>
                                    <p style={{ margin: '0.25rem 0 0.75rem 0' }}>{product.supplier || 'N/A'}</p>
                                </div>

                                {product.vehicle_compatibility && (
                                    <div>
                                        <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Compatible Vehicles</strong>
                                        <p style={{ margin: '0.25rem 0 0.75rem 0' }}>{product.vehicle_compatibility}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {product.description && (
                        <div style={{ paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
                            <h3 style={{ marginTop: 0 }}>Description</h3>
                            <p style={{ color: '#475569', lineHeight: '1.6' }}>
                                {product.description}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
