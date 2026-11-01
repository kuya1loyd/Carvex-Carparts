import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Search,
    ShoppingCart,
    ShieldCheck,
    Truck,
    Settings,
    Headphones,
    Check,
} from 'lucide-react';
import { useCart } from '../context/CartContext';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const POPULAR_SEARCHES = [
    'Brake Pad',
    'Oil Filter',
    'Air Filter',
    'Shock Absorber',
    'Alternator',
];

const FEATURED_PRODUCTS = [
    {
        id: 1,
        name: 'Brake Rotor',
        category: 'Brake System',
        price: 825.00,
        image: '/images/Brake Rotor (Disc).jpg',
        badge: 'Best Seller',
    },
    {
        id: 2,
        name: 'Oil Filter',
        category: 'Engine Parts',
        price: 179.00,
        image: '/images/oil filter.jpg',
    },
    {
        id: 3,
        name: 'Car Battery',
        category: 'Electrical',
        price: 1950.00,
        image: '/images/Car Battery.jpg',
    },
    {
        id: 4,
        name: 'Shock Absorber',
        category: 'Suspension',
        price: 2350.00,
        image: '/images/Shock Absorber.jpg',
    },
    {
        id: 5,
        name: 'Air Filter',
        category: 'Air Intake',
        price: 299.00,
        image: '/images/Air Filter.jpg',
    },
    {
        id: 6,
        name: 'Side Mirror',
        category: 'Body Parts',
        price: 850.00,
        image: '/images/Door Lock Protector.jpg',
    },
    {
        id: 7,
        name: 'Timing Belt Kit',
        category: 'Timing System',
        price: 1250.00,
        image: '/images/Serpentine Belt.jpg',
    },
    {
        id: 8,
        name: 'Brake Pad',
        category: 'Brake System',
        price: 720.00,
        image: '/images/Brake pads.jpg',
    },
];

