import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import PageSkeleton from '../components/Skeleton';

export default function Cart() {
    const { cartItems, cartSummary, updateItem, removeItem, loading } = useCart();

    if (loading) {
        return <PageSkeleton variant="list" label="Loading your cart" />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
            <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                    <span className="inline-flex items-center rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-700 mb-3">
                        Checkout Preview
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-2">Shopping Cart</h1>
                    <p className="text-slate-600 text-sm sm:text-base">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in cart</p>
                </div>
            </div>

            {cartItems.length === 0 ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
                    <div className="text-center rounded-3xl border border-slate-200 bg-white p-10 sm:p-16 shadow-xl shadow-slate-900/5">
                        <ShoppingCart className="w-16 sm:w-24 h-16 sm:h-24 text-slate-300 mx-auto mb-4" />
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">Your cart is empty</h2>
                        <p className="text-slate-600 mb-6 sm:mb-8 max-w-md mx-auto">Start adding products to build your order. Your saved items will appear here.</p>
                        <Link
                            to="/products"
                            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 sm:px-8 py-3 sm:py-4 font-semibold text-white shadow-lg shadow-orange-500/25 transition-transform hover:-translate-y-0.5"
                        >
                            Shop Now
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 items-start">
                        {/* Cart Items */}
                        <div className="lg:col-span-2">
                            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                                {cartItems.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`p-4 sm:p-6 flex gap-4 sm:gap-6 ${
                                            index > 0 ? 'border-t border-slate-700' : ''
                                        }`}
                                    >
                                        {/* Product Image */}
                                        <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex-shrink-0 overflow-hidden border border-slate-200">
                                            {item.product?.images?.[0] && (
                                                <img
                                                    src={item.product.images[0]}
                                                    alt={item.product?.name}
                                                    className="w-full h-full object-contain p-2"
                                                />
                                            )}
                                        </div>

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-slate-900 font-semibold mb-1 sm:mb-2 line-clamp-2 text-sm sm:text-base">
                                                {item.product?.name}
                                            </h3>
                                            <p className="text-slate-500 text-xs sm:text-sm mb-3 sm:mb-4">
                                                ₱{(Number(item.product?.price) || 0).toFixed(2)} each
                                            </p>

                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <button
                                                    type="button"
                                                    aria-label={`Decrease quantity of ${item.product?.name || 'product'}`}
                                                    data-tooltip={`Decrease quantity of ${item.product?.name || 'product'}`}
                                                    onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                                                    className="rounded-xl border border-slate-200 p-1.5 sm:p-2.5 text-slate-600 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                                                >
                                                    <Minus className="w-3 sm:w-4 h-3 sm:h-4" />
                                                </button>
                                                <span className="w-8 sm:w-12 text-center text-slate-900 font-semibold text-sm sm:text-base">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    aria-label={`Increase quantity of ${item.product?.name || 'product'}`}
                                                    data-tooltip={`Increase quantity of ${item.product?.name || 'product'}`}
                                                    onClick={() => updateItem(item.id, item.quantity + 1)}
                                                    className="rounded-xl border border-slate-200 p-1.5 sm:p-2.5 text-slate-600 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                                                >
                                                    <Plus className="w-3 sm:w-4 h-3 sm:h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Price & Remove */}
                                        <div className="text-right flex flex-col justify-between">
                                            <p className="text-slate-900 font-bold text-lg sm:text-xl">
                                                ₱{((Number(item.product?.price) || 0) * item.quantity).toFixed(2)}
                                            </p>
                                            <button
                                                type="button"
                                                aria-label={`Remove ${item.product?.name || 'product'} from cart`}
                                                data-tooltip={`Remove ${item.product?.name || 'product'} from cart`}
                                                onClick={() => removeItem(item.id)}
                                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-red-500 transition-colors hover:border-red-200 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 sm:w-5 h-4 sm:h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl shadow-slate-900/5">
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-6">Order Summary</h2>

                                <div className="space-y-3 sm:space-y-4 mb-6 pb-6 border-b border-slate-200">
                                    <div className="flex justify-between text-slate-600 text-sm sm:text-base">
                                        <span>Subtotal</span>
                                        <span>₱{cartSummary?.subtotal?.toFixed(2)}</span>
                                    </div>
                                    
                                    <div className="flex justify-between text-slate-600 text-sm sm:text-base">
                                        <span>Shipping</span>
                                        <span className={(cartSummary?.shipping || 0) === 0 ? 'text-emerald-600 font-medium' : ''}>
                                            {(cartSummary?.shipping || 0) === 0 ? 'FREE' : `₱${cartSummary?.shipping?.toFixed(2)}`}
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between text-slate-600 text-sm sm:text-base">
                                        <span>Tax</span>
                                        <span>₱{cartSummary?.tax?.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between mb-6">
                                    <span className="text-slate-900 font-semibold">Total</span>
                                    <span className="text-orange-600 font-bold text-xl sm:text-2xl">
                                        ₱{cartSummary?.total?.toFixed(2)}
                                    </span>
                                </div>

                                <Link
                                    to="/checkout"
                                    className="mb-2 sm:mb-3 block w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 sm:px-6 py-2.5 sm:py-3 text-center text-sm sm:text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition-transform hover:-translate-y-0.5"
                                >
                                    Proceed to Checkout
                                </Link>

                                <Link
                                    to="/products"
                                    className="block w-full rounded-xl border border-slate-200 px-4 sm:px-6 py-2.5 sm:py-3 text-center text-sm sm:text-base font-semibold text-slate-700 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                                >
                                    Continue Shopping
                                </Link>

                                {(cartSummary?.subtotal || 0) > 100 && (
                                    <div className="mt-4 sm:mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
                                        <p className="text-emerald-700 text-xs sm:text-sm font-medium">
                                            ✓ Free shipping on orders over ₱100!
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
