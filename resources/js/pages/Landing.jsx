import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    ArrowUpRight,
    Disc3,
    Gauge,
    Mail,
    MapPin,
    Phone,
    Search,
    Settings2,
    Wrench,
    Zap,
} from 'lucide-react';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import { FALLBACK_PRODUCT_IMAGE, resolveProductImage } from '../utils/productImage';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const fallbackCategories = [
    { name: 'Brake systems', search: 'brake', note: 'Pads, rotors & more', Icon: Disc3 },
    { name: 'Engine care', search: 'air filter', note: 'Filters, belts & fluids', Icon: Settings2 },
    { name: 'Suspension', search: 'shock absorber', note: 'Ride and handling parts', Icon: Gauge },
    { name: 'Electrical', search: 'alternator', note: 'Power and starting parts', Icon: Zap },
    { name: 'Workshop essentials', search: 'wiper blade', note: 'Everyday maintenance', Icon: Wrench },
];

const heroSlides = [
    { src: '/images/Brake%20Rotor%20(Disc).jpg', alt: 'Automotive brake rotor' },
    { src: '/images/Brake%20pads.jpg', alt: 'Automotive brake pads' },
    { src: '/images/Air%20Filter.jpg', alt: 'Automotive air filter' },
    { src: '/images/Alternator.jpg', alt: 'Automotive alternator' },
    { src: '/images/Shock%20Absorber.jpg', alt: 'Automotive shock absorber' },
    { src: '/images/Car%20Battery.jpg', alt: 'Automotive car battery' },
];

const getRecords = (response, collectionName) => {
    const candidates = [
        response?.data?.data?.data,
        response?.data?.data?.[collectionName],
        response?.data?.[collectionName],
        response?.data?.data,
        response?.data,
        response,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }

        if (candidate && typeof candidate === 'object') {
            const nestedArray = Object.values(candidate).find(Array.isArray);
            if (nestedArray) {
                return nestedArray;
            }
        }
    }

    return [];
};

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const normalizeProduct = (item) => ({
    id: item?.id,
    name: String(item?.name || '').trim(),
    brand: String(item?.brand || item?.manufacturer || '').trim(),
    price: toNumberOrNull(item?.price ?? item?.selling_price ?? item?.amount),
    stock: toNumberOrNull(item?.stock ?? item?.quantity ?? item?.inventory),
    images: item?.images ?? item?.image_url ?? item?.image ?? null,
});

const normalizeCategory = (item) => ({
    id: item?.id,
    name: String(item?.name || '').trim(),
});

