import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, LifeBuoy, MessageSquare, RefreshCw, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supportService from '../../services/supportService';
import PageSkeleton from '../../components/Skeleton';

const STATUS_META = {
    pending: {
        label: 'Pending',
        chipBackground: '#fff7ed',
        chipColor: '#c2410c',
        borderColor: '#fdba74',
    },
    reviewed: {
        label: 'Reviewed',
        chipBackground: '#eff6ff',
        chipColor: '#1d4ed8',
        borderColor: '#93c5fd',
    },
    resolved: {
        label: 'Resolved',
        chipBackground: '#ecfdf5',
        chipColor: '#15803d',
        borderColor: '#86efac',
    },
};

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const formatDate = (value) => {
    if (!value) {
        return 'Not yet available';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Not yet available';
    }

    return dateFormatter.format(parsed);
};

export default function DashboardSupport() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [concerns, setConcerns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [feedback, setFeedback] = useState({ type: '', text: '' });
    const [activeConcernId, setActiveConcernId] = useState(null);
    const requestedConcernId = Number(searchParams.get('concern') || 0);

    const syncConcerns = (rows, preserveSelection = true) => {
        setConcerns(rows);
        setActiveConcernId((current) => {
            if (requestedConcernId > 0 && rows.some((item) => Number(item.id) === requestedConcernId)) {
                return requestedConcernId;
            }

            if (preserveSelection && current && rows.some((item) => item.id === current)) {
                return current;
            }

            return rows[0]?.id ?? null;
        });
    };

    const loadConcerns = async ({ silent = false, preserveSelection = true } = {}) => {
        try {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const res = await supportService.getConcerns({ per_page: 100 });
            const rows = res.data?.data?.data || [];
            syncConcerns(rows, preserveSelection);
        } catch (error) {
            const errorMessage = error?.response?.data?.message || 'Failed to load your support tickets.';
            setFeedback({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadConcerns({ preserveSelection: false });
    }, [requestedConcernId]);

    const activeConcern = useMemo(
        () => concerns.find((item) => item.id === activeConcernId) || null,
        [concerns, activeConcernId]
    );

    const stats = useMemo(() => ({
        total: concerns.length,
        waiting: concerns.filter((item) => item.status === 'pending').length,
        answered: concerns.filter((item) => Boolean(String(item.admin_reply || '').trim())).length,
        resolved: concerns.filter((item) => item.status === 'resolved').length,
    }), [concerns]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmedSubject = subject.trim();
        const trimmedMessage = message.trim();

        if (!trimmedSubject || !trimmedMessage) {
            setFeedback({ type: 'error', text: 'Please add both a subject and a message.' });
            return;
        }

        try {
            setSubmitting(true);
            const res = await supportService.submitConcern({
                subject: trimmedSubject,
                message: trimmedMessage,
                name: user?.name,
                email: user?.email,
            });

            const nextConcern = res.data?.data;
            const nextRows = nextConcern ? [nextConcern, ...concerns] : concerns;
            syncConcerns(nextRows, false);
            if (nextConcern?.id) {
                setActiveConcernId(nextConcern.id);
            }
            setSubject('');
            setMessage('');
            setFeedback({ type: 'success', text: 'Your concern has been sent to the admin team.' });
        } catch (error) {
            const errorMessage = error?.response?.data?.message || 'Failed to send your concern right now.';
            setFeedback({ type: 'error', text: errorMessage });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <section
                style={{
                    borderRadius: '24px',
                    border: '1px solid #dbe1ea',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #ea580c 170%)',
                    color: '#ffffff',
                    padding: '24px',
                    boxShadow: '0 20px 44px rgba(15, 23, 42, 0.22)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ maxWidth: '720px' }}>
                        <p style={{ margin: 0, fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, color: '#fdba74' }}>
                            Customer Support
                        </p>
                        <h1 style={{ margin: '10px 0 10px', fontSize: '34px', lineHeight: 1.05, fontWeight: 900, letterSpacing: '-0.03em' }}>
                            Talk to the admin team from your dashboard.
                        </h1>
                        <p style={{ margin: 0, color: '#dbeafe', lineHeight: 1.7, maxWidth: '62ch' }}>
                            Send product questions, order concerns, or account issues here. When the admin replies, the answer will appear in this support inbox.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadConcerns({ silent: true })}
                        disabled={refreshing}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            minHeight: '44px',
                            borderRadius: '999px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#ffffff',
                            padding: '0 16px',
                            fontWeight: 800,
                            cursor: refreshing ? 'wait' : 'pointer',
                        }}
                    >
                        <RefreshCw size={16} style={{ opacity: refreshing ? 0.65 : 1 }} />
                        {refreshing ? 'Refreshing...' : 'Refresh inbox'}
                    </button>
                </div>

                <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <SupportStat icon={<MessageSquare size={18} />} label="Total tickets" value={stats.total} />
                    <SupportStat icon={<Clock3 size={18} />} label="Waiting" value={stats.waiting} />
                    <SupportStat icon={<LifeBuoy size={18} />} label="Answered" value={stats.answered} />
                    <SupportStat icon={<CheckCircle2 size={18} />} label="Resolved" value={stats.resolved} />
                </div>
            </section>

            {feedback.text ? (
                <div
                    style={{
                        borderRadius: '14px',
                        border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fecaca'}`,
                        background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        color: feedback.type === 'success' ? '#166534' : '#991b1b',
                        padding: '14px 16px',
                        fontWeight: 700,
                    }}
                >
                    {feedback.text}
                </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', alignItems: 'start' }}>
                <section
                    style={{
                        borderRadius: '20px',
                        border: '1px solid #dbe1ea',
                        background: '#ffffff',
                        padding: '18px',
                        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
                    }}
                >
                    <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Send a new concern</h2>
                        <p style={{ margin: '6px 0 0', color: '#64748b', lineHeight: 1.6 }}>
                            Use one clear subject for each issue so the admin can respond faster.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
                        <div>
                            <label htmlFor="support-subject" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 800, fontSize: '13px' }}>
                                Subject
                            </label>
                            <input
                                id="support-subject"
                                type="text"
                                value={subject}
                                onChange={(event) => setSubject(event.target.value)}
                                placeholder="Example: Order update for my brake system"
                                style={{
                                    width: '100%',
                                    minHeight: '46px',
                                    borderRadius: '12px',
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    padding: '0 14px',
                                    color: '#0f172a',
                                }}
                            />
                        </div>

                        <div>
                            <label htmlFor="support-message" style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 800, fontSize: '13px' }}>
                                Message
                            </label>
                            <textarea
                                id="support-message"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder="Tell the admin what happened, what order or product is involved, and what help you need."
                                style={{
                                    width: '100%',
                                    minHeight: '148px',
                                    borderRadius: '14px',
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    padding: '14px',
                                    color: '#0f172a',
                                    resize: 'vertical',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    minHeight: '48px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(180deg, #fb923c 0%, #f97316 100%)',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    padding: '0 18px',
                                    cursor: submitting ? 'wait' : 'pointer',
                                    boxShadow: '0 10px 22px rgba(249, 115, 22, 0.24)',
                                }}
                            >
                                <Send size={16} />
                                {submitting ? 'Sending...' : 'Send to admin'}
                            </button>
                            <span style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
                                Signed in as <strong style={{ color: '#0f172a' }}>{user?.email || 'customer'}</strong>
                            </span>
                        </div>
                    </form>

                    <div style={{ marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>Recent tickets</h3>
                        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
                            Open a ticket to review the full conversation and any admin reply.
                        </p>

                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                            {loading ? (
                                <PageSkeleton variant="list" label="Loading your support inbox" />
                            ) : concerns.length === 0 ? (
                                <div style={{ borderRadius: '14px', border: '1px dashed #cbd5e1', background: '#f8fafc', padding: '18px', color: '#64748b', lineHeight: 1.6 }}>
                                    You have not opened any tickets yet. Send your first concern above and the admin will be able to reply here.
                                </div>
                            ) : concerns.map((concern) => {
                                const statusMeta = STATUS_META[concern.status] || STATUS_META.pending;
                                const isActive = concern.id === activeConcernId;
                                const hasReply = Boolean(String(concern.admin_reply || '').trim());

                                return (
                                    <button
                                        key={concern.id}
                                        type="button"
                                        onClick={() => setActiveConcernId(concern.id)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            borderRadius: '16px',
                                            border: `1px solid ${isActive ? '#fb923c' : '#e2e8f0'}`,
                                            background: isActive ? '#fff7ed' : '#ffffff',
                                            padding: '14px',
                                            cursor: 'pointer',
                                            boxShadow: isActive ? '0 10px 22px rgba(249, 115, 22, 0.12)' : 'none',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                                            <div>
                                                <strong style={{ display: 'block', color: '#0f172a', fontSize: '15px' }}>{concern.subject || 'Support concern'}</strong>
                                                <span style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '12px' }}>
                                                    Ticket #{String(concern.id).padStart(4, '0')} • {formatDate(concern.created_at)}
                                                </span>
                                            </div>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '999px',
                                                    padding: '6px 10px',
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                    background: statusMeta.chipBackground,
                                                    color: statusMeta.chipColor,
                                                    border: `1px solid ${statusMeta.borderColor}`,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {statusMeta.label}
                                            </span>
                                        </div>
                                        <p style={{ margin: '10px 0 0', color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                                            {String(concern.message || '').slice(0, 120)}
                                            {String(concern.message || '').length > 120 ? '...' : ''}
                                        </p>
                                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    borderRadius: '999px',
                                                    padding: '5px 9px',
                                                    background: hasReply ? '#ecfdf5' : '#eff6ff',
                                                    color: hasReply ? '#166534' : '#1d4ed8',
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                }}
                                            >
                                                {hasReply ? 'Admin replied' : 'Waiting for reply'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section
                    style={{
                        borderRadius: '20px',
                        border: '1px solid #dbe1ea',
                        background: '#ffffff',
                        padding: '18px',
                        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
                        minHeight: '100%',
                    }}
                >
                    {activeConcern ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f97316' }}>
                                        Ticket #{String(activeConcern.id).padStart(4, '0')}
                                    </p>
                                    <h2 style={{ margin: '8px 0 6px', fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>
                                        {activeConcern.subject || 'Support concern'}
                                    </h2>
                                    <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
                                        Sent on {formatDate(activeConcern.created_at)}
                                    </p>
                                </div>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '999px',
                                        padding: '7px 12px',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        background: (STATUS_META[activeConcern.status] || STATUS_META.pending).chipBackground,
                                        color: (STATUS_META[activeConcern.status] || STATUS_META.pending).chipColor,
                                        border: `1px solid ${(STATUS_META[activeConcern.status] || STATUS_META.pending).borderColor}`,
                                    }}
                                >
                                    {(STATUS_META[activeConcern.status] || STATUS_META.pending).label}
                                </span>
                            </div>

                            <div style={{ marginTop: '18px', display: 'grid', gap: '14px' }}>
                                <article style={{ borderRadius: '18px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                        <strong style={{ color: '#0f172a' }}>Your message</strong>
                                        <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 700 }}>{user?.name || activeConcern.name || 'Customer'}</span>
                                    </div>
                                    <p style={{ margin: 0, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                                        {activeConcern.message || 'No message found.'}
                                    </p>
                                </article>

                                <article
                                    style={{
                                        borderRadius: '18px',
                                        border: `1px solid ${activeConcern.admin_reply ? '#bfdbfe' : '#e2e8f0'}`,
                                        background: activeConcern.admin_reply ? '#eff6ff' : '#ffffff',
                                        padding: '16px',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                        <strong style={{ color: '#0f172a' }}>Admin reply</strong>
                                        <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
                                            {activeConcern.replied_at ? `Updated ${formatDate(activeConcern.replied_at)}` : 'No reply yet'}
                                        </span>
                                    </div>

                                    {activeConcern.admin_reply ? (
                                        <p style={{ margin: 0, color: '#1e3a8a', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                                            {activeConcern.admin_reply}
                                        </p>
                                    ) : (
                                        <div style={{ color: '#64748b', lineHeight: 1.7 }}>
                                            The admin has not answered this ticket yet. You can refresh the inbox any time to check for updates.
                                        </div>
                                    )}
                                </article>
                            </div>
                        </>
                    ) : (
                        <div
                            style={{
                                minHeight: '320px',
                                borderRadius: '18px',
                                border: '1px dashed #cbd5e1',
                                background: '#f8fafc',
                                display: 'grid',
                                placeItems: 'center',
                                padding: '28px',
                                textAlign: 'center',
                            }}
                        >
                            <div>
                                <LifeBuoy size={34} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>No ticket selected</h2>
                                <p style={{ margin: '8px auto 0', maxWidth: '42ch', color: '#64748b', lineHeight: 1.7 }}>
                                    Open an existing ticket from the left side, or send your first concern so the admin team can reply here.
                                </p>
                                <Link
                                    to="/dashboard/orders"
                                    style={{
                                        marginTop: '14px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '42px',
                                        padding: '0 16px',
                                        borderRadius: '999px',
                                        border: '1px solid #cbd5e1',
                                        textDecoration: 'none',
                                        color: '#334155',
                                        fontWeight: 800,
                                        background: '#ffffff',
                                    }}
                                >
                                    View my orders
                                </Link>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function SupportStat({ icon, label, value }) {
    return (
        <div
            style={{
                borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.08)',
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                alignItems: 'center',
            }}
        >
            <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#cbd5e1', fontWeight: 700 }}>
                    {label}
                </div>
                <div style={{ marginTop: '4px', fontSize: '24px', fontWeight: 900 }}>{value}</div>
            </div>
            <div
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.12)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#ffffff',
                }}
            >
                {icon}
            </div>
        </div>
    );
}
