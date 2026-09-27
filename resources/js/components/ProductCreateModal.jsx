import React, { useEffect, useState } from 'react';
import adminService from '../services/adminService';
import { X, Upload, XCircle } from 'lucide-react';
import PageSkeleton from './Skeleton';

export default function ProductCreateModal({ isOpen, onClose, onSuccess }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        description: '',
        price: '',
        stock: '',
        images: [],
        vehicle_compatibility: '',
        brand: '',
        is_active: true
    });

    const [imagePreviews, setImagePreviews] = useState([]);

    useEffect(() => {
        if (isOpen) {
            const fetchCategories = async () => {
                try {
                    const res = await adminService.getCategories();
                    setCategories(res.data?.data || []);
                } catch (err) {
                    console.error('Failed to fetch categories:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchCategories();
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        console.log('Files selected:', files.length);
        
        const newPreviews = [];
        const newImages = [];

        files.forEach((file, fileIndex) => {
            console.log('File:', file.name, file.type);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = event.target.result;
                    console.log('Preview data URL:', preview.substring(0, 50) + '...');
                    setImagePreviews(prev => {
                        const updated = [...prev, preview];
                        console.log('Updated previews:', updated);
                        return updated;
                    });
                };
                reader.readAsDataURL(file);
                newImages.push(file);
            }
        });

        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...newImages]
        }));
    };

    const handleRemoveImage = (index) => {
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
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

            // Prepare form data with image upload
            const submitData = new FormData();
            submitData.append('name', formData.name.trim());
            submitData.append('category_id', parseInt(formData.category_id));
            submitData.append('description', formData.description.trim());
            submitData.append('price', parseFloat(formData.price));
            submitData.append('stock', parseInt(formData.stock));
            submitData.append('vehicle_compatibility', formData.vehicle_compatibility.trim());
            submitData.append('brand', formData.brand.trim());
            submitData.append('is_active', formData.is_active ? '1' : '0');

            // Append images
            formData.images.forEach((image, index) => {
                if (image instanceof File) {
                    submitData.append(`images[${index}]`, image);
                }
            });

            // Submit to API
            await adminService.createProduct(submitData);
            
            // Reset form
            setFormData({
                name: '',
                category_id: '',
                description: '',
                price: '',
                stock: '',
                images: [],
                vehicle_compatibility: '',
                brand: '',
                is_active: true
            });
            setImagePreviews([]);
            
            // Call success callback
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create product:', err);
            setError(err.response?.data?.message || 'Failed to create product. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setFormData({
                name: '',
                category_id: '',
                description: '',
                price: '',
                stock: '',
                images: [],
                vehicle_compatibility: '',
                brand: '',
                is_active: true
            });
            setImagePreviews([]);
            setError('');
            onClose();
        }
    };

    if (!isOpen) return null;

    console.log('Rendering ProductCreateModal, imagePreviews:', imagePreviews.length);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                            Add New Product
                        </h2>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                            Create a new car part in your inventory
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close product creation form"
                        onClick={handleClose}
                        disabled={submitting}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            color: '#64748b',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => !submitting && (e.currentTarget.style.background = '#f1f5f9')}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div style={{ padding: '1.5rem' }}>
                    {error && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            marginBottom: '1rem',
                            background: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            border: '1px solid #fecaca'
                        }}>
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <PageSkeleton variant="list" label="Loading product categories" />
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Product Name */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem', color: '#1e293b' }}>
                                    Product Name <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g., Transmission Fluid"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.75rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        color: '#1e293b'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem', color: '#1e293b' }}>
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Product description..."
                                    rows="3"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.75rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        fontFamily: 'inherit',
                                        resize: 'vertical',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        color: '#1e293b'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                />
                            </div>

                            {/* Category & Price */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem', color: '#1e293b' }}>
                                        Category <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <select
                                        name="category_id"
                                        value={formData.category_id}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            color: '#1e293b',
                                            backgroundColor: '#fff'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                        onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
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
                                    <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem', color: '#1e293b' }}>
                                        Price (₱) <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            color: '#1e293b'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                        onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                    />
                                </div>
                            </div>

                            {/* Stock & Vehicle Compatibility */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem', color: '#1e293b' }}>
                                        Stock Quantity <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="stock"
                                        value={formData.stock}
                                        onChange={handleChange}
                                        placeholder="0"
                                        min="0"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            color: '#1e293b'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                        onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem', color: '#1e293b' }}>
                                        Brand <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="brand"
                                        value={formData.brand}
                                        onChange={handleChange}
                                        placeholder="e.g., Bosch, Denso"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 0.75rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            color: '#1e293b'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                        onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                    />
                                </div>
                            </div>

                            {/* Vehicle Compatibility */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem', color: '#1e293b' }}>
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
                                        padding: '0.625rem 0.75rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        color: '#1e293b'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem', color: '#1e293b' }}>
                                    Product Images
                                </label>
                                <div style={{
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '1.5rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                onClick={() => document.getElementById('image-upload').click()}
                                >
                                    <input
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <Upload size={32} color="#64748b" style={{ marginBottom: '0.5rem' }} />
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                                        Click to upload images
                                    </p>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                                        PNG, JPG, GIF up to 5MB each
                                    </p>
                                </div>

                                {/* Image Previews */}
                                {imagePreviews.length > 0 && (
                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '1rem',
                                        background: '#e0e7ff',
                                        border: '2px solid #3b82f6',
                                        borderRadius: '8px'
                                    }}>
                                        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#1e40af' }}>
                                            {imagePreviews.length} image(s) selected
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} style={{ position: 'relative' }}>
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index + 1}`}
                                                        style={{
                                                            width: '100px',
                                                            height: '100px',
                                                            objectFit: 'cover',
                                                            borderRadius: '8px',
                                                            border: '2px solid #3b82f6',
                                                            display: 'block'
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveImage(index)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '-8px',
                                                            right: '-8px',
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: '2px solid white',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                />
                                <label htmlFor="is_active" style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#1e293b' }}>
                                    Active (visible to customers)
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={submitting}
                                    style={{
                                        flex: 1,
                                        padding: '0.625rem 1rem',
                                        border: '1px solid #cbd5e1',
                                        background: '#f8fafc',
                                        color: '#1e293b',
                                        borderRadius: '6px',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        fontWeight: 500,
                                        fontSize: '0.875rem',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        flex: 1,
                                        padding: '0.625rem 1rem',
                                        background: submitting ? '#cbd5e1' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        fontWeight: 500,
                                        fontSize: '0.875rem',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {submitting ? 'Creating...' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
