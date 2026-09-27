import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import cartService from '../services/cartService';
import { useAuth } from './AuthContext';
import { getApiCacheScope } from '../services/api';

const CartContext = createContext(undefined);
const CUSTOMER_CART_CACHE_PREFIX = 'customer_cart_cache_v2:';
const getCustomerCartCacheKey = () => `${CUSTOMER_CART_CACHE_PREFIX}${getApiCacheScope()}`;

const readCachedCart = () => {
    try {
        const raw = localStorage.getItem(getCustomerCartCacheKey());
        const parsed = raw ? JSON.parse(raw) : null;
        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        const summary = parsed?.summary && typeof parsed.summary === 'object' ? parsed.summary : null;
        return { items, summary };
    } catch {
        return { items: [], summary: null };
    }
};

const persistCachedCart = (items, summary) => {
    try {
        localStorage.setItem(getCustomerCartCacheKey(), JSON.stringify({ items, summary }));
    } catch {
        // Ignore storage failures (private mode/quota issues).
    }
};

const clearCachedCart = () => {
    try {
        localStorage.removeItem(getCustomerCartCacheKey());
    } catch {
        // Ignore storage failures.
    }
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeItem = (item) => ({
    ...item,
    id: toNumber(item?.id),
    product_id: toNumber(item?.product_id),
    quantity: Math.max(0, toNumber(item?.quantity)),
    product: {
        ...(item?.product || {}),
        id: toNumber(item?.product?.id || item?.product_id),
        name: String(item?.product?.name || item?.name || 'Product'),
        brand: item?.product?.brand || item?.brand,
        price: toNumber(item?.product?.price || item?.price),
        images: item?.product?.images || item?.images || [],
    },
});

export const CartProvider = ({ children }) => {
    const { isAuthenticated, isAdmin } = useAuth();
    const [initialCart] = useState(readCachedCart);
    const [cartItems, setCartItems] = useState(initialCart.items.map(normalizeItem));
    const [cartSummary, setCartSummary] = useState(initialCart.summary);
    const [loading, setLoading] = useState(false);
    const cartItemsRef = useRef(initialCart.items.map(normalizeItem));
    const mutationVersionRef = useRef(new Map());
    const cartRevisionRef = useRef(0);
    const syncTimerRef = useRef(null);
    const optimisticCartItemIdRef = useRef(-1);
    const retryFetchTimerRef = useRef(null);

    useEffect(() => {
        let frameId = null;

        const runBootstrap = () => {
            cartRevisionRef.current += 1;

            if (isAdmin) {
                cartItemsRef.current = [];
                setCartItems([]);
                setCartSummary(null);
                clearCachedCart();
                return;
            }

            if (isAuthenticated) {
                const cachedCart = readCachedCart();
                const hasCachedCart = cachedCart.items.length > 0 || Boolean(cachedCart.summary);
                if (hasCachedCart) {
                    const cachedItems = cachedCart.items.map(normalizeItem);
                    commitCart(cachedItems, cachedCart.summary || buildSummaryFromItems(cachedItems));
                } else {
                    cartItemsRef.current = [];
                    setCartItems([]);
                    setCartSummary(null);
                }
                fetchCart({ silent: hasCachedCart });
            } else {
                cartItemsRef.current = [];
                setCartItems([]);
                setCartSummary(null);
                clearCachedCart();
            }
        };

        frameId = window.requestAnimationFrame(runBootstrap);

        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            if (syncTimerRef.current !== null) {
                window.clearTimeout(syncTimerRef.current);
                syncTimerRef.current = null;
            }
            if (retryFetchTimerRef.current !== null) {
                window.clearTimeout(retryFetchTimerRef.current);
                retryFetchTimerRef.current = null;
            }
        };
    }, [isAuthenticated, isAdmin]);

    const buildSummaryFromItems = (items) => {
        const subtotal = items.reduce((total, item) => {
            const price = toNumber(item?.product?.price || 0);
            const quantity = toNumber(item?.quantity || 0);
            return total + (price * quantity);
        }, 0);
        const totalQuantity = items.reduce((total, item) => total + toNumber(item?.quantity || 0), 0);

        const tax = subtotal * 0.1;
        const shipping = items.length > 0 ? 50 : 0;
        const total = subtotal + tax + shipping;

        return {
            items,
            subtotal,
            tax,
            shipping,
            total,
            item_count: totalQuantity,
        };
    };

    const commitCart = (items, summary = null) => {
        const normalizedItems = items.map(normalizeItem);
        const nextSummary = summary || buildSummaryFromItems(normalizedItems);
        cartItemsRef.current = normalizedItems;
        setCartItems(normalizedItems);
        setCartSummary(nextSummary);
        persistCachedCart(normalizedItems, nextSummary);
    };

    const beginItemMutation = (cartItemId) => {
        const key = String(cartItemId);
        const nextVersion = (mutationVersionRef.current.get(key) || 0) + 1;
        mutationVersionRef.current.set(key, nextVersion);
        cartRevisionRef.current += 1;
        return nextVersion;
    };

    const rollbackItemMutation = (cartItemId, priorItem, priorIndex, version) => {
        if (mutationVersionRef.current.get(String(cartItemId)) !== version) {
            return;
        }

        const productId = toNumber(priorItem?.product?.id || priorItem?.product_id);
        const currentProductItem = productId > 0
            ? cartItemsRef.current.find((item) => (
                toNumber(item?.product?.id || item?.product_id) === productId && toNumber(item?.id) > 0
            )) || cartItemsRef.current.find((item) => toNumber(item?.product?.id || item?.product_id) === productId)
            : null;
        const next = cartItemsRef.current.filter((item) => (
            toNumber(item?.id) !== toNumber(cartItemId)
            && !(productId > 0 && toNumber(item?.product?.id || item?.product_id) === productId)
        ));
        if (priorItem) {
            const restoredItem = currentProductItem && toNumber(currentProductItem.id) > 0
                ? { ...currentProductItem, ...priorItem, id: currentProductItem.id }
                : priorItem;
            next.splice(Math.min(priorIndex, next.length), 0, restoredItem);
        }
        commitCart(next);
        cartRevisionRef.current += 1;
        if (toNumber(cartItemId) >= 0) {
            syncCartInBackground();
        }
    };

    const syncCartInBackground = () => {
        if (syncTimerRef.current !== null) {
            window.clearTimeout(syncTimerRef.current);
        }

        syncTimerRef.current = window.setTimeout(() => {
            fetchCart({ silent: true }).catch(() => {
                // Ignore sync failures; local state remains usable.
            });
            syncTimerRef.current = null;
        }, 650);
    };

    const fetchCart = async (options = {}) => {
        const silent = Boolean(options?.silent);
        const timeoutMs = Number(options?.timeoutMs || 6000);
        const revisionAtStart = cartRevisionRef.current;
        const scopeAtStart = getApiCacheScope();
        const isTimeoutError = (error) => {
            const code = String(error?.code || '').toUpperCase();
            const message = String(error?.message || '').toLowerCase();
            return code === 'ECONNABORTED' || message.includes('timeout');
        };

        try {
            if (!silent) {
                setLoading(true);
            }

            try {
                const summaryRes = await cartService.getSummary({ timeout: timeoutMs });
                const summaryData = summaryRes?.data?.data || null;
                const nextItems = Array.isArray(summaryData?.items) ? summaryData.items.map(normalizeItem) : [];
                const nextSummary = summaryData
                    ? {
                        ...summaryData,
                        items: nextItems,
                        subtotal: toNumber(summaryData.subtotal),
                        tax: toNumber(summaryData.tax),
                        shipping: toNumber(summaryData.shipping),
                        total: toNumber(summaryData.total),
                        item_count: toNumber(summaryData.item_count),
                    }
                    : buildSummaryFromItems(nextItems);

                if (cartRevisionRef.current === revisionAtStart && scopeAtStart === getApiCacheScope()) {
                    commitCart(nextItems, nextSummary);
                }
                return;
            } catch {
                if (scopeAtStart !== getApiCacheScope()) {
                    return;
                }
                // Fallback to cart endpoint if summary endpoint is slow/unavailable.
            }

            const cartRes = await cartService.getCart({ timeout: timeoutMs });
            const rawItems = cartRes?.data?.data;
            const nextItems = (Array.isArray(rawItems) ? rawItems : []).map(normalizeItem);
            const nextSummary = buildSummaryFromItems(nextItems);
            if (cartRevisionRef.current === revisionAtStart && scopeAtStart === getApiCacheScope()) {
                commitCart(nextItems, nextSummary);
            }
        } catch (error) {
            if (scopeAtStart !== getApiCacheScope()) {
                return;
            }

            const timedOut = isTimeoutError(error);
            if (timedOut) {
                console.warn('Cart request timed out. Using cached cart and retrying in background.');
            } else {
                console.error('Failed to fetch cart:', error);
            }

            const cached = readCachedCart();
            if (cartRevisionRef.current !== revisionAtStart) {
                return;
            }

            if (cached.items.length > 0 || cached.summary) {
                const normalizedCachedItems = cached.items.map(normalizeItem);
                commitCart(normalizedCachedItems, cached.summary || buildSummaryFromItems(normalizedCachedItems));
            } else {
                const emptySummary = buildSummaryFromItems([]);
                commitCart([], emptySummary);
                persistCachedCart([], emptySummary);
            }

            if (timedOut && retryFetchTimerRef.current === null) {
                retryFetchTimerRef.current = window.setTimeout(() => {
                    fetchCart({ silent: true, timeoutMs: 12000 }).catch(() => {
                        // Keep cached cart state if retry still fails.
                    });
                    retryFetchTimerRef.current = null;
                }, 1800);
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const addItem = async (productId, quantity, optimisticProduct) => {
        const scopeAtStart = getApiCacheScope();
        const amount = Math.max(1, toNumber(quantity || 1));
        const currentItems = cartItemsRef.current;
        const existingItem = currentItems.find((item) => toNumber(item?.product?.id || item?.product_id || 0) === toNumber(productId));
        const existingIndex = existingItem ? currentItems.indexOf(existingItem) : -1;
        cartRevisionRef.current += 1;

        if (optimisticProduct) {
            const next = [...currentItems];
            if (existingIndex >= 0) {
                next[existingIndex] = { ...existingItem, quantity: toNumber(existingItem.quantity) + amount };
            } else {
                const optimisticItemId = optimisticCartItemIdRef.current;
                optimisticCartItemIdRef.current -= 1;
                next.unshift({
                    id: optimisticItemId,
                    product_id: toNumber(productId),
                    quantity: amount,
                    product: {
                        id: toNumber(productId),
                        name: String(optimisticProduct?.name || 'Product'),
                        brand: optimisticProduct?.brand,
                        price: toNumber(optimisticProduct?.price || 0),
                        images: optimisticProduct?.images,
                    },
                });
            }
            commitCart(next);

            window.dispatchEvent(new CustomEvent('carvex:cart-item-added'));
        }

        try {
            const response = await cartService.addItem({ product_id: productId, quantity }, { timeout: 6000 });
            if (scopeAtStart !== getApiCacheScope()) {
                return false;
            }
            const added = response?.data?.data ? normalizeItem(response.data.data) : null;

            const previous = cartItemsRef.current;
            const next = [...previous];
                const matchIndex = next.findIndex((item) => {
                    const candidateProductId = toNumber(item?.product?.id || item?.product_id || 0);
                    return candidateProductId === toNumber(productId);
                });

                if (matchIndex >= 0) {
                    const current = next[matchIndex];
                    if (added) {
                        next[matchIndex] = {
                            ...current,
                            ...added,
                            product: added.product || current.product,
                            quantity: optimisticProduct
                                ? toNumber(current?.quantity || 0)
                                : toNumber(added?.quantity || current?.quantity || 0),
                        };
                    } else if (!optimisticProduct) {
                        next[matchIndex] = {
                            ...current,
                            quantity: toNumber(current?.quantity || 0) + amount,
                        };
                    }
                } else if (added) {
                    next.unshift(added);
                } else if (!optimisticProduct) {
                    next.unshift({
                        id: optimisticCartItemIdRef.current--,
                        product_id: toNumber(productId),
                        quantity: amount,
                        product: { id: toNumber(productId), name: 'Product', price: 0, images: [] },
                    });
                }
            commitCart(next);

            if (!optimisticProduct) {
                window.dispatchEvent(new CustomEvent('carvex:cart-item-added'));
            }

            syncCartInBackground();
            return true;
        } catch (error) {
            if (optimisticProduct && scopeAtStart === getApiCacheScope()) {
                const next = [...cartItemsRef.current];
                const matchIndex = next.findIndex((item) => toNumber(item?.product?.id || item?.product_id || 0) === toNumber(productId));
                if (matchIndex >= 0) {
                    const restoredQuantity = toNumber(next[matchIndex]?.quantity || 0) - amount;
                    if (restoredQuantity <= 0) {
                        next.splice(matchIndex, 1);
                    } else {
                        next[matchIndex] = { ...next[matchIndex], quantity: restoredQuantity };
                    }
                    commitCart(next);
                }
            }

            throw error;
        }
    };

    const updateItem = async (cartItemId, quantity) => {
        const scopeAtStart = getApiCacheScope();
        const itemIndex = cartItemsRef.current.findIndex((item) => toNumber(item?.id) === toNumber(cartItemId));
        const previousItem = itemIndex >= 0 ? cartItemsRef.current[itemIndex] : null;
        const version = beginItemMutation(cartItemId);
        const nextQuantity = Math.max(0, toNumber(quantity));
        const optimisticItems = [...cartItemsRef.current];
        if (itemIndex >= 0) {
            if (nextQuantity <= 0) {
                optimisticItems.splice(itemIndex, 1);
            } else {
                optimisticItems[itemIndex] = { ...previousItem, quantity: nextQuantity };
            }
            commitCart(optimisticItems);
        }

        try {
            if (nextQuantity <= 0) {
                await cartService.removeItem(cartItemId);
            } else {
                await cartService.updateItem(cartItemId, { quantity: nextQuantity });
            }
            if (scopeAtStart !== getApiCacheScope()) {
                return false;
            }
            syncCartInBackground();
            return true;
        } catch (error) {
            if (scopeAtStart === getApiCacheScope()) {
                rollbackItemMutation(cartItemId, previousItem, itemIndex, version);
            }
            throw error;
        }
    };

    const removeItem = async (cartItemId) => {
        const scopeAtStart = getApiCacheScope();
        const itemIndex = cartItemsRef.current.findIndex((item) => toNumber(item?.id) === toNumber(cartItemId));
        const previousItem = itemIndex >= 0 ? cartItemsRef.current[itemIndex] : null;
        const version = beginItemMutation(cartItemId);
        if (itemIndex >= 0) {
            const next = [...cartItemsRef.current];
            next.splice(itemIndex, 1);
            commitCart(next);
        }

        try {
            await cartService.removeItem(cartItemId);
            if (scopeAtStart !== getApiCacheScope()) {
                return false;
            }
            syncCartInBackground();
            return true;
        } catch (error) {
            if (scopeAtStart === getApiCacheScope()) {
                rollbackItemMutation(cartItemId, previousItem, itemIndex, version);
            }
            throw error;
        }
    };

    const clearCart = async () => {
        const scopeAtStart = getApiCacheScope();
        const snapshot = [...cartItemsRef.current];
        const revision = ++cartRevisionRef.current;
        commitCart([]);
        try {
            await cartService.clearCart();
            if (scopeAtStart !== getApiCacheScope()) {
                return false;
            }
            if (cartRevisionRef.current === revision) {
                commitCart([]);
            }
            syncCartInBackground();
            return true;
        } catch (error) {
            if (scopeAtStart !== getApiCacheScope()) {
                throw error;
            }
            const currentItems = cartItemsRef.current;
            const snapshotIds = new Set(snapshot.map((item) => String(item.id)));
            const snapshotProductIds = new Set(snapshot.map((item) => String(item.product?.id || item.product_id)));
            const restoredItems = [
                ...snapshot,
                ...currentItems.filter((item) => (
                    !snapshotIds.has(String(item.id))
                    && !snapshotProductIds.has(String(item.product?.id || item.product_id))
                )),
            ];
            if (cartRevisionRef.current === revision) {
                commitCart(snapshot);
            } else {
                commitCart(restoredItems);
                syncCartInBackground();
            }
            throw error;
        }
    };

    const cartCount = cartItems.reduce((total, item) => total + toNumber(item?.quantity || 0), 0);

    return (
        <CartContext.Provider
            value={{
                cartItems,
                cartSummary,
                cartCount,
                loading,
                addItem,
                updateItem,
                removeItem,
                clearCart,
                fetchCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
