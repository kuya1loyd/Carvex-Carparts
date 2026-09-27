import axios from 'axios';

const resolveApiBaseUrl = () => {
    const envBaseUrl = String(process.env.MIX_API_BASE_URL || '').trim();
    const currentHost = String(window.location.hostname || '').trim().toLowerCase();
    const isLoopbackHost = (host) => host === 'localhost' || host === '127.0.0.1';
    const isLocalDevHost = isLoopbackHost(currentHost);
    const currentPort = String(window.location.port || '');

    // When the app is already loaded from loopback on port 8000, keep API
    // calls on the same origin to avoid localhost/127.0.0.1 mismatches.
    if (isLocalDevHost && currentPort === '8000') {
        return `${window.location.origin}/api`;
    }

    if (envBaseUrl) {
        try {
            const parsed = new URL(envBaseUrl);
            const envHost = String(parsed.hostname || '').trim().toLowerCase();

            // Ignore loopback env URLs when the app is opened from a different host/IP.
            // This prevents long timeouts to the wrong machine on refresh.
            if (!(isLoopbackHost(envHost) && !isLoopbackHost(currentHost))) {
                return envBaseUrl.replace(/\/+$/, '');
            }
        } catch {
            return envBaseUrl.replace(/\/+$/, '');
        }
    }

    if (isLocalDevHost && currentPort !== '8000') {
        return `${window.location.protocol}//${currentHost}:8000/api`;
    }

    return `${window.location.origin}/api`;
};

const API_BASE_URL = resolveApiBaseUrl();
const API_CACHE_PREFIX = 'carvex_api_cache_v1:';
const CART_CACHE_PREFIX = 'customer_cart_cache_v2:';
const API_CACHE_FRESH_MS = 30 * 1000;
const API_CACHE_MAX_STALE_MS = 24 * 60 * 60 * 1000;
const inFlightReads = new Map();
const cacheEpochByScope = new Map();

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 8000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Keep the normal Axios adapter as the network path used by our cache adapter.
const networkAdapter = api.defaults.adapter;

const getRequestToken = (config = {}) => {
    const authorization = config.headers?.Authorization || config.headers?.authorization || '';
    const headerToken = String(authorization).replace(/^Bearer\s+/i, '').trim();
    return headerToken || localStorage.getItem('auth_token') || '';
};

