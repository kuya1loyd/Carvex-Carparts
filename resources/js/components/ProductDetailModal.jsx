import React from 'react';
import { X, Package } from 'lucide-react';

export default function ProductDetailModal({ product, onClose }) {
    if (!product) return null;

    const getCategoryName = (cat) => {
        if (!cat) return '';
        if (typeof cat === 'string') return cat;
        if (typeof cat === 'object' && cat.name) return cat.name;
        return '';
    };

    const getImageUrl = (img) => {
        if (!img) return null;
        
        if (Array.isArray(img) && img.length > 0) {
            img = img[0];
        }
        
        if (typeof img === 'string') {
            if (img.trim() === '') return null;
            if (img.startsWith('http')) return img;
            if (!img.startsWith('/')) img = '/' + img;
            return img;
        }
        
        if (typeof img === 'object' && img.url) {
            const url = img.url;
            if (url.startsWith('http')) return url;
            if (!url.startsWith('/')) return '/' + url;
            return url;
        }
        
        if (typeof img === 'object' && img.path) {
            const path = img.path;
            if (path.startsWith('http')) return path;
            if (!path.startsWith('/')) return '/' + path;
            return path;
        }
        
        return null;
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

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '0.75rem',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                {/* Modal Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                    borderBottom: '1px solid #e2e8f0',
                    position: 'sticky',
                    top: 0,
                    background: 'white'
                }}>
                    <h2 style={{ margin: 0, color: '#1e293b' }}>{product.name}</h2>
                    <button
                        type="button"
                        aria-label="Close product details"
                        onClick={onClose}
                        style={{
                            all: 'unset',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={24} color="#64748b" />
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '1.5rem' }}>
                    {/* Image Section */}
                    <div style={{
                        width: '100%',
                        height: '250px',
                        borderRadius: '0.5rem',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        marginBottom: '1.5rem'
                    }}>
                        {getImageUrl(product.images) ? (
                            <img 
                                src={getImageUrl(product.images)} 
                                alt={product.name}
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover' 
                                }}
                                onError={(e) => { 
                                    e.target.style.display = 'none';
                                    console.log('Image failed to load:', getImageUrl(product.images));
                                }}
                            />
                        ) : (
                            <Package size={48} color="#94a3b8" />
                        )}
                    </div>

                    {/* Status Badges */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                        <span className={`badge ${getStockBadgeClass(product.stock || 0)}`}>
                            {getStockLabel(product.stock || 0)}
                        </span>
                        {product.is_active ? (
                            <span className="badge badge-success">Active</span>
                        ) : (
                            <span className="badge badge-danger">Inactive</span>
                        )}
                    </div>

                    {/* Product Information Grid */}
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>SKU</strong>
                            <p style={{ margin: '0.25rem 0', color: '#1e293b' }}>{product.sku || 'N/A'}</p>
                        </div>

                        <div>
                            <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Category</strong>
                            <p style={{ margin: '0.25rem 0', color: '#1e293b' }}>{getCategoryName(product.category) || 'N/A'}</p>
                        </div>

                        <div>
                            <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Price</strong>
                            <p style={{ margin: '0.25rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>
                                P{(Number(product.price) || 0).toFixed(2)}
                            </p>
                        </div>

                        <div>
                            <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Stock</strong>
                            <p style={{ margin: '0.25rem 0', color: '#1e293b' }}>
                                {product.stock || 0} units
                            </p>
                        </div>

                        <div>
                            <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Supplier</strong>
                            <p style={{ margin: '0.25rem 0', color: '#1e293b' }}>{product.supplier || 'N/A'}</p>
                        </div>

                        {product.vehicle_compatibility && (
                            <div>
                                <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Compatible Vehicles</strong>
                                <p style={{ margin: '0.25rem 0', color: '#1e293b' }}>{product.vehicle_compatibility}</p>
                            </div>
                        )}

                        {product.description && (
                            <div>
                                <strong style={{ color: '#64748b', fontSize: '0.85rem' }}>Description</strong>
                                <p style={{ margin: '0.25rem 0', color: '#475569' }}>{product.description}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1.5rem',
                    borderTop: '1px solid #e2e8f0',
                    background: '#f8fafc'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '0.75rem 1.5rem',
                            border: '1px solid #cbd5e1',
                            background: 'white',
                            color: '#1e293b',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.95rem'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
