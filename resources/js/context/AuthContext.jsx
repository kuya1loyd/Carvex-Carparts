import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { clearApiCacheForCurrentUser } from '../services/api';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const cachedToken = localStorage.getItem('auth_token');
    const [user, setUser] = useState(() => {
        try {
            const cachedAuthUser = localStorage.getItem('auth_user');
            const cachedLegacyUser = localStorage.getItem('user');
            const cached = cachedAuthUser || cachedLegacyUser;
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [token, setToken] = useState(cachedToken);
    const [isReady, setIsReady] = useState(false);

    const getCachedUser = () => {
        try {
            const cached = localStorage.getItem('auth_user') || localStorage.getItem('user');
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    };

    const mergeUserPayload = (payload) => {
        const userPayload = payload?.user || null;
        const customerInfo = payload?.customer_info || {};
        const cachedUser = getCachedUser();

        if (!userPayload) {
            return null;
        }

        const email = userPayload?.email || customerInfo?.email || cachedUser?.email || '';

        return {
            ...cachedUser,
            ...customerInfo,
            ...userPayload,
            ...customerInfo,
            email,
        };
    };

    // Check if user is logged in on mount
    useEffect(() => {
        let isCancelled = false;
        let bootstrapGuardTimer = null;
        let frameId = null;

        // Mark as ready immediately since we have cached user
        setIsReady(true);

        // Revalidate silently after the first paint.
        bootstrapGuardTimer = window.setTimeout(() => {
            if (!isCancelled) {
                setLoading(false);
            }
        }, 1800);

        if (token) {
            const runValidation = () => {
                if (isCancelled) {
                    return;
                }

                // Non-blocking auth check: fire off async but don't block page render.
                // Set loading to false immediately if we have cached user, then revalidate silently.
                if (user) {
                    // Skip revalidation if session is fresh (less than 10 minutes old)
                    const lastAuthTime = Number(localStorage.getItem('auth_validated_at') || 0);
                    const now = Date.now();
                    const isSessionFresh = (now - lastAuthTime) < (10 * 60 * 1000); // 10 minutes

                    if (isSessionFresh) {
                        return;
                    }
                }

                // Revalidate in background with ultra-short timeout (1s) if session is stale.
                Promise.race([
                    authService.getProfile({ timeout: 1000 }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Auth bootstrap timeout')), 1200)
                    ),
                ])
                    .then((res) => {
                        if (isCancelled) {
                            return;
                        }

                        const nextUser = mergeUserPayload(res?.data);
                        if (nextUser) {
                            setUser(nextUser);
                            localStorage.setItem('auth_user', JSON.stringify(nextUser));
                            localStorage.setItem('auth_validated_at', String(Date.now()));
                        }
                    })
                    .catch((error) => {
                        if (isCancelled) {
                            return;
                        }

                        const status = error?.response?.status;

                        // Only clear auth for explicit unauthorized responses.
                        if (status === 401 || status === 403) {
                            localStorage.removeItem('auth_token');
                            localStorage.removeItem('auth_user');
                            localStorage.removeItem('auth_validated_at');
                            setToken(null);
                            setUser(null);
                        }
                        // Otherwise keep cached user, auth will retry next time.
                    })
                    .finally(() => {
                        if (!isCancelled) {
                            setLoading(false);
                        }
                    });
            };

            frameId = window.requestAnimationFrame(runValidation);
        } else {
            setUser(null);
            localStorage.removeItem('auth_user');
            setLoading(false);
        }

        return () => {
            isCancelled = true;
            if (bootstrapGuardTimer !== null) {
                window.clearTimeout(bootstrapGuardTimer);
            }
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [token]);

    const login = async (email, password) => {
        try {
            const res = await authService.login({ email, password });
            localStorage.setItem('auth_token', res.data.token);
            const mergedUser = mergeUserPayload(res.data) || res.data.user;
            localStorage.setItem('auth_user', JSON.stringify(mergedUser));
            localStorage.setItem('auth_validated_at', String(Date.now()));
            setToken(res.data.token);
            setUser(mergedUser);
            return res.data;
        } catch (error) {
            throw error;
        }
    };

    // OAuth token-based login (for Google/social auth)
    const loginWithToken = async (token) => {
        try {
            // Store token immediately
            localStorage.setItem('auth_token', token);
            setToken(token);

            // Try to fetch user profile with the token
            try {
                const res = await authService.getProfile({ timeout: 5000 });
                const mergedUser = mergeUserPayload(res?.data) || res?.data?.user || res?.data;
                if (mergedUser) {
                    localStorage.setItem('auth_user', JSON.stringify(mergedUser));
                    localStorage.setItem('auth_validated_at', String(Date.now()));
                    setUser(mergedUser);
                }
            } catch (profileErr) {
                // User data will be fetched on next auth check, don't fail
                console.warn('Could not fetch user profile after OAuth login:', profileErr);
            }

            return { token, user };
        } catch (error) {
            localStorage.removeItem('auth_token');
            setToken(null);
            throw error;
        }
    };

    const register = async (data) => {
        try {
            const res = await authService.register(data);
            return res.data;
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        if (logoutLoading) {
            return;
        }

        setLogoutLoading(true);
        clearApiCacheForCurrentUser();
        try {
            await Promise.race([
                authService.logout().catch(() => null),
                new Promise((resolve) => setTimeout(resolve, 450)),
            ]);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setToken(null);
            setUser(null);
            setLogoutLoading(false);
        }
    };

    const updateProfile = async (data) => {
        try {
            const res = await authService.updateProfile(data);
            const mergedUser = mergeUserPayload(res.data) || { ...getCachedUser(), ...(res.data?.user || {}) };
            setUser(mergedUser);
            localStorage.setItem('auth_user', JSON.stringify(mergedUser));
            localStorage.setItem('auth_validated_at', String(Date.now()));
            return res.data;
        } catch (error) {
            throw error;
        }
    };

    const uploadAvatar = async (file) => {
        try {
            const res = await authService.uploadAvatar(file, { timeout: 20000 });
            const avatarUrl = String(res?.data?.avatar_url || '').trim();
            const timestamp = Date.now();
            const nextUser = {
                ...getCachedUser(),
                ...user,
                ...(avatarUrl ? { avatar_url: avatarUrl, avatar_updated_at: timestamp } : {}),
            };

            setUser(nextUser);
            localStorage.setItem('auth_user', JSON.stringify(nextUser));
            localStorage.setItem('auth_validated_at', String(timestamp));

            return res.data;
        } catch (error) {
            throw error;
        }
    };

    const isAuthenticated = !!token && !!user;
    const isAdmin = String(user?.role || '').toLowerCase().trim() === 'admin';

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                logoutLoading,
                isAuthenticated,
                isAdmin,
                isReady,
                login,
                loginWithToken,
                register,
                logout,
                updateProfile,
                uploadAvatar,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
