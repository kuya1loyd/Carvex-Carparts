import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, PackageOpen, Users } from 'lucide-react';
import productService from '../services/productService';
import { FALLBACK_PRODUCT_IMAGE, resolveProductImage } from '../utils/productImage';

export default function Home() {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeaturedProducts = async () => {
            try {
                const res = await productService.getAll();
                setFeaturedProducts((res.data?.data?.data || []).slice(0, 4));
            } catch (err) {
                console.error('Failed to fetch products:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchFeaturedProducts();
    }, []);

    return (
<div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-12">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10" />
                
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-500" />
                </div>
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
<h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight animate-fade-in reveal reveal-up" data-reveal>
                        Upgrade Your Ride
                    </h1>
<p className="text-lg sm:text-xl text-slate-300 mb-8 sm:mb-12 max-w-2xl mx-auto animate-fade-in delay-200 reveal reveal-fade" data-reveal>
                        Premium auto parts and accessories for every vehicle. Choose quality, choose performance, choose CarVex.
                    </p>
                    
<div className="flex gap-3 sm:gap-4 justify-center flex-wrap animate-fade-in delay-400 reveal reveal-zoom" data-reveal>
                        <Link
                            to="/products"
                            className="px-6 sm:px-8 py-3 sm:py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/50"
                        >
                            Shop Now
                        </Link>
                        <button className="px-6 sm:px-8 py-3 sm:py-4 border-2 border-orange-500 text-orange-500 hover:bg-orange-500/10 font-semibold rounded-lg transition-all hover:scale-105">
                            Learn More
                        </button>
                    </div>
                </div>

                {/* Car Image Placeholder */}
                <div className="absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 opacity-20">
                    <div className="w-full h-full bg-gradient-to-t from-orange-500/50 to-transparent rounded-full blur-3xl" />
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 sm:py-20 px-4 sm:px-6">
<div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 sm:gap-12 reveal reveal-up" data-reveal>
                    <div className="text-center">
                        <PackageOpen className="w-12 sm:w-16 h-12 sm:h-16 text-orange-500 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2">10K+</h3>
                        <p className="text-slate-400 text-sm sm:text-base">Premium Parts</p>
                    </div>
                    
                    <div className="text-center">
                        <Users className="w-12 sm:w-16 h-12 sm:h-16 text-orange-500 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2">50K+</h3>
                        <p className="text-slate-400 text-sm sm:text-base">Happy Customers</p>
                    </div>
                    
                    <div className="text-center">
                        <div className="flex justify-center mb-3 sm:mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-5 sm:w-6 h-5 sm:h-6 text-amber-400 fill-amber-400" />
                            ))}
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2">4.9</h3>
                        <p className="text-slate-400 text-sm sm:text-base">Average Rating</p>
                    </div>
                </div>
            </section>

            {/* Featured Products */}
            <section className="py-12 sm:py-20 px-4 sm:px-6 bg-slate-900/50">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8 sm:mb-12">Featured Products</h2>
                    
                    {loading ? (
                        <div className="grid md:grid-cols-4 gap-4 sm:gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-slate-800 rounded-lg h-64 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {featuredProducts.map((product) => (
                                <Link
                                    key={product.id}
                                    to={`/products/${product.id}`}
                                    className="bg-slate-800 rounded-lg overflow-hidden hover:shadow-lg hover:shadow-orange-500/20 transition-shadow group"
                                >
                                    <div className="aspect-square bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center group-hover:from-slate-600 group-hover:to-slate-500 transition-colors">
                                        <img
                                            src={resolveProductImage(product.images)}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                            onError={(event) => {
                                                event.currentTarget.onerror = null;
                                                event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                                            }}
                                        />
                                    </div>
                                    <div className="p-3 sm:p-4">
                                        <h3 className="text-white font-semibold line-clamp-2 group-hover:text-orange-400 transition-colors text-sm sm:text-base">
                                            {product.name}
                                        </h3>
                                        <p className="text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3">
                                            {product.category || 'Auto Parts'}
                                        </p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-orange-500 font-bold text-base sm:text-lg">
                                                ₱{(Number(product.price) || 0).toFixed(2)}
                                            </span>
                                            <button className="px-2 sm:px-4 py-1 sm:py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-xs sm:text-sm font-medium">
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 sm:py-20 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg p-8 sm:p-12 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">Ready to Upgrade?</h2>
                    <p className="text-lg sm:text-xl text-white/90 mb-6 sm:mb-8">
                        Browse our complete catalog of premium auto parts and find exactly what you need.
                    </p>
                    <Link
                        to="/products"
                        className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-white text-orange-600 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        Start Shopping
                    </Link>
                </div>
            </section>
        </div>
    );
}