// Cache keys are partitioned by a compact hash of the bearer token. The token
// itself is never stored in the cache key or cache record.
const hashIdentity = (identity) => {
    if (!identity) {
        return 'guest';
    }

    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < identity.length; index += 1) {
        const code = identity.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ (code + index), 0x85ebca6b);
    }

    return `u_${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
};

export const getApiCacheScope = () => hashIdentity(localStorage.getItem('auth_token') || '');

const scopeForRequest = (config) => hashIdentity(getRequestToken(config));

const cacheKeyForRequest = (config) => {
    const requestUrl = new URL(api.getUri(config), window.location.origin);
    requestUrl.hash = '';
    return `${API_CACHE_PREFIX}${scopeForRequest(config)}:${requestUrl.toString()}`;
};

const isCacheableRequest = (config = {}) => {
    if (String(config.method || 'get').toLowerCase() !== 'get' || config.cache === false) {
        return false;
    }

    let pathname = '';
    try {
        pathname = new URL(api.getUri(config), window.location.origin).pathname;
    } catch {
        return false;
    }

    // These endpoints contain identity, operational, or quickly changing data.
    // Product stock is volatile even though product descriptions are cacheable.
    return !/(?:^|\/)(?:auth|cart|orders?|my-orders|notifications|customer-concerns|promo-codes|addresses|wallet|wishlist)(?:\/|$)/i.test(pathname)
        && !/(?:^|\/)admin\/users(?:\/|$)/i.test(pathname)
        && !/(?:^|\/)admin\/activity(?:\/|$)/i.test(pathname)
        && !/(?:^|\/)stock(?:\/|$)/i.test(pathname);
};

const readCacheEntry = (key) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return null;
        }

        const entry = JSON.parse(raw);
        const age = Date.now() - Number(entry?.savedAt || 0);
        if (!entry || age < 0 || age > API_CACHE_MAX_STALE_MS || !Object.prototype.hasOwnProperty.call(entry, 'data')) {
            localStorage.removeItem(key);
            return null;
        }

        return { ...entry, age };
    } catch {
        return null;
    }
};

const writeCacheEntry = (key, response) => {
    const contentType = String(response?.headers?.['content-type'] || response?.headers?.['Content-Type'] || '').toLowerCase();
    if (response?.status < 200 || response?.status >= 300 || (contentType && !contentType.includes('json'))) {
        return;
    }

    try {
        localStorage.setItem(key, JSON.stringify({
            savedAt: Date.now(),
            status: response.status || 200,
            statusText: response.statusText || 'OK',
            headers: { 'content-type': contentType || 'application/json' },
            data: response.data,
        }));
    } catch {
        // Cache is an enhancement: quota and private-mode storage failures are harmless.
    }
};

const clearCacheScope = (scope, { clearCart = false } = {}) => {
    cacheEpochByScope.set(scope, (cacheEpochByScope.get(scope) || 0) + 1);
    const prefix = `${API_CACHE_PREFIX}${scope}:`;
    try {
        const keys = [];
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key?.startsWith(prefix)) {
                keys.push(key);
            }
        }
        if (clearCart) {
            keys.push(`${CART_CACHE_PREFIX}${scope}`);
        }
        keys.forEach((key) => localStorage.removeItem(key));
    } catch {
        // Keep mutations working if storage is unavailable.
    }
};

export const clearApiCacheForCurrentUser = () => clearCacheScope(getApiCacheScope(), { clearCart: true });

const cachedResponse = (entry, config) => ({
    data: entry.data,
    status: entry.status || 200,
    statusText: entry.statusText || 'OK',
    headers: entry.headers || { 'content-type': 'application/json' },
    config: { ...config, __persistentCacheHit: true },
    request: null,
});

const runBackgroundRefresh = (config, key) => {
    if (inFlightReads.has(key)) {
        return inFlightReads.get(key);
    }

    const refresh = api.request({ ...config, skipCacheLookup: true })
        .catch(() => null)
        .finally(() => inFlightReads.delete(key));
    inFlightReads.set(key, refresh);
    return refresh;
};

api.defaults.adapter = async (config) => {
    if (!isCacheableRequest(config)) {
        return networkAdapter(config);
    }

    const scope = scopeForRequest(config);
    config.__persistentCacheScope = scope;
    config.__persistentCacheEpoch = cacheEpochByScope.get(scope) || 0;
    if (config.skipCacheLookup) {
        return networkAdapter(config);
    }

    const key = cacheKeyForRequest(config);
    const entry = readCacheEntry(key);
    if (entry) {
        if (entry.age > API_CACHE_FRESH_MS) {
            runBackgroundRefresh(config, key);
        }
        return cachedResponse(entry, config);
    }

    // Concurrent first visits to the same resource share one underlying request.
    if (inFlightReads.has(key)) {
        const sharedResponse = await inFlightReads.get(key);
        return { ...sharedResponse, config };
    }

    const request = networkAdapter(config);
    inFlightReads.set(key, request);
    try {
        const response = await request;
        return { ...response, config };
    } finally {
        inFlightReads.delete(key);
    }
};

// Add token to requests if available.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Persist safe JSON reads and invalidate a user's cached data after mutations.
api.interceptors.response.use(
    (response) => {
        if (response.config?.__persistentCacheHit) {
            return response;
        }

        if (isCacheableRequest(response.config)) {
            const scope = scopeForRequest(response.config);
            if (response.config?.__persistentCacheEpoch === (cacheEpochByScope.get(scope) || 0)) {
                writeCacheEntry(cacheKeyForRequest(response.config), response);
            }
        } else if (String(response.config?.method || '').toLowerCase() !== 'get') {
            clearCacheScope(scopeForRequest(response.config));
        }

        return response;
    },
    (error) => {
        if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
            clearCacheScope(scopeForRequest(error.config || {}), { clearCart: true });
            // Clear token and redirect to login.
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
