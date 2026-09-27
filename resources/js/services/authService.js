import api from './api';

export const authService = {
    register: (data, config) => api.post('/auth/register', data, { timeout: 20000, ...config }),
    
    login: (data, config) => 
        api.post('/auth/login', data, { timeout: 12000, ...config }),
    
    forgotPassword: (data, config) =>
        api.post(
            '/auth/forgot-password',
            {
                ...data,
                redirect_to: `${window.location.origin}/reset-password`,
            },
            { timeout: 20000, ...config }
        ),
    
    resetPassword: (data, config) =>
        api.post('/auth/reset-password', {
            ...data,
            password_confirmation: data.password_confirmation || data.password,
        }, { timeout: 8000, ...config }),
    
    getSocialAuthUrl: (provider, redirectTo, config) => 
        api.get(`/auth/oauth-url/${provider}`, { params: { redirect_to: redirectTo }, ...config }),
    
    logout: (config) => 
        api.post('/auth/logout', {}, config),
    
    getProfile: (config) => 
        api.get('/auth/me', { timeout: 3000, ...config }),
    
    updateProfile: (data, config) => 
        api.put('/auth/profile', data, { timeout: 20000, ...config }),
    
    uploadAvatar: (file, config) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return api.post('/auth/profile/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            ...config,
        });
    },
};

export default authService;
