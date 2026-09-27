import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import adminService from '../services/adminService';

export default function ProductEditModal({ product, onClose, onSave }) {
    const [categories, setCategories] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category_id: '',
        description: '',
        price: '',
        stock: '',
        images: '',
        vehicle_compatibility: '',
        is_active: true
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await adminService.getCategories();
                setCategories(res.data?.data || []);
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                sku: product.sku || '',
                category_id: product.category_id || '',
                description: product.description || '',
                price: product.price || '',
                stock: product.stock || '',
                images: Array.isArray(product.images) ? product.images.join('\n') : (product.images || ''),
                vehicle_compatibility: product.vehicle_compatibility || '',
                is_active: product.is_active !== false
            });
        }
    }, [product]);

    if (!product) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            if (!formData.name.trim()) {
                setError('Product name is required');
                return;
            }
            if (!formData.sku.trim()) {
                setError('SKU is required');
                return;
            }
            if (!formData.category_id) {
                setError('Category is required');
                return;
            }
            if (!formData.price) {
                setError('Price is required');
                return;
            }
            if (formData.stock === '') {
                setError('Stock quantity is required');
                return;
            }

            const submitData = {
                name: formData.name.trim(),
                sku: formData.sku.trim(),
                category_id: parseInt(formData.category_id),
                description: formData.description.trim(),
                price: parseFloat(formData.price),
                stock: parseInt(formData.stock),
                vehicle_compatibility: formData.vehicle_compatibility.trim(),
                is_active: formData.is_active
            };

            if (formData.images.trim()) {
                submitData.images = formData.images.split('\n').map(url => url.trim()).filter(Boolean);
            }

            await adminService.updateProduct(product.id, submitData);
            onSave();
            onClose();
        } catch (err) {
            console.error('Failed to save product:', err);
            setError(err.response?.data?.message || 'Failed to save product');
        } finally {
            setSubmitting(false);
        }
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
                    <h2 style={{ margin: 0, color: '#1e293b' }}>Edit Product</h2>
                    <button
                        type="button"
                        aria-label="Close product editor"
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            all: 'unset',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: submitting ? 0.5 : 1
                        }}
                    >
                        <X size={24} color="#64748b" />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
                        {error && (
                            <div style={{
                                padding: '1rem',
                                marginBottom: '1rem',
                                background: '#fee2e2',
                                color: '#991b1b',
                                borderRadius: '0.5rem',
                                fontSize: '0.95rem'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b' }}>
                                        Product Name <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Product name"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem',
                                            fontFamily: 'inherit',
                                            color: '#1e293b'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b' }}>
                                        SKU <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="sku"
                                        value={formData.sku}
                                        onChange={handleChange}
                                        placeholder="SKU"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem',
                                            fontFamily: 'inherit',
                                            color: '#1e293b'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b' }}>
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Product description"
                                    rows="3"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.95rem',
                                        fontFamily: 'inherit',
                                        resize: 'vertical',
                                        color: '#1e293b'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b' }}>
                                        Category <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <select
                                        name="category_id"
                                        value={formData.category_id}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem',
                                            fontFamily: 'inherit',
                                            color: '#1e293b'
                                        }}
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b' }}>
                                        Price (P) <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem',
                                            fontFamily: 'inherit',
                                            color: '#1e293b'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b' }}>
                                        Stock <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="stock"
                                        value={formData.stock}
                                        onChange={handleChange}
                                        placeholder="0"
                                        min="0"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem',
                                            fontFamily: 'inherit',
                                            color: '#1e293b'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b' }}>
                                        Vehicle Compatibility
                                    </label>
                                    <input
                                        type="text"
                                        name="vehicle_compatibility"
                                        value={formData.vehicle_compatibility}
                                        onChange={handleChange}
                                        placeholder="e.g., Toyota, Honda"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem',
                                            fontFamily: 'inherit',
                                            color: '#1e293b'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b' }}>
                                    Image URLs (one per line)
                                </label>
                                <textarea
                                    name="images"
                                    value={formData.images}
                                    onChange={handleChange}
                                    placeholder="https://example.com/image.jpg"
                                    rows="2"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontFamily: 'monospace',
                                        resize: 'vertical',
                                        color: '#1e293b'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                />
                                <label htmlFor="is_active" style={{ cursor: 'pointer', fontSize: '0.95rem', color: '#1e293b', fontWeight: 500 }}>
                                    Active (visible to customers)
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        padding: '1.5rem',
                        borderTop: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        position: 'sticky',
                        bottom: 0
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            style={{
                                flex: 1,
                                padding: '0.75rem 1.5rem',
                                border: '1px solid #cbd5e1',
                                background: 'white',
                                color: '#1e293b',
                                borderRadius: '0.5rem',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                fontWeight: 500,
                                fontSize: '0.95rem',
                                opacity: submitting ? 0.5 : 1
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                flex: 1,
                                padding: '0.75rem 1.5rem',
                                background: submitting ? '#cbd5e1' : '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                fontWeight: 500,
                                fontSize: '0.95rem'
                            }}
                        >
                            {submitting ? 'Saving...' : 'Update Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
