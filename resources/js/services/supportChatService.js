import api from './api';

export const supportChatService = {
    reply: (messages, config) => api.post('/support/chat', { messages }, {
        timeout: 25000,
        ...config,
    }),
};

export default supportChatService;
