import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquareText, Package, Send, UserRound } from 'lucide-react';
import messageService from '../../services/messageService';
import productService from '../../services/productService';
import { useAuth } from '../../context/AuthContext';

const getErrorMessage = (error) => error?.response?.data?.message || 'Messages could not be loaded. Check your connection and try again.';

const getOtherParticipant = (conversation, userId) => {
    const first = conversation?.participant_one;
    const second = conversation?.participant_two;
    return Number(first?.id) === Number(userId) ? second : first;
};

const toDateLabel = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-PH', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
};

function MessagesSkeleton() {
    return (
        <div className="messages-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
        </div>
    );
}

export default function DashboardMessages() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [conversations, setConversations] = useState([]);
    const [conversationTotal, setConversationTotal] = useState(0);
    const [conversationPage, setConversationPage] = useState(1);
    const [conversationLastPage, setConversationLastPage] = useState(1);
    const [activeConversationId, setActiveConversationId] = useState(searchParams.get('conversation') || '');
    const [activeConversation, setActiveConversation] = useState(null);
    const [pendingProduct, setPendingProduct] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [listLoading, setListLoading] = useState(true);
    const [threadLoading, setThreadLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [listError, setListError] = useState('');
    const [isCompactThreadOpen, setCompactThreadOpen] = useState(Boolean(searchParams.get('conversation')));
    const endOfThreadRef = useRef(null);

    const loadConversations = useCallback(async () => {
        setListError('');
        try {
            const response = await messageService.getConversations({ params: { page: conversationPage } });
            const paginator = response?.data?.data;
            setConversations(Array.isArray(paginator?.data) ? paginator.data : []);
            setConversationTotal(Number(paginator?.total || 0));
            setConversationLastPage(Number(paginator?.last_page || 1));
            const resolvedPage = Math.min(Number(paginator?.current_page || conversationPage), Number(paginator?.last_page || 1));
            if (resolvedPage !== conversationPage) setConversationPage(resolvedPage);
        } catch (loadError) {
            setListError(getErrorMessage(loadError));
        } finally {
            setListLoading(false);
        }
    }, [conversationPage]);

    const loadConversation = useCallback(async (conversationId) => {
        if (!conversationId) return;
        setThreadLoading(true);
        setError('');
        try {
            const response = await messageService.getConversation(conversationId);
            const payload = response?.data?.data || {};
            setActiveConversation(payload.conversation || null);
            const rows = payload.messages?.data || payload.messages || [];
            setMessages(Array.isArray(rows) ? rows : []);
            await loadConversations();
        } catch (loadError) {
            setActiveConversation(null);
            setMessages([]);
            setError(getErrorMessage(loadError));
        } finally {
            setThreadLoading(false);
        }
    }, [loadConversations]);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        const nextConversationId = searchParams.get('conversation') || '';
        const productId = searchParams.get('product_id') || '';
        setActiveConversationId(nextConversationId);
        setCompactThreadOpen(Boolean(nextConversationId || productId));

        if (productId && !nextConversationId) {
            productService.getById(productId)
                .then((response) => setPendingProduct(response?.data?.data || null))
                .catch(() => setPendingProduct(null));
        } else {
            setPendingProduct(null);
        }
    }, [location.search, searchParams]);

    useEffect(() => {
        setActiveConversation(null);
        setMessages([]);
        if (activeConversationId) loadConversation(activeConversationId);
    }, [activeConversationId, loadConversation]);

    useEffect(() => {
        if (!activeConversationId) return undefined;
        const timer = window.setInterval(() => loadConversation(activeConversationId), 15000);
        return () => window.clearInterval(timer);
    }, [activeConversationId, loadConversation]);

    useEffect(() => {
        endOfThreadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, threadLoading]);

    const selectedSummary = useMemo(() => (
        conversations.find((conversation) => String(conversation.id) === String(activeConversationId)) || activeConversation
    ), [activeConversation, activeConversationId, conversations]);
    const otherParticipant = getOtherParticipant(activeConversation || selectedSummary, user?.id);

    const openConversation = (conversationId) => {
        setActiveConversationId(String(conversationId));
        setCompactThreadOpen(true);
        setDraft('');
        setError('');
        navigate(`/dashboard/messages?conversation=${encodeURIComponent(conversationId)}`);
    };

    const handleSend = async (event) => {
        event.preventDefault();
        const body = draft.trim();
        if (!body || sending) return;

        const optimisticId = `local-${Date.now()}`;
        const optimisticMessage = {
            id: optimisticId,
            body,
            sender_id: user?.id,
            created_at: new Date().toISOString(),
            sending: true,
        };
        setMessages((current) => [...current, optimisticMessage]);
        setDraft('');
        setSending(true);
        setError('');

        try {
            let response;
            if (activeConversationId) {
                response = await messageService.reply(activeConversationId, body);
            } else if (pendingProduct?.id) {
                response = await messageService.startConversation(pendingProduct.id, body);
            } else {
                throw new Error('Open a seller listing to start a conversation.');
            }

            const sentMessage = response?.data?.data?.message || response?.data?.data;
            setMessages((current) => current.map((message) => (
                message.id === optimisticId ? { ...sentMessage, sending: false } : message
            )));

            if (!activeConversationId) {
                const conversationId = response?.data?.data?.conversation?.id;
                if (conversationId) {
                    setActiveConversationId(String(conversationId));
                    setConversationPage(1);
                    navigate(`/dashboard/messages?conversation=${encodeURIComponent(conversationId)}`, { replace: true });
                }
            }
            await loadConversations();
        } catch (sendError) {
            setMessages((current) => current.filter((message) => message.id !== optimisticId));
            setDraft(body);
            setError(sendError?.response?.data?.message || sendError?.message || 'Your message was not sent. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const threadTitle = pendingProduct?.name || activeConversation?.product?.name || 'Seller conversation';

    return (
        <section className={`dashboard-messages${isCompactThreadOpen ? ' is-thread-open' : ''}`} aria-labelledby="messages-title">
            <div className="dashboard-messages__heading">
                <div>
                    <p className="dashboard-messages__eyebrow">Marketplace inbox</p>
                    <h1 id="messages-title">Messages</h1>
                    <p>Ask a seller about a listing and keep the conversation with the part.</p>
                </div>
            </div>

            <div className="dashboard-messages__workspace">
                <aside className="dashboard-messages__inbox" aria-label="Conversations">
                    <div className="dashboard-messages__inbox-title">
                        <strong>Your conversations</strong>
                        <span>{conversationTotal}</span>
                    </div>
                    {listLoading ? <MessagesSkeleton /> : null}
                    {listError ? (
                        <div className="dashboard-messages__inline-error" role="alert">
                            <p>{listError}</p>
                            <button type="button" onClick={loadConversations}>Try again</button>
                        </div>
                    ) : null}
                    {!listLoading && !listError && conversations.length === 0 ? (
                        <div className="dashboard-messages__inbox-empty">
                            <MessageSquareText size={24} />
                            <strong>No conversations yet</strong>
                            <span>Open an approved seller listing and choose Message Seller to start one.</span>
                            <Link to="/products">Browse parts</Link>
                        </div>
                    ) : null}
                    <div className="dashboard-messages__conversation-list">
                        {conversations.map((conversation) => {
                            const person = getOtherParticipant(conversation, user?.id);
                            const latest = conversation.latest_message;
                            return (
                                <button
                                    type="button"
                                    key={conversation.id}
                                    className={`dashboard-messages__conversation${String(conversation.id) === String(activeConversationId) ? ' is-active' : ''}`}
                                    onClick={() => openConversation(conversation.id)}
                                >
                                    <span className="dashboard-messages__avatar"><UserRound size={18} /></span>
                                    <span className="dashboard-messages__conversation-copy">
                                        <span className="dashboard-messages__conversation-topline">
                                            <strong>{person?.name || 'CarVex member'}</strong>
                                            <time>{toDateLabel(latest?.created_at || conversation.last_message_at)}</time>
                                        </span>
                                        <span className="dashboard-messages__product-label">{conversation.product?.name || 'Marketplace message'}</span>
                                        <span className="dashboard-messages__preview">{latest?.body || 'Start the conversation'}</span>
                                    </span>
                                    {Number(conversation.unread_count) > 0 ? <span className="dashboard-messages__unread" aria-label={`${conversation.unread_count} unread`} /> : null}
                                </button>
                            );
                        })}
                    </div>
                    {conversationLastPage > 1 ? (
                        <div className="dashboard-messages__pagination" aria-label="Conversation pages">
                            <button type="button" onClick={() => setConversationPage((page) => Math.max(1, page - 1))} disabled={conversationPage <= 1}>Previous</button>
                            <span>Page {conversationPage} of {conversationLastPage}</span>
                            <button type="button" onClick={() => setConversationPage((page) => Math.min(conversationLastPage, page + 1))} disabled={conversationPage >= conversationLastPage}>Next</button>
                        </div>
                    ) : null}
                </aside>

                <div className="dashboard-messages__thread">
                    {(activeConversation || pendingProduct) ? (
                        <>
                            <header className="dashboard-messages__thread-header">
                                <button type="button" className="dashboard-messages__back" onClick={() => setCompactThreadOpen(false)} aria-label="Back to conversations">
                                    <ArrowLeft size={18} />
                                </button>
                                <span className="dashboard-messages__avatar"><UserRound size={18} /></span>
                                <div className="dashboard-messages__thread-person">
                                    <strong>{otherParticipant?.name || 'Seller'}</strong>
                                    <span><Package size={13} /> {threadTitle}</span>
                                </div>
                            </header>

                            {error ? <div className="dashboard-messages__thread-error" role="alert">{error}</div> : null}
                            <div className="dashboard-messages__body" aria-live="polite" aria-relevant="additions text">
                                {threadLoading ? <MessagesSkeleton /> : null}
                                {!threadLoading && messages.length === 0 ? (
                                    <div className="dashboard-messages__thread-empty">
                                        <MessageSquareText size={26} />
                                        <strong>Start with a clear question</strong>
                                        <span>Ask about fitment, condition, stock, or another listing detail.</span>
                                    </div>
                                ) : null}
                                {messages.map((message) => {
                                    const isOwn = Number(message.sender_id) === Number(user?.id);
                                    return (
                                        <article key={message.id} className={`dashboard-message${isOwn ? ' is-own' : ''}`}>
                                            <p>{message.body}</p>
                                            <time>{message.sending ? 'Sending…' : toDateLabel(message.created_at)}</time>
                                        </article>
                                    );
                                })}
                                <div ref={endOfThreadRef} />
                            </div>
                            <form className="dashboard-messages__composer" onSubmit={handleSend}>
                                <label className="sr-only" htmlFor="message-composer">Write a message</label>
                                <textarea
                                    id="message-composer"
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    placeholder="Ask the seller a question…"
                                    rows="2"
                                    maxLength="4000"
                                    disabled={sending}
                                />
                                <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message">
                                    <Send size={17} /> <span>{sending ? 'Sending' : 'Send'}</span>
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="dashboard-messages__select-state">
                            <span><MessageSquareText size={26} /></span>
                            <h2>Select a conversation</h2>
                            <p>Choose a message on the left, or start from an approved seller listing.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