export default function Landing() {
    const navigate = useNavigate();
    const cart = useCart();
    const [search, setSearch] = useState('');
    const [addedIds, setAddedIds] = useState([]);

    const handleSearch = (event) => {
        event.preventDefault();
        const term = search.trim();
        navigate(term ? `/products?search=${encodeURIComponent(term)}` : '/products');
    };

    const handleTagClick = (tag) => {
        navigate(`/products?search=${encodeURIComponent(tag)}`);
    };

    const handleAddToCart = async (product, e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            if (typeof cart?.addItem === 'function') {
                await cart.addItem(product, 1);
            }
            setAddedIds((prev) => [...prev, product.id]);
            setTimeout(() => {
                setAddedIds((prev) => prev.filter((id) => id !== product.id));
            }, 1800);
        } catch {
            navigate(`/products`);
        }
    };

    return (
        <div className="landing-v3-root">
            {/* HERO SECTION */}
            <section className="landing-v3-hero">
                <div className="landing-v3-hero__container">
                    <div className="landing-v3-hero__content">
                        <span className="landing-v3-hero__eyebrow">AUTO PARTS. HELPFUL SUPPORT.</span>
                        <h1 className="landing-v3-hero__title">
                            Find the right part.<br />
                            Keep <span className="landing-v3-hero__title--highlight">moving.</span>
                        </h1>
                        <p className="landing-v3-hero__subtitle">
                            Search by part name or browse by vehicle system.
                            Trusted parts for your ride, all in one place.
                        </p>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="landing-v3-search-bar" role="search">
                            <Search size={18} className="landing-v3-search-icon" aria-hidden="true" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search for parts (e.g. brake pad, alternator...)"
                                aria-label="Search parts"
                            />
                            <button type="submit" className="landing-v3-search-btn">
                                <span>Search</span>
                                <ArrowRight size={15} />
                            </button>
                        </form>

                        {/* Popular Tags */}
                        <div className="landing-v3-popular">
                            <span className="landing-v3-popular__label">Popular:</span>
                            <div className="landing-v3-popular__tags">
                                {POPULAR_SEARCHES.map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => handleTagClick(tag)}
                                        className="landing-v3-popular__tag"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Hero Image - Uses landing page.jpg uploaded by the user */}
                    <div className="landing-v3-hero__visual">
                        <img
                            src="/images/landing page.jpg"
                            alt="CarVex Performance Car"
                            className="landing-v3-hero__car-img"
                        />
                    </div>
                </div>
            </section>

            {/* FEATURED PARTS SECTION */}
            <section className="landing-v3-featured">
                <div className="landing-v3-featured__container">
                    <header className="landing-v3-featured__header">
                        <div>
                            <div className="landing-v3-featured__accent-bar" aria-hidden="true" />
                            <h2 className="landing-v3-featured__title">Featured Parts</h2>
                            <p className="landing-v3-featured__subtitle">Top quality car parts, handpicked for you.</p>
                        </div>
                        <Link to="/products" className="landing-v3-featured__browse-btn">
                            <span>Browse All Parts</span>
                            <ArrowRight size={15} />
                        </Link>
                    </header>

                    {/* 8 Product Cards Grid */}
                    <div className="landing-v3-grid">
                        {FEATURED_PRODUCTS.map((product) => {
                            const isAdded = addedIds.includes(product.id);
                            return (
                                <article key={product.id} className="landing-v3-card">
                                    {product.badge && (
                                        <span className="landing-v3-card__badge">{product.badge}</span>
                                    )}

                                    <div className="landing-v3-card__image-wrap">
                                        <img src={product.image} alt={product.name} loading="lazy" />
                                    </div>

                                    <div className="landing-v3-card__body">
                                        <span className="landing-v3-card__category">{product.category}</span>
                                        <h3 className="landing-v3-card__title">
                                            <Link to="/products">{product.name}</Link>
                                        </h3>
                                        <div className="landing-v3-card__footer">
                                            <strong className="landing-v3-card__price">
                                                {currencyFormatter.format(product.price)}
                                            </strong>
                                            <button
                                                type="button"
                                                onClick={(e) => handleAddToCart(product, e)}
                                                className={`landing-v3-card__cart-btn${isAdded ? ' is-added' : ''}`}
                                                aria-label={`Add ${product.name} to cart`}
                                                title="Add to cart"
                                            >
                                                {isAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 4 TRUST BADGES */}
            <section className="landing-v3-trust">
                <div className="landing-v3-trust__container">
                    <div className="landing-v3-trust__item">
                        <div className="landing-v3-trust__icon-wrap">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <strong>Trusted Quality</strong>
                            <small>Genuine &amp; Reliable Parts</small>
                        </div>
                    </div>

                    <div className="landing-v3-trust__item">
                        <div className="landing-v3-trust__icon-wrap">
                            <Truck size={22} />
                        </div>
                        <div>
                            <strong>Fast Support</strong>
                            <small>Get help when you need it</small>
                        </div>
                    </div>

                    <div className="landing-v3-trust__item">
                        <div className="landing-v3-trust__icon-wrap">
                            <Settings size={22} />
                        </div>
                        <div>
                            <strong>Easy Management</strong>
                            <small>Track your orders</small>
                        </div>
                    </div>

                    <div className="landing-v3-trust__item">
                        <div className="landing-v3-trust__icon-wrap">
                            <Headphones size={22} />
                        </div>
                        <div>
                            <strong>Dedicated Support</strong>
                            <small>We're here to help</small>
                        </div>
                    </div>
                </div>
            </section>

            {/* CALL TO ACTION DARK BANNER - Visual contains ONLY wheel (no duplicate text) */}
            <section className="landing-v3-cta">
                <div className="landing-v3-cta__container">
                    <div className="landing-v3-cta__content">
                        <span className="landing-v3-cta__eyebrow">Let's keep you on the road</span>
                        <h2 className="landing-v3-cta__title">
                            Get the best parts<br />
                            for your car today.
                        </h2>
                        <Link to="/products" className="landing-v3-cta__btn">
                            <span>Browse Parts</span>
                            <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="landing-v3-cta__visual" aria-hidden="true">
                        <img src="/images/landing-cta-wheel.png" alt="Car wheel" />
                    </div>
                </div>
            </section>
        </div>
    );
}
