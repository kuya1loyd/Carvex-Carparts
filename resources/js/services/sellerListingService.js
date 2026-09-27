import api from './api';

const multipartConfig = { timeout: 20000, headers: {} };

const sellerListingService = {
    getListings: (params, config) =>
        api.get('/seller/listings', { params, timeout: 15000, ...config }),

    createListing: (formData, config) =>
        api.post('/seller/listings', formData, { ...multipartConfig, ...config }),

    updateListing: (id, formData, config) => {
        // Laravel's request parser handles multipart uploads on POST; method
        // spoofing keeps uploaded files available to the PATCH controller.
        if (formData instanceof FormData && !formData.has('_method')) {
            formData.append('_method', 'PATCH');
        }
        return api.post(`/seller/listings/${id}`, formData, { ...multipartConfig, ...config });
    },

    archiveListing: (id, config) =>
        api.delete(`/seller/listings/${id}`, { timeout: 15000, ...config }),
};

export default sellerListingService;
