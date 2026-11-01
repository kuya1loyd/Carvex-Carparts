import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    ArrowUpRight,
    CheckCircle2,
    ChevronDown,
    Clock,
    HelpCircle,
    Mail,
    MapPin,
    MessageCircle,
    PackageCheck,
    Phone,
    ShieldCheck,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const supportEmail = 'support@carvex.ph';
const supportPhone = '+639395158432';

const checklistItems = [
    {
        step: '01',
        title: 'Order number, if you have one',
        detail: 'Helps us pull up your invoice, shipment status, and seller details right away.',
    },
    {
        step: '02',
        title: 'Part name or product link',
        detail: 'Share the SKU or catalog item so we can verify stock and specifications.',
    },
    {
        step: '03',
        title: 'Your vehicle’s year, make, and model',
        detail: 'Include engine size or trim if you want our team to double-check fitment.',
    },
];

const faqItems = [
    {
        id: 'fitment-check',
        category: 'fitment',
        question: 'How do I confirm if a part fits my vehicle before ordering?',
        answer: 'Check the Vehicle Compatibility field on any product page, or send us your vehicle’s year, make, model, and engine variant via the Support Inbox or email. Our Butuan team will verify OEM cross-compatibility for you.',
    },
    {
        id: 'order-tracking',
        category: 'orders',
        question: 'Where can I track my order status and delivery updates?',
        answer: 'Sign in to your CarVex account and open Dashboard → Orders to view real-time status updates, seller dispatch notes, and itemized order details.',
    },
    {
        id: 'wrong-part-return',
        category: 'returns',
        question: 'What if I ordered the wrong part or need an exchange?',
        answer: 'Unused parts in their original packaging can be requested for return or exchange through your Account Support Inbox. Include your order number and photos of the unopened item so we can assist immediately.',
    },
    {
        id: 'seller-questions',
        category: 'orders',
        question: 'Can I message a marketplace seller directly about a listing?',
        answer: 'Yes. Logged-in customers can message sellers directly from the product page or manage conversations under Dashboard → Messages.',
    },
    {
        id: 'warranty-coverage',
        category: 'returns',
        question: 'Do replacement parts come with a manufacturer or store warranty?',
        answer: 'Genuine and OEM-grade components carry manufacturer warranty coverage against factory defects. Reach out through your Support Inbox with your order reference if an issue comes up.',
    },
];

const faqCategories = [
    { key: 'all', label: 'All questions' },
    { key: 'fitment', label: 'Part fitment' },
    { key: 'orders', label: 'Orders & shipping' },
    { key: 'returns', label: 'Returns & warranty' },
];

