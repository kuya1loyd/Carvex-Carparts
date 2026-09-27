import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import adminService from '../../services/adminService';
import PageSkeleton from '../../components/Skeleton';
import {
    CheckCircle2,
    Clock3,
    Mail,
    MessageSquare,
    Search,
    Send,
    ShieldCheck,
    Sparkles,
    UserRound,
} from 'lucide-react';

const CONCERN_STATUSES = ['pending', 'reviewed', 'resolved'];

const STATUS_META = {
    pending: {
        label: 'Pending',
        badgeClass: 'badge-warning',
        accentClass: 'support-request-card--pending',
        timelineTone: 'support-message--waiting',
    },
    reviewed: {
        label: 'Reviewed',
        badgeClass: 'badge-info',
        accentClass: 'support-request-card--reviewed',
        timelineTone: 'support-message--reviewed',
    },
    resolved: {
        label: 'Resolved',
        badgeClass: 'badge-success',
        accentClass: 'support-request-card--resolved',
        timelineTone: 'support-message--resolved',
    },
};

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const formatDate = (value) => {
    if (!value) {
        return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'N/A';
    }

    return dateFormatter.format(parsed);
};

const getInitials = (value) => (
    String(value || 'Customer')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'C'
);

const buildConcernSearchText = (concern) => {
    const statusMeta = STATUS_META[concern.status] || STATUS_META.pending;
    const requestCode = `request ${String(concern.id || '').padStart(4, '0')}`;
    const repliedState = concern.replied_at ? 'answered replied response sent' : 'waiting no reply';

    return [
        requestCode,
        concern.id,
        concern.name,
        concern.email,
        concern.subject,
        concern.message,
        concern.admin_reply,
        concern.status,
        statusMeta.label,
        repliedState,
        concern.created_at,
        concern.updated_at,
        concern.replied_at,
        formatDate(concern.created_at),
        formatDate(concern.updated_at),
        formatDate(concern.replied_at),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
};

export default function AdminConcerns() {
    const [searchParams] = useSearchParams();
    const [concerns, setConcerns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedConcernId, setSelectedConcernId] = useState(null);
    const [nextStatusByConcernId, setNextStatusByConcernId] = useState({});
    const [replyDraftByConcernId, setReplyDraftByConcernId] = useState({});
    const [updatingConcernId, setUpdatingConcernId] = useState(null);
    const [saveFeedback, setSaveFeedback] = useState('');

    const hydrateConcernState = (rows) => {
        setConcerns(rows);
        setNextStatusByConcernId(
            rows.reduce((acc, concern) => {
                acc[concern.id] = concern.status || 'pending';
                return acc;
            }, {})
        );
        setReplyDraftByConcernId(
            rows.reduce((acc, concern) => {
                acc[concern.id] = String(concern.admin_reply || '');
                return acc;
            }, {})
        );
        setSelectedConcernId((current) => {
            if (current && rows.some((concern) => concern.id === current)) {
                return current;
            }

            return rows[0]?.id ?? null;
        });
    };

    useEffect(() => {
        const nextSearch = searchParams.get('search') || '';
        const nextStatus = searchParams.get('status') || 'all';
        const nextRequestId = Number(searchParams.get('request') || 0);

        setSearchTerm(nextSearch);
        setStatusFilter(CONCERN_STATUSES.includes(nextStatus) ? nextStatus : 'all');

        if (nextRequestId > 0) {
            setSelectedConcernId(nextRequestId);
        }
    }, [searchParams]);

    useEffect(() => {
        let mounted = true;

        const fetchConcerns = async () => {
            try {
                const res = await adminService.getCustomerConcerns({ per_page: 200 });
                const rows = res.data?.data?.data || [];
                if (!mounted) {
                    return;
                }

                hydrateConcernState(rows);
            } catch (err) {
                console.error('Failed to fetch concerns:', err);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void fetchConcerns();
        return () => {
            mounted = false;
        };
    }, []);

    const filteredConcerns = useMemo(() => {
        const needle = searchTerm.trim().toLowerCase();

        return concerns.filter((concern) => {
            if (statusFilter !== 'all' && concern.status !== statusFilter) {
                return false;
            }

            if (!needle) {
                return true;
            }

            const searchableText = buildConcernSearchText(concern);
            return needle
                .split(/\s+/)
                .every((part) => searchableText.includes(part));
        });
    }, [concerns, searchTerm, statusFilter]);

    const stats = useMemo(() => ({
        total: concerns.length,
        pending: concerns.filter((item) => item.status === 'pending').length,
        reviewed: concerns.filter((item) => item.status === 'reviewed').length,
        resolved: concerns.filter((item) => item.status === 'resolved').length,
        replied: concerns.filter((item) => Boolean(String(item.admin_reply || '').trim())).length,
    }), [concerns]);

    const selectedConcern = useMemo(() => {
        const visibleConcerns = statusFilter !== 'all' || searchTerm.trim() !== '' ? filteredConcerns : concerns;

        return visibleConcerns.find((concern) => concern.id === selectedConcernId)
            || visibleConcerns[0]
            || null;
    }, [concerns, filteredConcerns, searchTerm, selectedConcernId, statusFilter]);

    useEffect(() => {
        if (filteredConcerns.length === 0) {
            return;
        }

        if (!filteredConcerns.some((concern) => concern.id === selectedConcernId)) {
            setSelectedConcernId(filteredConcerns[0].id);
        }
    }, [filteredConcerns, selectedConcernId]);

    const handleSaveConcern = async (concern) => {
        const nextStatus = nextStatusByConcernId[concern.id] || concern.status || 'pending';
        const adminReply = String(replyDraftByConcernId[concern.id] || '');
        const normalizedExistingReply = String(concern.admin_reply || '');
        const hasChanges = nextStatus !== (concern.status || 'pending') || adminReply !== normalizedExistingReply;

        if (!hasChanges || updatingConcernId === concern.id) {
            return;
        }

        try {
            setUpdatingConcernId(concern.id);
            setSaveFeedback('');
            const res = await adminService.updateCustomerConcern(concern.id, {
                status: nextStatus,
                admin_reply: adminReply,
            });
            const updatedConcern = res.data?.data;

            setConcerns((prev) => prev.map((item) => (
                item.id === concern.id
                    ? { ...item, ...updatedConcern }
                    : item
            )));

            if (updatedConcern) {
                setNextStatusByConcernId((prev) => ({ ...prev, [concern.id]: updatedConcern.status || nextStatus }));
                setReplyDraftByConcernId((prev) => ({ ...prev, [concern.id]: String(updatedConcern.admin_reply || '') }));
            }

            setSaveFeedback('Message sent to the customer successfully.');
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to save customer reply';
            window.alert(message);
        } finally {
            setUpdatingConcernId(null);
        }
    };

    if (loading) {
        return <PageSkeleton variant="dashboard" label="Loading the support desk" />;
    }

    return (
        <div className="admin-page">
            <div className="admin-dashboard-modern support-desk-page">
                <section className="support-desk-hero">
                    <div className="support-desk-hero__content">
                        <span className="support-desk-hero__eyebrow">Customer Support</span>
                        <h1>Give every support request a calmer, more professional handling flow.</h1>
                        <p>
                            Review customer issues, see who is still waiting, and send cleaner replies without leaving the admin workspace.
                        </p>
                        <div className="support-desk-hero__chips">
                            <span>{stats.total} total requests</span>
                            <span>{stats.pending} waiting for reply</span>
                            <span>{stats.replied} already answered</span>
                        </div>
                    </div>

                    <div className="support-desk-hero__stats">
                        <SupportDeskStat icon={<Clock3 size={18} />} label="Pending" value={stats.pending} tone="amber" />
                        <SupportDeskStat icon={<MessageSquare size={18} />} label="Reviewed" value={stats.reviewed} tone="blue" />
                        <SupportDeskStat icon={<CheckCircle2 size={18} />} label="Resolved" value={stats.resolved} tone="green" />
                        <SupportDeskStat icon={<Send size={18} />} label="Answered" value={stats.replied} tone="purple" />
                    </div>
                </section>

                <section className="support-desk-toolbar">
                    <div className="support-desk-toolbar__search">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search any request, customer, email, status, or message..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>

                    <div className="support-desk-toolbar__filters">
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                            <option value="all">All statuses</option>
                            {CONCERN_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="support-desk-toolbar__summary">
                        <strong>{filteredConcerns.length}</strong>
                        <span>{filteredConcerns.length === 1 ? 'request in view' : 'requests in view'}</span>
                    </div>
                </section>

                <div className="support-desk-shell">
                    <section className="support-request-list">
                        <div className="support-request-list__header">
                            <div>
                                <h2>Support requests</h2>
                                <p>Select a customer request to open the full conversation.</p>
                            </div>
                        </div>

                        {filteredConcerns.length === 0 ? (
                            <div className="admin-empty-state">
                                <MessageSquare size={48} />
                                <h3>No support requests found</h3>
                                <p>Try adjusting the search or status filter.</p>
                            </div>
                        ) : (
                            <div className="support-request-list__items">
                                {filteredConcerns.map((concern) => {
                                    const meta = STATUS_META[concern.status] || STATUS_META.pending;
                                    const hasReply = Boolean(String(concern.admin_reply || '').trim());

                                    return (
                                        <button
                                            key={concern.id}
                                            type="button"
                                            className={`support-request-card ${meta.accentClass}${selectedConcern?.id === concern.id ? ' is-active' : ''}`}
                                            onClick={() => {
                                                setSelectedConcernId(concern.id);
                                                setSaveFeedback('');
                                            }}
                                        >
                                            <div className="support-request-card__topline">
                                                <span className="support-request-card__code">
                                                    Request #{String(concern.id).padStart(4, '0')}
                                                </span>
                                                <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
                                            </div>

                                            <h3>{concern.subject || 'General concern'}</h3>
                                            <p>{String(concern.message || '').slice(0, 132)}{String(concern.message || '').length > 132 ? '...' : ''}</p>

                                            <div className="support-request-card__person">
                                                <span className="support-request-card__avatar">{getInitials(concern.name)}</span>
                                                <div>
                                                    <strong>{concern.name || 'Customer'}</strong>
                                                    <small>{concern.email || 'No email provided'}</small>
                                                </div>
                                            </div>

                                            <div className="support-request-card__meta">
                                                <span>{hasReply ? 'Admin already replied' : 'Waiting for first reply'}</span>
                                                <small>{formatDate(concern.created_at)}</small>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="support-request-detail">
                        {selectedConcern ? (
                            <>
                                <div className="support-request-detail__hero">
                                    <div>
                                        <p>Support request #{String(selectedConcern.id).padStart(4, '0')}</p>
                                        <h2>{selectedConcern.subject || 'General concern'}</h2>
                                        <span>Received {formatDate(selectedConcern.created_at)}</span>
                                    </div>
                                    <span className={`badge ${(STATUS_META[selectedConcern.status] || STATUS_META.pending).badgeClass}`}>
                                        {(STATUS_META[selectedConcern.status] || STATUS_META.pending).label}
                                    </span>
                                </div>

                                <div className="support-request-overview">
                                    <div className="support-request-overview__card">
                                        <span><UserRound size={15} /> Customer</span>
                                        <strong>{selectedConcern.name || 'Customer'}</strong>
                                        <small>Account holder attached to this support request.</small>
                                    </div>

                                    <div className="support-request-overview__card">
                                        <span><Mail size={15} /> Email</span>
                                        <strong>{selectedConcern.email || 'No email provided'}</strong>
                                        <small>Use this when you need to verify customer identity.</small>
                                    </div>

                                    <div className="support-request-overview__card">
                                        <span><ShieldCheck size={15} /> Reply state</span>
                                        <strong>{selectedConcern.replied_at ? 'Reply already sent' : 'No reply sent yet'}</strong>
                                        <small>{selectedConcern.replied_at ? `Last update ${formatDate(selectedConcern.replied_at)}` : 'The customer is still waiting for a response.'}</small>
                                    </div>
                                </div>

                                <div className="support-conversation">
                                    <article className="support-message support-message--customer">
                                        <div className="support-message__header">
                                            <div className="support-message__author">
                                                <span className="support-message__avatar">{getInitials(selectedConcern.name)}</span>
                                                <div>
                                                    <strong>{selectedConcern.name || 'Customer'}</strong>
                                                    <small>Customer message</small>
                                                </div>
                                            </div>
                                            <time>{formatDate(selectedConcern.created_at)}</time>
                                        </div>
                                        <p>{selectedConcern.message || 'No message provided.'}</p>
                                    </article>

                                    <article className={`support-message ${(STATUS_META[selectedConcern.status] || STATUS_META.pending).timelineTone}`}>
                                        <div className="support-message__header">
                                            <div className="support-message__author">
                                                <span className="support-message__avatar support-message__avatar--admin">A</span>
                                                <div>
                                                    <strong>Admin response</strong>
                                                    <small>{selectedConcern.replied_at ? 'Latest message sent to customer' : 'Compose the first reply below'}</small>
                                                </div>
                                            </div>
                                            <time>{selectedConcern.replied_at ? formatDate(selectedConcern.replied_at) : 'Not sent yet'}</time>
                                        </div>
                                        <p>{selectedConcern.admin_reply || 'No admin message has been sent yet. Use the composer below to respond to the customer.'}</p>
                                    </article>
                                </div>

                                <div className="support-composer">
                                    <div className="support-composer__header">
                                        <div>
                                            <h3>Reply to customer</h3>
                                            <p>Send a clear message that will appear in the customer support inbox and notifications.</p>
                                        </div>
                                        <span className="support-composer__hint">
                                            <Sparkles size={14} />
                                            Keep it short, specific, and helpful
                                        </span>
                                    </div>

                                    <textarea
                                        value={replyDraftByConcernId[selectedConcern.id] ?? String(selectedConcern.admin_reply || '')}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setReplyDraftByConcernId((prev) => ({ ...prev, [selectedConcern.id]: value }));
                                            setSaveFeedback('');
                                        }}
                                        placeholder="Write the message you want the customer to receive..."
                                        rows={8}
                                    />

                                    <div className="support-composer__footer">
                                        <div className="support-composer__status">
                                            <label htmlFor={`concern-status-${selectedConcern.id}`}>Support request status</label>
                                            <select
                                                id={`concern-status-${selectedConcern.id}`}
                                                value={nextStatusByConcernId[selectedConcern.id] || selectedConcern.status || 'pending'}
                                                onChange={(event) => {
                                                    const value = event.target.value;
                                                    setNextStatusByConcernId((prev) => ({ ...prev, [selectedConcern.id]: value }));
                                                    setSaveFeedback('');
                                                }}
                                                disabled={updatingConcernId === selectedConcern.id}
                                            >
                                                {CONCERN_STATUSES.map((status) => (
                                                    <option key={status} value={status}>
                                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => handleSaveConcern(selectedConcern)}
                                            disabled={updatingConcernId === selectedConcern.id}
                                        >
                                            {updatingConcernId === selectedConcern.id ? 'Sending...' : 'Send message'}
                                        </button>
                                    </div>

                                    {saveFeedback ? (
                                        <div className="support-composer__success">{saveFeedback}</div>
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <div className="admin-empty-state">
                                <MessageSquare size={48} />
                                <h3>No support request selected</h3>
                                <p>Choose a support request from the left side to review and reply.</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

function SupportDeskStat({ icon, label, value, tone }) {
    return (
        <div className={`support-desk-stat support-desk-stat--${tone}`}>
            <div className="support-desk-stat__icon">{icon}</div>
            <div className="support-desk-stat__content">
                <span>{label}</span>
                <strong>{value}</strong>
            </div>
        </div>
    );
}
