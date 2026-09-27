import React, { useCallback, useEffect, useState } from 'react';
import { Activity as ActivityIcon, AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Filter, PackageCheck, RefreshCw, Search, X } from 'lucide-react';
import adminService from '../../services/adminService';
import { FALLBACK_PRODUCT_IMAGE, resolveProductImage } from '../../utils/productImage';
import PageSkeleton from '../../components/Skeleton';

const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const getActivityPage = (response) => {
    const payload = response?.data?.data ?? {};
    const rows = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
    return {
        rows,
        currentPage: Number(payload.current_page || 1),
        lastPage: Math.max(1, Number(payload.last_page || 1)),
        total: Number(payload.total ?? rows.length),
    };
};

const getProductRows = (response) => {
    const payload = response?.data?.data ?? response?.data ?? {};
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.products)) return payload.products;
    return [];
};

const formatTime = (value) => {
    if (!value) return 'Time unavailable';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Time unavailable' : dateFormatter.format(parsed);
};

const displayAction = (event) => String(event.action || event.description || 'Workspace updated')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const displayTarget = (event) => event.subject_name || event.metadata?.product_name || event.metadata?.subject_name || 'Workspace';

export default function AdminActivity() {
    const [activity, setActivity] = useState([]);
    const [pendingListings, setPendingListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [queueLoading, setQueueLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');
    const [loadError, setLoadError] = useState('');
    const [queueError, setQueueError] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [reviewNotice, setReviewNotice] = useState('');
    const [reviewNotes, setReviewNotes] = useState({});
    const [reviewingId, setReviewingId] = useState(null);

    const loadActivity = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const response = await adminService.getActivity({ search: search || undefined, type: type || undefined, page, per_page: 12 });
            const result = getActivityPage(response);
            setActivity(result.rows);
            setLastPage(result.lastPage);
            setTotal(result.total);
            if (result.currentPage !== page) setPage(result.currentPage);
        } catch (error) {
            setLoadError(error.response?.data?.message || 'Activity could not be loaded. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [page, search, type]);

    const loadPendingListings = useCallback(async () => {
        setQueueLoading(true);
        setQueueError('');
        try {
            const response = await adminService.getProducts({ params: { status: 'pending', per_page: 100 } });
            setPendingListings(getProductRows(response).filter((product) => String(product.listing_status || product.status || '').toLowerCase() === 'pending'));
        } catch (error) {
            setQueueError(error.response?.data?.message || 'Pending seller listings could not be loaded.');
        } finally {
            setQueueLoading(false);
        }
    }, []);

    useEffect(() => { void loadActivity(); }, [loadActivity]);
    useEffect(() => { void loadPendingListings(); }, [loadPendingListings]);

    const submitSearch = (event) => {
        event.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    const reviewProduct = async (product, status) => {
        setReviewingId(product.id);
        setReviewError('');
        setReviewNotice('');
        try {
            await adminService.reviewSellerProduct(product.id, {
                status,
                review_note: String(reviewNotes[product.id] || '').trim(),
            });
            setReviewNotice(`${product.name || 'Listing'} ${status === 'approved' ? 'approved and published' : 'returned to the seller'}.`);
            setReviewNotes((current) => ({ ...current, [product.id]: '' }));
            await Promise.all([loadPendingListings(), loadActivity()]);
        } catch (error) {
            setReviewError(error.response?.data?.message || 'The review could not be saved. Please try again.');
        } finally {
            setReviewingId(null);
        }
    };

    return (
        <div className="admin-page admin-activity-page">
            <div className="admin-workspace">
                <section className="activity-intro-card">
                    <div className="activity-intro-icon"><ActivityIcon size={22} /></div>
                    <div><span>Store activity</span><h2>Keep the marketplace moving</h2><p>Review seller submissions and see the latest actions across CarVex.</p></div>
                    <button type="button" className="activity-refresh-button" onClick={() => { void loadPendingListings(); void loadActivity(); }} aria-label="Refresh activity and pending listings"><RefreshCw size={16} /> Refresh</button>
                </section>

                {reviewNotice ? <div className="activity-feedback activity-feedback--success" role="status"><CheckCircle2 size={18} />{reviewNotice}</div> : null}
                {reviewError ? <div className="activity-feedback activity-feedback--error" role="alert"><AlertCircle size={18} />{reviewError}</div> : null}

                <section className="activity-review-section" aria-labelledby="pending-listings-title">
                    <div className="activity-section-heading"><div><span className="activity-section-kicker"><PackageCheck size={15} /> Seller review</span><h2 id="pending-listings-title">Pending listings <span>{pendingListings.length}</span></h2><p>Approve parts that are ready for the public catalog, or return them with a note.</p></div></div>
                    {queueError ? <div className="activity-feedback activity-feedback--error" role="alert">{queueError}<button type="button" onClick={() => void loadPendingListings()}>Retry</button></div> : null}
                    {queueLoading ? <PageSkeleton variant="list" label="Loading listings awaiting review" /> : pendingListings.length === 0 ? (
                        <div className="activity-queue-empty"><CheckCircle2 size={20} /><div><strong>Review queue is clear</strong><span>New seller submissions will appear here.</span></div></div>
                    ) : (
                        <div className="activity-review-grid">
                            {pendingListings.map((product) => {
                                const owner = product.seller || product.owner || product.user || {};
                                return (
                                    <article className="activity-review-card" key={product.id}>
                                        <img className="activity-review-card__image" src={resolveProductImage(product.images || product.image_url || product.image) || FALLBACK_PRODUCT_IMAGE} alt={product.name ? `${product.name} submitted listing` : 'Submitted part'} />
                                        <div className="activity-review-card__main">
                                            <div className="activity-review-card__title"><div><span>{product.brand || product.category?.name || 'Seller submission'}</span><h3>{product.name || 'Untitled part'}</h3></div><strong>{currencyFormatter.format(Number(product.price || 0))}</strong></div>
                                            <p className="activity-review-card__seller">Submitted by {owner.name || product.seller_name || 'Seller'}{owner.email || product.seller_email ? ` · ${owner.email || product.seller_email}` : ''}</p>
                                            <div className="activity-review-card__details"><span>{Number(product.stock || 0)} in stock</span><span>{product.category?.name || 'Category not set'}</span><span><Clock3 size={13} /> {formatTime(product.created_at || product.updated_at)}</span></div>
                                            {product.description ? <p className="activity-review-card__description">{product.description}</p> : null}
                                            <label className="activity-review-note"><span>Note for seller <small>(optional; shown if rejected)</small></span><textarea rows="2" value={reviewNotes[product.id] || ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [product.id]: event.target.value }))} placeholder="Explain any changes needed" /></label>
                                            <div className="activity-review-card__actions"><button type="button" className="activity-reject-button" onClick={() => void reviewProduct(product, 'rejected')} disabled={reviewingId === product.id}><X size={15} />{reviewingId === product.id ? 'Saving…' : 'Reject'}</button><button type="button" className="activity-approve-button" onClick={() => void reviewProduct(product, 'approved')} disabled={reviewingId === product.id}><Check size={16} />{reviewingId === product.id ? 'Saving…' : 'Approve listing'}</button></div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="activity-log-section" aria-labelledby="activity-log-title">
                    <div className="activity-log-heading"><div><span className="activity-section-kicker"><Clock3 size={15} /> Audit trail</span><h2 id="activity-log-title">Recent activity</h2><p>{total} recorded {total === 1 ? 'event' : 'events'}</p></div></div>
                    <div className="activity-log-toolbar">
                        <form className="activity-search" role="search" onSubmit={submitSearch}><Search size={16} /><label className="sr-only" htmlFor="activity-search-input">Search activity</label><input id="activity-search-input" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search people, parts, or actions" /><button type="submit">Search</button></form>
                        <label className="activity-type-select"><Filter size={15} /><span className="sr-only">Filter activity type</span><select value={type} onChange={(event) => { setPage(1); setType(event.target.value); }}><option value="">All activity types</option><option value="customer">Customer activity</option><option value="seller">Seller activity</option><option value="order">Orders</option><option value="concern">Support</option></select></label>
                    </div>
                    {loadError ? <div className="activity-feedback activity-feedback--error" role="alert">{loadError}<button type="button" onClick={() => void loadActivity()}>Retry</button></div> : null}
                    {loading ? <PageSkeleton variant="list" label="Loading recent activity" /> : activity.length === 0 ? (
                        <div className="activity-log-empty"><ActivityIcon size={22} /><h3>No activity found</h3><p>Try another search or filter. New actions will appear here as they happen.</p></div>
                    ) : (
                        <>
                            <div className="activity-event-list">
                                {activity.map((event) => (
                                    <article className="activity-event" key={event.id}>
                                        <div className={`activity-event__marker activity-event__marker--${String(event.type || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}><ActivityIcon size={16} /></div>
                                        <div className="activity-event__body"><div className="activity-event__headline"><strong>{displayAction(event)}</strong><time dateTime={event.created_at || undefined}>{formatTime(event.created_at)}</time></div><p>{event.description && event.description !== event.action ? event.description : `${event.actor_name || 'Someone'} updated ${displayTarget(event)}.`}</p><div className="activity-event__meta"><span>{event.actor_name || 'Unknown actor'}{event.actor_email ? ` · ${event.actor_email}` : ''}</span><span className="activity-event__target">{displayTarget(event)}</span><span className="activity-event__type">{String(event.type || 'activity').replace(/[_-]+/g, ' ')}</span></div></div>
                                    </article>
                                ))}
                            </div>
                            <nav className="activity-pagination" aria-label="Activity pages"><span>Page {page} of {lastPage}</span><div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || page <= 1} aria-label="Previous page"><ChevronLeft size={17} /> Previous</button><button type="button" onClick={() => setPage((current) => Math.min(lastPage, current + 1))} disabled={loading || page >= lastPage} aria-label="Next page">Next <ChevronRight size={17} /></button></div></nav>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
