import api from './api';

const freshRead = { skipCacheLookup: true };

export const messageService = {
    getConversations: (config) => api.get('/messages', { ...freshRead, ...config }),
    getUnreadCount: (config) => api.get('/messages/unread-count', { ...freshRead, ...config }),
    getConversation: (conversationId, config) => api.get(`/messages/${conversationId}`, { ...freshRead, ...config }),
    startConversation: (productId, body, config) => api.post('/messages', {
        product_id: productId,
        body,
    }, config),
    reply: (conversationId, body, config) => api.post(`/messages/${conversationId}`, { body }, config),
    getAdminConversations: (params, config) => api.get('/admin/messages', { ...freshRead, params, ...config }),
    getAdminConversation: (conversationId, config) => api.get(`/admin/messages/${conversationId}`, { ...freshRead, ...config }),
    deleteAdminConversation: (conversationId, config) => api.delete(`/admin/messages/${conversationId}`, config),
};

export default messageService;
