import api from './api';

const withCartConfig = (config, extras = {}) =>
    ({ ...extras, ...(config || {}) });

export const cartService = {
    getCart: (config) =>
        api.get('/cart', withCartConfig(config, { skipAuthRedirect: true })),

    getSummary: (config) =>
        api.get('/cart/summary', withCartConfig(config, { skipAuthRedirect: true, timeout: 20000 })),

    addItem: (data, config) =>
        api.post('/cart/add', data, withCartConfig(config, { skipAuthRedirect: true, timeout: 6000 })),

    updateItem: (cartItemId, data, config) =>
        api.patch(`/cart/${cartItemId}`, data, withCartConfig(config, { skipAuthRedirect: true })),

    removeItem: (cartItemId, config) =>
        api.delete(`/cart/${cartItemId}`, withCartConfig(config, { skipAuthRedirect: true })),

    clearCart: (config) =>
        api.delete('/cart', withCartConfig(config, { skipAuthRedirect: true })),
};

export default cartService;
