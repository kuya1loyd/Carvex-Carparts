export const loadAdminDashboard = () => import('../pages/Admin/Dashboard');
export const loadAdminAccount = () => import('../pages/Admin/Account');
export const loadAdminProducts = () => import('../pages/Admin/Products');
export const loadAdminOrders = () => import('../pages/Admin/Orders');
export const loadAdminUsers = () => import('../pages/Admin/Users');
export const loadAdminConcerns = () => import('../pages/Admin/Concerns');
export const loadAdminActivity = () => import('../pages/Admin/Activity');

const adminRouteLoaders = {
    '/admin/dashboard': loadAdminDashboard,
    '/admin/account': loadAdminAccount,
    '/admin/products': loadAdminProducts,
    '/admin/orders': loadAdminOrders,
    '/admin/users': loadAdminUsers,
    '/admin/activity': loadAdminActivity,
    '/admin/customer-service': loadAdminConcerns,
    '/admin/concerns': loadAdminConcerns,
};

export const preloadAdminRoute = (path) => {
    const loader = adminRouteLoaders[path];

    if (!loader) {
        return;
    }

    void loader();
};

export const preloadAllAdminRoutes = () => {
    Object.values(adminRouteLoaders).forEach((loader) => {
        void loader();
    });
};
