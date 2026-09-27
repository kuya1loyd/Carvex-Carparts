import api from './api';

const adminService = {
    getStats: (config) =>
        api.get('/admin/stats', { timeout: 12000, ...config }),

    getActivity: (params, config) =>
        api.get('/admin/activity', { params, timeout: 12000, ...config }),

    reviewSellerProduct: (id, data, config) =>
        api.patch(`/admin/products/${id}/review`, data, { timeout: 12000, ...config }),

    getUsers: (config) =>
        api.get('/admin/users', { timeout: 12000, ...config }),

    deleteUser: (data, config) =>
        api.delete('/admin/users', { data, timeout: 12000, ...config }),

    toggleUserStatus: (userId, config) =>
        api.patch(`/admin/users/${userId}/toggle`, {}, { timeout: 12000, ...config }),

    notifyUser: (userId, data, config) =>
        api.post(`/admin/users/${userId}/notify`, data, { timeout: 12000, ...config }),

    sendPromoCode: (userId, data, config) =>
        api.post(`/admin/users/${userId}/promo-code`, data, { timeout: 12000, ...config }),

    getProducts: (config) =>
        api.get('/admin/products', { timeout: 12000, ...config }),

    createProduct: (data, config) =>
        api.post('/admin/products', data, { 
            timeout: 12000, 
            headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
            ...config 
        }),

    updateProduct: (id, data, config) =>
        api.patch(`/admin/products/${id}`, data, { timeout: 12000, ...config }),

    deleteProduct: (id, config) =>
        api.delete(`/admin/products/${id}`, { timeout: 12000, ...config }),

    uploadProductImage: async () => {
        throw new Error('Product image upload endpoint is not configured.');
    },

    getCategories: (config) =>
        api.get('/categories', { timeout: 12000, ...config }),

    createCategory: (data, config) =>
        api.post('/admin/categories', data, { timeout: 12000, ...config }),

    updateCategory: (id, data, config) =>
        api.patch(`/admin/categories/${id}`, data, { timeout: 12000, ...config }),

    deleteCategory: (id, config) =>
        api.delete(`/admin/categories/${id}`, { timeout: 12000, ...config }),

    getAllOrders: (config) =>
        api.get('/admin/orders', { timeout: 15000, ...config }),

    getOrderById: (id, config) =>
        api.get(`/admin/orders/${id}`, { timeout: 12000, ...config }),

    updateOrderStatus: (id, status, trackingNumber, config) =>
        api.patch(
            `/admin/orders/${id}/status`,
            {
                status,
                tracking_number: typeof trackingNumber === 'undefined' ? undefined : trackingNumber,
            },
            { timeout: 12000, ...config }
        ),

    deleteOrder: (id, config) =>
        api.delete(`/admin/orders/${id}`, { timeout: 12000, ...config }),

    getSalesReport: (config) =>
        api.get('/admin/sales-report', { timeout: 15000, ...config }),

    getCustomerConcerns: (params, config) =>
        api.get('/admin/customer-concerns', { params, timeout: 12000, ...config }),

    updateCustomerConcern: (id, data, config) =>
        api.patch(`/admin/customer-concerns/${id}`, data, { timeout: 12000, ...config }),
};

export default adminService;
