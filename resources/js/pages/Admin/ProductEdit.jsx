import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import adminService from '../../services/adminService';
import { ChevronLeft } from 'lucide-react';
import PageSkeleton from '../../components/Skeleton';

export default function AdminProductEdit() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [product, setProduct] = useState(null);
    
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
        const fetchData = async () => {
            try {
                // Fetch categories
                const catRes = await adminService.getCategories();
                setCategories(catRes.data?.data || []);

                // Fetch product
                if (id) {
                    const prodRes = await adminService.getProducts();
                    const products = prodRes.data?.data?.data || [];
                    const found = products.find(p => p.id === parseInt(id));
                    
                    if (found) {
                        setProduct(found);
                        setFormData({
                            name: found.name || '',
                            sku: found.sku || '',
                            category_id: found.category_id || '',
                            description: found.description || '',
                            price: found.price || '',
                            stock: found.stock || '',
                            images: Array.isArray(found.images) ? found.images.join('\n') : (found.images || ''),
                            vehicle_compatibility: found.vehicle_compatibility || '',
                            is_active: found.is_active !== false
                        });
                    } else {
                        setError('Product not found');
                    }
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

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
            // Validate required fields
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

            // Prepare data for submission
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

            // Add images if provided
            if (formData.images.trim()) {
                submitData.images = formData.images.split('\n').map(url => url.trim()).filter(Boolean);
            }

            // Submit to API
            if (id) {
                await adminService.updateProduct(id, submitData);
            } else {
                await adminService.createProduct(submitData);
            }
            
            // Redirect to products list
            navigate('/admin/products', { replace: true });
        } catch (err) {
            console.error('Failed to save product:', err);
            setError(err.response?.data?.message || 'Failed to save product. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-dashboard-modern">
                    <PageSkeleton variant="dashboard" label="Loading product editor" />
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-dashboard-modern">
                {/* Header */}
                <div className="admin-page-header" style={{ marginBottom: '2rem' }}>
                    <div className="header-content">
                        <button 
                            onClick={() => navigate('/admin/products')}
                            style={{
                                all: 'unset',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                color: '#64748b',
                                marginBottom: '1rem',
                                fontSize: '0.95rem'
                            }}
                        >
                            <ChevronLeft size={18} />
                            Back to Inventory
                        </button>
                        <h1>{id ? 'Edit Product' : 'Add New Product'}</h1>
                        <p>{id ? 'Update product information' : 'Create a new car part in your inventory'}</p>
                    </div>
                </div>

                {/* Form */}
                <div className="admin-panel" style={{ maxWidth: '800px' }}>
                    {error && (
                        <div style={{
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            background: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '0.5rem',
                            fontSize: '0.95rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Basic Information */}
                        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                            <legend style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>
                                Basic Information
                            </legend>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem' }}>
                                        Product Name <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g., Transmission Fluid"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem' }}>
                                        SKU <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="sku"
                                        value={formData.sku}
                                        onChange={handleChange}
                                        placeholder="e.g., TF-12345"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem' }}>
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Product description..."
                                    rows="4"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.95rem',
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                        </fieldset>

                        {/* Category & Pricing */}
                        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                            <legend style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>
                                Category & Pricing
                            </legend>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem' }}>
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
                                            fontFamily: 'inherit'
                                        }}
                                    >
                                        <option value="">Select a category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem' }}>
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
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem' }}>
                                        Stock Quantity <span style={{ color: '#dc2626' }}>*</span>
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
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem' }}>
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
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {/* Media */}
                        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                            <legend style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>
                                Media
                            </legend>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.95rem' }}>
                                    Image URLs (one per line)
                                </label>
                                <textarea
                                    name="images"
                                    value={formData.images}
                                    onChange={handleChange}
                                    placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                                    rows="3"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.95rem',
                                        fontFamily: 'monospace',
                                        resize: 'vertical'
                                    }}
                                />
                                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                    Enter image URLs, one per line
                                </p>
                            </div>
                        </fieldset>

                        {/* Status */}
                        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                            <legend style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>
                                Status
                            </legend>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                />
                                <label htmlFor="is_active" style={{ cursor: 'pointer', fontSize: '0.95rem' }}>
                                    Active (visible to customers)
                                </label>
                            </div>
                        </fieldset>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                            <button
                                type="button"
                                onClick={() => navigate('/admin/products')}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    color: '#1e293b',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    fontSize: '0.95rem',
                                    transition: 'all 0.15s'
                                }}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: submitting ? '#cbd5e1' : '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    fontWeight: 500,
                                    fontSize: '0.95rem',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {submitting ? 'Saving...' : id ? 'Update Product' : 'Create Product'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
