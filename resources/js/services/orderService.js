import api from './api';

export const orderService = {
    getOrders: (params, config) =>
        api.get('/orders', { params, ...config }),

    getMyOrders: (config) =>
        api.get('/my-orders', config),

    getOrderSummary: (config) =>
        api.get('/my-orders/summary', config),

    getOrderById: (id, config) =>
        api.get(`/orders/${id}`, config),

    getOrder: (id, config) =>
        api.get(`/orders/${id}`, config),

    createOrder: (data, config) =>
        api.post('/orders', data, { timeout: 12000, ...config }),

    validatePromoCode: (data, config) =>
        api.post('/promo-codes/validate', data, { timeout: 12000, ...config }),

    cancelOrder: (id, config) =>
        api.patch(`/orders/${id}/cancel`, {}, config),

    updatePaymentStatus: (id, data, config) =>
        api.patch(`/orders/${id}/payment-status`, data, config),
};

export default orderService;