function ProductPhoto({ product }) {
    const [failed, setFailed] = useState(false);
    const image = resolveProductImage(product.images);
    const hasImage = image !== FALLBACK_PRODUCT_IMAGE;

    if (!hasImage || failed) {
        return (
            <div className="landing-product-photo-placeholder" aria-label={`No photo available for ${product.name}`}>
                <span>Photo unavailable</span>
            </div>
        );
    }

    return (
        <img
            src={image}
            alt={product.name}
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
}

function ProductSkeleton() {
    return (
        <div className="landing-product-skeleton" aria-hidden="true">
            {[0, 1, 2].map((item) => (
                <article className="landing-product-skeleton-card" key={item}>
                    <div className="skeleton-photo" />
                    <div className="skeleton-line skeleton-line--short" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line skeleton-line--price" />
                </article>
            ))}
        </div>
    );
}

export default function Landing() {
    const location = useLocation();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [productsError, setProductsError] = useState(false);
    const [categoriesError, setCategoriesError] = useState(false);
    const [activeHeroSlide, setActiveHeroSlide] = useState(0);
    const [carouselImagesReady, setCarouselImagesReady] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => (
        typeof window !== 'undefined'
        && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    ));

    const loadProducts = useCallback(async () => {
        setProductsLoading(true);
        setProductsError(false);

        try {
            const response = await productService.getAll({
                per_page: 6,
                sort_by: 'created_at',
                sort_order: 'desc',
            });
            const records = getRecords(response, 'products')
                .filter((item) => item && typeof item === 'object')
                .map(normalizeProduct)
                .filter((item) => item.id !== null && item.id !== undefined && item.name);
            setProducts(records);
        } catch (error) {
            setProducts([]);
            setProductsError(true);
        } finally {
            setProductsLoading(false);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        setCategoriesLoading(true);
        setCategoriesError(false);

        try {
            const response = await categoryService.getAll();
            const records = getRecords(response, 'categories')
                .filter((item) => item && typeof item === 'object')
                .map(normalizeCategory)
                .filter((item) => item.id !== null && item.id !== undefined && item.name);
            setCategories(records);
        } catch (error) {
            setCategories([]);
            setCategoriesError(true);
        } finally {
            setCategoriesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, [loadProducts, loadCategories]);

    useEffect(() => {
        let isMounted = true;
        const imageLoads = heroSlides.map(({ src }) => {
            const image = new window.Image();
            image.decoding = 'async';
            image.src = src;
            if (image.decode) {
                return image.decode().catch(() => undefined);
            }

            return new Promise((resolve) => {
                image.onload = resolve;
                image.onerror = resolve;
            });
        });

        Promise.all(imageLoads).then(() => {
            if (isMounted) {
                setCarouselImagesReady(true);
            }
        });

        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        if (!motionPreference) {
            return undefined;
        }

        const updateMotionPreference = () => setPrefersReducedMotion(motionPreference.matches);
        updateMotionPreference();

        if (motionPreference.addEventListener) {
            motionPreference.addEventListener('change', updateMotionPreference);
            return () => motionPreference.removeEventListener('change', updateMotionPreference);
        }

        motionPreference.addListener(updateMotionPreference);
        return () => motionPreference.removeListener(updateMotionPreference);
    }, []);

    useEffect(() => {
        if (prefersReducedMotion || !carouselImagesReady) {
            return undefined;
        }

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
            }
        }, 6000);

        return () => window.clearInterval(interval);
    }, [carouselImagesReady, prefersReducedMotion]);

    useEffect(() => {
        if (!location.hash) {
            return undefined;
        }

        const targetId = location.hash.slice(1);
        const timer = window.setTimeout(() => {
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);

        return () => window.clearTimeout(timer);
    }, [location.hash]);

    const submitSearch = (event) => {
        event.preventDefault();
        const query = search.trim();
        if (query) {
            navigate(`/products?search=${encodeURIComponent(query)}`);
        }
    };

    const visibleCategories = categories.length > 0 ? categories.slice(0, 5) : fallbackCategories;

    return (
        <div className="landing-page" id="landing-top">
            <section className="landing-hero" aria-labelledby="landing-hero-title">
                <div className="landing-hero-inner">
                    <div className="landing-hero-copy landing-enter">
                        <p className="landing-eyebrow"><span /> Parts for the road ahead</p>
                        <h1 id="landing-hero-title">Find the right part.<br /><em>Keep moving.</em></h1>
                        <p className="landing-hero-description">
                            Search by part name or browse by vehicle system. Need a hand with fit? Our team can help you narrow it down.
                        </p>

                        <form className="landing-search" role="search" onSubmit={submitSearch}>
                            <label className="sr-only" htmlFor="landing-part-search">Search auto parts</label>
                            <Search size={20} aria-hidden="true" />
                            <input
                                id="landing-part-search"
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Try “brake pads” or “air filter”"
                                autoComplete="off"
                            />
                            <button type="submit" aria-label="Search parts">
                                Search <ArrowRight size={17} aria-hidden="true" />
                            </button>
                        </form>

                        <div className="landing-hero-links">
                            <Link to="/#landing-categories">Browse by system <ArrowDownRightFallback /></Link>
                            <span>Looking for a specific fit?</span>
                        </div>
                    </div>

                    <div className="landing-hero-visual landing-enter landing-enter--delayed">
                        <div className="landing-visual-index" aria-hidden="true">CV / PARTS</div>
                        <div className="landing-hero-photo-frame">
                            <div
                                className="landing-carousel"
                                role="region"
                                aria-roledescription="carousel"
                                aria-label="Car parts photos"
                            >
                                <div
                                    className="landing-carousel-track"
                                    aria-live="off"
                                    style={{
                                        width: `${heroSlides.length * 100}%`,
                                        transform: `translateX(-${activeHeroSlide * (100 / heroSlides.length)}%)`,
                                    }}
                                >
                                    {heroSlides.map((slide, index) => (
                                        <figure
                                            className="landing-carousel-slide"
                                            key={slide.src}
                                            aria-hidden={index !== activeHeroSlide}
                                            aria-label={`${index + 1} of ${heroSlides.length}`}
                                            style={{ flexBasis: `${100 / heroSlides.length}%` }}
                                        >
                                            <img
                                                src={slide.src}
                                                alt={slide.alt}
                                                loading="eager"
                                                decoding="async"
                                            />
                                        </figure>
                                    ))}
                                </div>

                                <div className="landing-carousel-controls">
                                    <div className="landing-carousel-indicators" role="group" aria-label="Choose a car parts photo">
                                        {heroSlides.map((slide, index) => (
                                            <button
                                                className={`landing-carousel-indicator ${index === activeHeroSlide ? 'is-active' : ''}`}
                                                type="button"
                                                key={slide.src}
                                                aria-label={`Show photo ${index + 1}: ${slide.alt}`}
                                                aria-pressed={index === activeHeroSlide}
                                                onClick={() => setActiveHeroSlide(index)}
                                            />
                                        ))}
                                    </div>
                                    <span className="landing-carousel-count" aria-hidden="true">
                                        {String(activeHeroSlide + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="landing-visual-stamp" aria-hidden="true"><span>CAR</span><span>VEX</span></div>
                        <p className="landing-visual-note">Shop with a little more clarity.</p>
                    </div>
                </div>
                <div className="landing-hero-baseline" aria-hidden="true"><span>CARVEX / AUTO PARTS</span><span>01 — FIND YOUR PART</span></div>
            </section>

            <section className="landing-categories" id="landing-categories" aria-labelledby="landing-categories-title">
                <div className="landing-section-heading">
                    <div>
                        <p className="landing-section-kicker">A good place to start</p>
                        <h2 id="landing-categories-title">Shop by system</h2>
                        <p className="landing-section-description">Choose a category and search the catalog for parts that match.</p>
                    </div>
                    <Link className="landing-text-link" to="/products">View all parts <ArrowRight size={17} aria-hidden="true" /></Link>
                </div>

                {categoriesLoading ? (
                    <div className="landing-category-loading" aria-label="Loading categories">
                        {[0, 1, 2, 3, 4].map((item) => <span key={item} />)}
                    </div>
                ) : (
                    <div className="landing-category-grid">
                        {visibleCategories.map((category, index) => {
                            const fallback = category.search;
                            const query = fallback || category.name;
                            const Icon = category.Icon || [Disc3, Settings2, Gauge, Zap, Wrench][index % 5];
                            const note = category.note || 'Browse matching parts';

                            return (
                                <Link
                                    className="landing-category-tile"
                                    key={category.id || category.name}
                                    to={`/products?search=${encodeURIComponent(query)}`}
                                >
                                    <span className="category-tile-top"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /><ArrowUpRight size={17} aria-hidden="true" /></span>
                                    <strong>{category.name}</strong>
                                    <small>{note}</small>
                                </Link>
                            );
                        })}
                    </div>
                )}
                {!categoriesLoading && categoriesError && (
                    <div className="landing-category-note" role="status">
                        <span>Showing quick searches while categories are unavailable.</span>
                        <button type="button" onClick={loadCategories}>Retry categories</button>
                    </div>
                )}
            </section>

            <section className="landing-featured" id="landing-deals" aria-labelledby="landing-featured-title">
                <div className="landing-featured-topline"><span>CARVEX CATALOG</span><span>02 — EXPLORE PARTS</span></div>
                <div className="landing-section-heading landing-featured-heading">
                    <div>
                        <p className="landing-section-kicker">From the catalog</p>
                        <h2 id="landing-featured-title">Featured parts</h2>
                        <p className="landing-section-description">Product information shown here comes from the current catalog.</p>
                    </div>
                    <Link className="landing-text-link" to="/products">Browse full catalog <ArrowRight size={17} aria-hidden="true" /></Link>
                </div>

                {productsLoading ? (
                    <ProductSkeleton />
                ) : productsError ? (
                    <div className="landing-product-state landing-product-state--error" role="alert">
                        <span className="state-symbol"><Search size={21} aria-hidden="true" /></span>
                        <h3>We couldn’t load the catalog.</h3>
                        <p>Check your connection and try again. You can still browse all parts.</p>
                        <div className="state-actions">
                            <button type="button" className="landing-button landing-button--dark" onClick={loadProducts}>Try again</button>
                            <Link className="landing-text-link" to="/products">Open catalog <ArrowRight size={17} aria-hidden="true" /></Link>
                        </div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="landing-product-state" role="status">
                        <span className="state-symbol"><Wrench size={21} aria-hidden="true" /></span>
                        <h3>No parts to feature yet.</h3>
                        <p>There are no products in the catalog right now. Please check again later.</p>
                        <Link className="landing-button landing-button--dark" to="/products">Browse catalog</Link>
                    </div>
                ) : (
                    <div className="landing-product-grid">
                        {products.map((product, index) => (
                            <article className="landing-product-card" key={product.id} style={{ '--card-index': index }}>
                                <Link className="landing-product-image" to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
                                    <ProductPhoto product={product} />
                                    <span className="product-open-icon" aria-hidden="true"><ArrowUpRight size={18} /></span>
                                </Link>
                                <div className="landing-product-details">
                                    {product.brand && <span className="landing-product-brand">{product.brand}</span>}
                                    <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
                                    <div className="landing-product-facts">
                                        <strong>{product.price === null ? 'Price unavailable' : currencyFormatter.format(product.price)}</strong>
                                        {product.stock === null ? (
                                            <span className="product-stock product-stock--unknown">Stock details unavailable</span>
                                        ) : (
                                            <span className={`product-stock ${product.stock > 0 ? 'product-stock--available' : 'product-stock--empty'}`}>
                                                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                            </span>
                                        )}
                                    </div>
                                    <Link className="landing-product-link" to={`/products/${product.id}`}>View product <ArrowRight size={15} aria-hidden="true" /></Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="landing-contact" id="landing-contact" aria-labelledby="landing-contact-title">
                <div className="landing-contact-copy">
                    <p className="landing-section-kicker">Need a second opinion?</p>
                    <h2 id="landing-contact-title">Let’s find the right fit.</h2>
                    <p>Tell us what you drive and which part you’re looking for. We’ll help point you in the right direction.</p>
                </div>
                <div className="landing-contact-actions">
                    <a href="mailto:support@carvex.ph"><Mail size={18} aria-hidden="true" /><span><small>Email support</small><strong>support@carvex.ph</strong></span><ArrowUpRight size={17} aria-hidden="true" /></a>
                    <a href="tel:+639395158432"><Phone size={18} aria-hidden="true" /><span><small>Call the team</small><strong>+63 939 515 8432</strong></span><ArrowUpRight size={17} aria-hidden="true" /></a>
                    <div className="landing-contact-location"><MapPin size={18} aria-hidden="true" /><span><small>Based in</small><strong>Butuan City, Agusan del Norte</strong></span></div>
                </div>
            </section>
        </div>
    );
}

function ArrowDownRightFallback() {
    return <ArrowRight className="landing-diagonal-arrow" size={16} aria-hidden="true" />;
}
