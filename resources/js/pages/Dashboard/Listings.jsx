import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Edit3, ImagePlus, Package, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import categoryService from '../../services/categoryService';
import sellerListingService from '../../services/sellerListingService';
import { FALLBACK_PRODUCT_IMAGE, resolveProductImage } from '../../utils/productImage';
import PageSkeleton from '../../components/Skeleton';

const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const getPayload = (response) => response?.data?.data ?? response?.data ?? {};

const getRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.listings)) return payload.listings;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const getCategoryRows = (response) => {
    const payload = getPayload(response);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.categories)) return payload.categories;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const getStatus = (listing) => String(listing?.listing_status || listing?.status || 'pending').toLowerCase();

const getStatusLabel = (status) => {
    if (status === 'approved' || status === 'live') return 'Live';
    if (status === 'rejected') return 'Needs changes';
    if (status === 'archived') return 'Archived';
    return 'Pending review';
};

const getDateLabel = (value) => {
    if (!value) return 'Not updated yet';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
        ? 'Not updated yet'
        : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(parsed);
};

const buildFormData = (values) => {
    const formData = new FormData();
    ['name', 'brand', 'description', 'category_id', 'price', 'stock', 'vehicle_compatibility'].forEach((key) => {
        const value = values[key];
        if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    Array.from(values.images || []).forEach((file) => formData.append('images[]', file));
    return formData;
};

const emptyForm = () => ({
    name: '',
    brand: '',
    description: '',
    category_id: '',
    price: '',
    stock: '1',
    vehicle_compatibility: '',
    images: [],
});

export default function DashboardListings() {
    const [listings, setListings] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [categoryError, setCategoryError] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filters, setFilters] = useState({ search: '', status: '' });
    const [editingListing, setEditingListing] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [notice, setNotice] = useState('');
    const [archivingId, setArchivingId] = useState(null);

    const loadListings = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const response = await sellerListingService.getListings({
                search: filters.search || undefined,
                status: filters.status || undefined,
            });
            setListings(getRows(getPayload(response)));
        } catch (error) {
            setLoadError(error.response?.data?.message || 'Your listings could not be loaded. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { void loadListings(); }, [loadListings]);

    useEffect(() => {
        let active = true;
        categoryService.getAll()
            .then((response) => { if (active) setCategories(getCategoryRows(response)); })
            .catch(() => { if (active) setCategoryError('Categories are unavailable right now. You can retry by reloading this page.'); })
            .finally(() => { if (active) setCategoriesLoading(false); });
        return () => { active = false; };
    }, []);

    const counts = useMemo(() => listings.reduce((result, listing) => {
        const status = getStatus(listing);
        result.total += 1;
        if (status === 'pending') result.pending += 1;
        if (status === 'approved' || status === 'live') result.live += 1;
        if (status === 'rejected') result.changes += 1;
        return result;
    }, { total: 0, pending: 0, live: 0, changes: 0 }), [listings]);

    const openCreateForm = () => {
        setDialogOpen(true);
        setEditingListing(null);
        setForm(emptyForm());
        setSelectedFiles([]);
        setFormError('');
        setNotice('');
    };

    const openEditForm = (listing) => {
        setDialogOpen(true);
        setEditingListing(listing);
        setForm({
            name: listing.name || '',
            brand: listing.brand || '',
            description: listing.description || '',
            category_id: String(listing.category_id || listing.category?.id || ''),
            price: String(listing.price ?? ''),
            stock: String(listing.stock ?? 0),
            vehicle_compatibility: Array.isArray(listing.vehicle_compatibility)
                ? listing.vehicle_compatibility.join(', ')
                : (listing.vehicle_compatibility || ''),
            images: [],
        });
        setSelectedFiles([]);
        setFormError('');
        setNotice('');
    };

    const closeForm = () => {
        if (saving) return;
        setDialogOpen(false);
        setEditingListing(null);
        setFormError('');
    };

    const updateForm = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleFiles = (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length > 6) {
            setFormError('Choose up to six photos per update.');
            event.target.value = '';
            return;
        }
        setFormError('');
        setForm((current) => ({ ...current, images: files }));
        setSelectedFiles(files);
    };

    const submitForm = async (event) => {
        event.preventDefault();
        setFormError('');
        setNotice('');
        setSaving(true);
        try {
            const data = buildFormData(form);
            if (editingListing) {
                await sellerListingService.updateListing(editingListing.id, data);
                setNotice('Your listing was updated. Changes may need another review.');
            } else {
                await sellerListingService.createListing(data);
                setNotice('Your part was submitted and is waiting for review.');
            }
            setDialogOpen(false);
            setEditingListing(null);
            setSelectedFiles([]);
            await loadListings();
        } catch (error) {
            setFormError(error.response?.data?.message || 'We could not save this listing. Check the details and try again.');
        } finally {
            setSaving(false);
        }
    };

    const archiveListing = async (listing) => {
        const confirmed = window.confirm(`Delete “${listing.name || 'this listing'}” from your active listings? It will be removed from the shop, while its order history is retained.`);
        if (!confirmed || archivingId) return;
        setArchivingId(listing.id);
        setNotice('');
        try {
            await sellerListingService.archiveListing(listing.id);
            setNotice('Listing deleted from your active listings. Its order and listing history has been retained.');
            await loadListings();
        } catch (error) {
            setLoadError(error.response?.data?.message || 'The listing could not be removed. Please try again.');
        } finally {
            setArchivingId(null);
        }
    };

    const submitSearch = (event) => {
        event.preventDefault();
        setFilters((current) => ({ ...current, search: searchInput.trim() }));
    };

    return (
        <main className="seller-listings-page">
            <div className="seller-listings-shell">
                <header className="seller-listings-heading">
                    <div>
                        <p className="seller-listings-eyebrow"><Tag size={15} aria-hidden="true" /> Seller workspace</p>
                        <h1>My Listings</h1>
                        <p>Manage the parts you have listed and follow their review status.</p>
                    </div>
                    <button type="button" className="seller-primary-button" onClick={openCreateForm}>
                        <Plus size={18} aria-hidden="true" /> Sell a part
                    </button>
                </header>

                {notice ? <div className="seller-alert seller-alert--success" role="status"><CheckCircle2 size={18} />{notice}</div> : null}
                {loadError ? <div className="seller-alert seller-alert--error" role="alert">{loadError}<button type="button" onClick={() => void loadListings()}>Try again</button></div> : null}

                <section className="seller-listing-summary" aria-label="Listing summary">
                    <article><span className="seller-summary-icon"><Package size={19} /></span><span><small>Listings shown</small><strong>{counts.total}</strong></span></article>
                    <article><span className="seller-summary-icon seller-summary-icon--pending"><Clock3 size={19} /></span><span><small>Pending review</small><strong>{counts.pending}</strong></span></article>
                    <article><span className="seller-summary-icon seller-summary-icon--live"><CheckCircle2 size={19} /></span><span><small>Live</small><strong>{counts.live}</strong></span></article>
                    <article><span className="seller-summary-icon seller-summary-icon--changes"><Edit3 size={19} /></span><span><small>Needs changes</small><strong>{counts.changes}</strong></span></article>
                </section>

                <section className="seller-listing-panel" aria-labelledby="seller-listings-title">
                    <div className="seller-listing-toolbar">
                        <div><h2 id="seller-listings-title">Your parts</h2><p>Listings shown reflect your current filters.</p></div>
                        <div className="seller-listing-filters">
                            <form className="seller-search" role="search" onSubmit={submitSearch}>
                                <Search size={17} aria-hidden="true" />
                                <label className="sr-only" htmlFor="seller-listing-search">Search your listings</label>
                                <input id="seller-listing-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search your parts" />
                                <button type="submit">Search</button>
                            </form>
                            <label className="seller-status-filter"><span className="sr-only">Filter listing status</span>
                                <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                                    <option value="">All statuses</option>
                                    <option value="pending">Pending review</option>
                                    <option value="approved">Live</option>
                                    <option value="rejected">Needs changes</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    {loading ? (
                        <PageSkeleton variant="list" label="Loading your listings" />
                    ) : listings.length === 0 ? (
                        <div className="seller-listing-empty">
                            <span><Package size={25} /></span>
                            <h3>{filters.search || filters.status ? 'No listings match these filters' : 'Your seller page starts here'}</h3>
                            <p>{filters.search || filters.status ? 'Try another search or status, or clear your filters.' : 'List a part you no longer need. You can track its review and availability here.'}</p>
                            {filters.search || filters.status ? (
                                <button type="button" className="seller-secondary-button" onClick={() => { setSearchInput(''); setFilters({ search: '', status: '' }); }}>Clear filters</button>
                            ) : <button type="button" className="seller-primary-button" onClick={openCreateForm}><Plus size={17} /> Sell your first part</button>}
                        </div>
                    ) : (
                        <div className="seller-listing-grid">
                            {listings.map((listing) => {
                                const status = getStatus(listing);
                                const reviewNote = listing.review_note || listing.admin_note || listing.rejection_note;
                                return (
                                    <article className="seller-listing-card" key={listing.id}>
                                        <div className="seller-listing-card__image">
                                            <img src={resolveProductImage(listing.images || listing.image_url || listing.image) || FALLBACK_PRODUCT_IMAGE} alt={listing.name ? `${listing.name} listing` : 'Part listing'} />
                                            <span className={`seller-status seller-status--${status === 'approved' || status === 'live' ? 'live' : status === 'rejected' ? 'rejected' : status === 'archived' ? 'archived' : 'pending'}`}>
                                                {getStatusLabel(status)}
                                            </span>
                                        </div>
                                        <div className="seller-listing-card__body">
                                            <div className="seller-listing-card__title"><div><small>{listing.brand || listing.category?.name || 'Car part'}</small><h3>{listing.name || 'Untitled part'}</h3></div><strong>{currencyFormatter.format(Number(listing.price || 0))}</strong></div>
                                            <div className="seller-listing-card__meta"><span>{Number(listing.stock || 0)} in stock</span><span><CalendarDays size={14} /> Updated {getDateLabel(listing.updated_at || listing.created_at)}</span></div>
                                            {status === 'rejected' ? <div className="seller-review-note"><strong>Admin note</strong><p>{reviewNote || 'Please review the listing details and make any needed changes before resubmitting.'}</p></div> : null}
                                            <div className="seller-listing-card__actions">
                                                <button type="button" className="seller-secondary-button" onClick={() => openEditForm(listing)}><Edit3 size={15} /> Edit</button>
                                                <button type="button" className="seller-archive-button" onClick={() => void archiveListing(listing)} disabled={archivingId === listing.id}>
                                                    <Trash2 size={15} /> {archivingId === listing.id ? 'Deleting…' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                <ListingDialog
                    open={dialogOpen}
                    listing={editingListing}
                    form={form}
                    categories={categories}
                    categoriesLoading={categoriesLoading}
                    categoryError={categoryError}
                    selectedFiles={selectedFiles}
                    saving={saving}
                    error={formError}
                    onChange={updateForm}
                    onFiles={handleFiles}
                    onClose={closeForm}
                    onSubmit={submitForm}
                />
            </div>
        </main>
    );
}

function ListingDialog({ open, listing, form, categories, categoriesLoading, categoryError, selectedFiles, saving, error, onChange, onFiles, onClose, onSubmit }) {
    if (!open) return null;
    const handleDialogKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
            return;
        }
        if (event.key !== 'Tab') return;

        const focusable = Array.from(event.currentTarget.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };
    return (
        <div className="seller-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="seller-dialog" role="dialog" aria-modal="true" aria-labelledby="seller-dialog-title" onKeyDown={handleDialogKeyDown}>
                <header className="seller-dialog__header"><div><span>{listing ? 'Update details' : 'New seller listing'}</span><h2 id="seller-dialog-title">{listing ? 'Edit your part' : 'Sell a part'}</h2></div><button type="button" className="seller-dialog__close" onClick={onClose} aria-label="Close listing form"><X size={20} /></button></header>
                <p className="seller-dialog__intro">Add clear details so shoppers can understand what you are selling. New listings are reviewed before they appear in the catalog.</p>
                {error ? <div className="seller-alert seller-alert--error" role="alert">{error}</div> : null}
                {categoryError ? <div className="seller-alert seller-alert--error" role="alert">{categoryError}</div> : null}
                <form className="seller-listing-form" onSubmit={onSubmit}>
                    <div className="seller-form-grid">
                        <label className="seller-form-field seller-form-field--wide"><span>Part name <b aria-hidden="true">*</b></span><input autoFocus name="name" value={form.name} onChange={onChange} required maxLength="160" placeholder="e.g. Front brake pads" /></label>
                        <label className="seller-form-field"><span>Category <b aria-hidden="true">*</b></span><select name="category_id" value={form.category_id} onChange={onChange} required disabled={categoriesLoading}><option value="">{categoriesLoading ? 'Loading categories…' : 'Choose a category'}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                        <label className="seller-form-field"><span>Brand <b aria-hidden="true">*</b></span><input name="brand" value={form.brand} onChange={onChange} required maxLength="100" placeholder="Brand name" /></label>
                        <label className="seller-form-field"><span>Price (₱) <b aria-hidden="true">*</b></span><input name="price" type="number" inputMode="decimal" min="0.01" step="0.01" value={form.price} onChange={onChange} required placeholder="0.00" /></label>
                        <label className="seller-form-field"><span>Available stock <b aria-hidden="true">*</b></span><input name="stock" type="number" inputMode="numeric" min="0" step="1" value={form.stock} onChange={onChange} required /></label>
                        <label className="seller-form-field seller-form-field--wide"><span>Vehicle compatibility</span><input name="vehicle_compatibility" value={form.vehicle_compatibility} onChange={onChange} placeholder="e.g. Toyota Vios 2018–2022" /><small>Separate multiple makes or models with commas.</small></label>
                        <label className="seller-form-field seller-form-field--wide"><span>Description <b aria-hidden="true">*</b></span><textarea name="description" value={form.description} onChange={onChange} rows="4" maxLength="2000" required placeholder="Condition, fitment details, or other useful information" /></label>
                        <div className="seller-form-field seller-form-field--wide"><span>Part photos</span><label className="seller-file-picker"><ImagePlus size={18} /><span>{selectedFiles.length ? `${selectedFiles.length} photo${selectedFiles.length === 1 ? '' : 's'} selected` : 'Choose photos from your device'}</span><input type="file" accept="image/*" multiple onChange={onFiles} aria-label="Upload part photos" /></label><small>{listing?.images && !selectedFiles.length ? 'Existing photos are kept. New photos are added to the listing (up to six total).' : 'Add up to six clear photos of the part.'}</small></div>
                    </div>
                    <footer className="seller-dialog__footer"><button type="button" className="seller-secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="seller-primary-button" disabled={saving || categoriesLoading}>{saving ? 'Saving…' : listing ? 'Save changes' : 'Submit for review'}</button></footer>
                </form>
            </section>
        </div>
    );
}
