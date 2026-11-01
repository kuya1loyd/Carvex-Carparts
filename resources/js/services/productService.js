import api from './api';

const productsCache = new Map();

export const clearProductsCache = () => {
    productsCache.clear();
};

export const productService = {
    getAll: async (params, config) => {
        const key = JSON.stringify(params || {});
        const cached = productsCache.get(key);
        const now = Date.now();
        if (cached && (now - cached.timestamp < 45000)) {
            return cached.response;
        }
        const response = await api.get('/products', { params, ...config });
        productsCache.set(key, { timestamp: now, response });
        return response;
    },

    getById: async (id, config) =>
        api.get(`/products/${id}`, config),

    getFeatured: async (config) =>
        api.get('/products/featured', config),

    getHotDeals: async (config) =>
        api.get('/products/hot-deals', config),

    getPremium: async (config) =>
        api.get('/products/premium', config),

    getByCategory: async (categoryId, params, config) =>
        api.get(`/products/category/${categoryId}`, { params, ...config }),

    checkStock: async (id, config) =>
        api.get(`/products/${id}/stock`, config),

    search: async (query, config) =>
        productService.getAll({ search: query }, config),

    clearCache: clearProductsCache,
};

export default productService;