export default function CustomerService() {
    const { isAuthenticated, isAdmin } = useAuth();
    const inboxPath = isAdmin ? '/admin/customer-service' : '/dashboard/support';
    const inboxLabel = isAdmin ? 'Open admin inbox' : 'Open support inbox';

    const heroRef = useRef(null);
    const [activeFaqCategory, setActiveFaqCategory] = useState('all');
    const [openFaqId, setOpenFaqId] = useState('fitment-check');

    const handleHeroPointerMove = (event) => {
        if (!heroRef.current) return;
        const rect = heroRef.current.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        heroRef.current.style.setProperty('--support-glow-x', `${x.toFixed(1)}%`);
        heroRef.current.style.setProperty('--support-glow-y', `${y.toFixed(1)}%`);
    };

    const handleCardPointerMove = (event) => {
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--card-mouse-x', `${(event.clientX - rect.left).toFixed(0)}px`);
        card.style.setProperty('--card-mouse-y', `${(event.clientY - rect.top).toFixed(0)}px`);
    };

    const filteredFaqs = activeFaqCategory === 'all'
        ? faqItems
        : faqItems.filter((item) => item.category === activeFaqCategory);

    return (
        <div className="customer-service-page support-v2-page">
            <section
                className="support-v2-hero-banner"
                aria-labelledby="support-v2-title"
                ref={heroRef}
                onPointerMove={handleHeroPointerMove}
            >
                <div className="support-v2-ambient" aria-hidden="true">
                    <span className="support-orb support-orb--orange" />
                    <span className="support-orb support-orb--blue" />
                </div>

                <div className="support-v2-shell">
                    <div className="support-v2-hero">
                        <div className="support-v2-hero__copy">
                            <p className="support-v2-eyebrow">
                                <span className="support-eyebrow-dot" aria-hidden="true" />
                                CARVEX CUSTOMER CARE
                            </p>
                            <h1 id="support-v2-title">
                                Let’s get you <br />
                                <em className="support-title-accent">back on the road.</em>
                            </h1>
                            <p>
                                Talk to our local team about an order, a part, or your CarVex account. Choose the contact method that works for you.
                            </p>

                            <div className="support-v2-metrics" aria-label="Support service highlights">
                                <div className="support-metric-pill">
                                    <Clock size={15} aria-hidden="true" />
                                    <span><strong>Fast replies</strong> <small>Mon–Sat, 8 AM – 6 PM</small></span>
                                </div>
                                <div className="support-metric-pill">
                                    <Wrench size={15} aria-hidden="true" />
                                    <span><strong>Fitment help</strong> <small>Year, make &amp; model check</small></span>
                                </div>
                                <div className="support-metric-pill">
                                    <ShieldCheck size={15} aria-hidden="true" />
                                    <span><strong>Order protection</strong> <small>Tracked support threads</small></span>
                                </div>
                            </div>

                            <div className="support-v2-hero__actions">
                                <Link to={isAuthenticated ? inboxPath : '/login'} className="support-v2-button support-v2-button--primary">
                                    {isAuthenticated ? inboxLabel : 'Sign in for order help'}
                                    <ArrowRight size={17} aria-hidden="true" />
                                </Link>
                                <a href={`mailto:${supportEmail}`} className="support-v2-button support-v2-button--quiet">
                                    Email support <ArrowUpRight size={16} aria-hidden="true" />
                                </a>
                                <a href="#support-faq" className="support-v2-button support-v2-button--ghost">
                                    Common questions <ChevronDown size={16} aria-hidden="true" />
                                </a>
                            </div>
                        </div>

                        <aside className="support-v2-guide" aria-label="What to include in a support request">
                            <div className="support-v2-guide__top">
                                <span className="support-v2-guide__icon"><PackageCheck size={21} aria-hidden="true" /></span>
                                <span className="support-v2-guide__badge">
                                    <Sparkles size={12} aria-hidden="true" /> Fast-track checklist
                                </span>
                            </div>
                            <p className="support-v2-guide__eyebrow">A little detail goes a long way</p>
                            <h2>Help us help you faster.</h2>
                            <ul className="support-v2-checklist">
                                {checklistItems.map((item) => (
                                    <li key={item.step}>
                                        <span className="checklist-step" aria-hidden="true">{item.step}</span>
                                        <div className="checklist-copy">
                                            <strong>{item.title}</strong>
                                            <small>{item.detail}</small>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <p className="support-v2-location">
                                <MapPin size={15} aria-hidden="true" />
                                <span>Butuan City, Agusan del Norte</span>
                                <span className="location-live-dot" aria-hidden="true" />
                            </p>
                        </aside>
                    </div>

                    <div className="support-v2-hero-baseline" aria-hidden="true">
                        <span>CARVEX / CUSTOMER CARE DESK</span>
                        <span>01 — DIRECT ASSISTANCE</span>
                    </div>
                </div>
            </section>

            <div className="support-v2-shell support-v2-body">
                <section className="support-v2-options" aria-labelledby="support-v2-options-title">
                    <div className="support-v2-topline" aria-hidden="true">
                        <span>SUPPORT CHANNELS</span>
                        <span>02 — CHOOSE YOUR PATH</span>
                    </div>
                    <div className="support-v2-section-heading">
                        <div>
                            <p className="support-v2-eyebrow"><span /> CHOOSE A CONTACT OPTION</p>
                            <h2 id="support-v2-options-title">How can we help?</h2>
                        </div>
                        <p>Order-specific questions are easiest to follow in your support inbox.</p>
                    </div>

                    <div className="support-v2-card-grid">
                        <article
                            className="support-v2-card support-v2-card--inbox"
                            onPointerMove={handleCardPointerMove}
                        >
                            <div className="support-v2-card__header">
                                <span className="support-v2-card__icon"><MessageCircle size={20} aria-hidden="true" /></span>
                                <span className="support-v2-card__pill support-v2-card__pill--highlight">
                                    <CheckCircle2 size={12} aria-hidden="true" /> Recommended
                                </span>
                            </div>
                            <span className="support-v2-card__tag">BEST FOR ORDERS</span>
                            <h3>Account support inbox</h3>
                            <p>Keep your question, order history, and the team’s reply together in one organized thread inside your CarVex account.</p>
                            <div className="support-v2-card__footer">
                                <Link to={isAuthenticated ? inboxPath : '/login'} className="support-v2-card__cta support-v2-card__cta--primary">
                                    {isAuthenticated ? inboxLabel : 'Sign in to continue'} <ArrowRight size={16} aria-hidden="true" />
                                </Link>
                                {!isAuthenticated ? (
                                    <small>New to CarVex? <Link to="/register">Create an account</Link></small>
                                ) : null}
                            </div>
                        </article>

                        <article
                            className="support-v2-card"
                            onPointerMove={handleCardPointerMove}
                        >
                            <div className="support-v2-card__header">
                                <span className="support-v2-card__icon"><Mail size={20} aria-hidden="true" /></span>
                                <span className="support-v2-card__pill">24/7 Inbox</span>
                            </div>
                            <span className="support-v2-card__tag">SEND US A NOTE</span>
                            <h3>Email our team</h3>
                            <p>Use email for general questions about parts, vehicle compatibility, sellers, or using the CarVex marketplace.</p>
                            <div className="support-v2-card__footer">
                                <a href={`mailto:${supportEmail}`} className="support-v2-card__cta">
                                    {supportEmail} <ArrowUpRight size={16} aria-hidden="true" />
                                </a>
                                <small>Attach photos or part numbers if helpful</small>
                            </div>
                        </article>

                        <article
                            className="support-v2-card"
                            onPointerMove={handleCardPointerMove}
                        >
                            <div className="support-v2-card__header">
                                <span className="support-v2-card__icon"><Phone size={20} aria-hidden="true" /></span>
                                <span className="support-v2-card__pill">Direct Line</span>
                            </div>
                            <span className="support-v2-card__tag">CALL CARVEX</span>
                            <h3>Speak with the team</h3>
                            <p>Call our Butuan City support desk directly if you’d rather talk through a part or urgent order question.</p>
                            <div className="support-v2-card__footer">
                                <a href={`tel:${supportPhone}`} className="support-v2-card__cta">
                                    +63 939 515 8432 <ArrowUpRight size={16} aria-hidden="true" />
                                </a>
                                <small>Available Monday to Saturday, 8 AM – 6 PM</small>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="support-v2-faq" id="support-faq" aria-labelledby="support-v2-faq-title">
                    <div className="support-v2-topline" aria-hidden="true">
                        <span>KNOWLEDGE BASE</span>
                        <span>03 — QUICK ANSWERS</span>
                    </div>
                    <div className="support-v2-section-heading">
                        <div>
                            <p className="support-v2-eyebrow"><span /> COMMON QUESTIONS</p>
                            <h2 id="support-v2-faq-title">Quick answers before you write in</h2>
                        </div>
                        <div className="support-faq-filters" role="tablist" aria-label="Filter support questions">
                            {faqCategories.map((cat) => (
                                <button
                                    key={cat.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeFaqCategory === cat.key}
                                    className={`support-faq-filter ${activeFaqCategory === cat.key ? 'is-active' : ''}`}
                                    onClick={() => setActiveFaqCategory(cat.key)}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="support-faq-list">
                        {filteredFaqs.map((item) => {
                            const isOpen = openFaqId === item.id;
                            return (
                                <article
                                    key={item.id}
                                    className={`support-faq-item ${isOpen ? 'is-open' : ''}`}
                                >
                                    <button
                                        type="button"
                                        className="support-faq-trigger"
                                        aria-expanded={isOpen}
                                        onClick={() => setOpenFaqId(isOpen ? '' : item.id)}
                                    >
                                        <span className="faq-trigger-icon" aria-hidden="true">
                                            <HelpCircle size={18} />
                                        </span>
                                        <strong>{item.question}</strong>
                                        <span className="faq-chevron" aria-hidden="true">
                                            <ChevronDown size={18} />
                                        </span>
                                    </button>
                                    {isOpen && (
                                        <div className="support-faq-content">
                                            <p>{item.answer}</p>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="support-v2-callout" aria-label="Explore the parts catalog">
                    <div className="support-v2-callout__copy">
                        <p className="support-v2-eyebrow"><span /> READY TO BROWSE?</p>
                        <h2>Already know which part you need?</h2>
                        <p>Search our live catalog by part name, brand, or vehicle system with real-time stock availability.</p>
                    </div>
                    <div className="support-v2-callout__actions">
                        <Link to="/products" className="support-v2-button support-v2-button--primary">
                            Browse parts catalog <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                        <Link to="/" className="support-v2-button support-v2-button--quiet">
                            Back to home
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    );
}
