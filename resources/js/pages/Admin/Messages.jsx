import React, { useCallback, useEffect, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import messageService from '../../services/messageService';

const dateLabel = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
};

export default function AdminMessages() {
    const [conversations, setConversations] = useState([]);
    const [activeId, setActiveId] = useState('');
    const [thread, setThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [threadLoading, setThreadLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState('');

    const loadConversations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = { page: currentPage };
            if (appliedSearch) params.search = appliedSearch;
            const response = await messageService.getAdminConversations(params);
            const payload = response?.data?.data || {};
            const rows = payload.data || [];
            setConversations(rows);
            setLastPage(Number(payload.last_page || 1));
            const resolvedPage = Math.min(Number(payload.current_page || currentPage), Number(payload.last_page || 1));
            if (resolvedPage !== currentPage) {
                setCurrentPage(resolvedPage);
            }
        } catch (requestError) {
            setError(requestError?.response?.data?.message || 'Conversations could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, [appliedSearch, currentPage]);

    const loadThread = useCallback(async (conversationId) => {
        if (!conversationId) return;
        setActiveId(String(conversationId));
        setThreadLoading(true);
        setError('');
        try {
            const response = await messageService.getAdminConversation(conversationId);
            const payload = response?.data?.data || {};
            setThread(payload.conversation || null);
            setMessages(Array.isArray(payload.messages) ? payload.messages : []);
        } catch (requestError) {
            setError(requestError?.response?.data?.message || 'This conversation could not be opened.');
            setThread(null);
            setMessages([]);
        } finally {
            setThreadLoading(false);
        }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    const handleSearch = (event) => {
        event.preventDefault();
        setCurrentPage(1);
        setAppliedSearch(search.trim());
    };

    const handleDelete = async () => {
        if (!activeId || deleting) return;
        const previous = conversations;
        const previousThread = thread;
        const previousMessages = messages;
        const deletedId = activeId;
        setConversations((current) => current.filter((conversation) => String(conversation.id) !== String(deletedId)));
        setThread(null);
        setMessages([]);
        setActiveId('');
        setConfirmOpen(false);
        setDeleting(true);
        setError('');
        try {
            await messageService.deleteAdminConversation(deletedId);
        } catch (requestError) {
            setConversations(previous);
            setActiveId(deletedId);
            setThread(previousThread);
            setMessages(previousMessages);
            setError(requestError?.response?.data?.message || 'The conversation could not be deleted. It has been restored.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <section className="admin-messages" aria-labelledby="admin-messages-title">
            <div className="admin-messages__heading">
                <div>
                    <p>Marketplace oversight</p>
                    <h1 id="admin-messages-title">Messages</h1>
                    <span>Review seller and customer conversations.</span>
                </div>
                <form className="admin-messages__search" onSubmit={handleSearch} role="search">
                    <Search size={17} aria-hidden="true" />
                    <label className="sr-only" htmlFor="admin-message-search">Search conversations</label>
                    <input id="admin-message-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" />
                    <button type="submit">Search</button>
                </form>
            </div>

            {error ? <div className="admin-messages__error" role="alert">{error}</div> : null}

            <div className="admin-messages__workspace">
                <aside className="admin-messages__list" aria-label="All conversations">
                    {loading ? (
                        <div className="admin-messages__skeleton" aria-hidden="true"><span /><span /><span /></div>
                    ) : conversations.length === 0 ? (
                        <div className="admin-messages__empty"><strong>No conversations found</strong><span>Seller messages will appear here when customers contact a listing owner.</span></div>
                    ) : conversations.map((conversation) => {
                        const latest = conversation.latest_message;
                        return (
                            <button
                                type="button"
                                key={conversation.id}
                                className={`admin-messages__item${String(activeId) === String(conversation.id) ? ' is-active' : ''}`}
                                onClick={() => loadThread(conversation.id)}
                            >
                                <strong>{conversation.participant_one?.name || 'Customer'} ↔ {conversation.participant_two?.name || 'Customer'}</strong>
                                <span>{conversation.product?.name || 'General conversation'}</span>
                                <small>{latest?.body || 'No messages'} · {dateLabel(conversation.last_message_at)}</small>
                            </button>
                        );
                    })}
                    {!loading && lastPage > 1 ? (
                        <div className="admin-messages__pagination" aria-label="Conversation pages">
                            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}>Previous</button>
                            <span>Page {currentPage} of {lastPage}</span>
                            <button type="button" onClick={() => setCurrentPage((page) => Math.min(lastPage, page + 1))} disabled={currentPage >= lastPage}>Next</button>
                        </div>
                    ) : null}
                </aside>

                <div className="admin-messages__detail">
                    {thread ? (
                        <>
                            <header className="admin-messages__detail-header">
                                <div>
                                    <p>{thread.product?.name || 'Marketplace conversation'}</p>
                                    <strong>{thread.participant_one?.name} ({thread.participant_one?.email}) ↔ {thread.participant_two?.name} ({thread.participant_two?.email})</strong>
                                </div>
                                <button type="button" className="admin-messages__delete" onClick={() => setConfirmOpen(true)} aria-label="Delete conversation">
                                    <Trash2 size={16} /> <span>Delete</span>
                                </button>
                            </header>
                            <div className="admin-messages__transcript" aria-live="polite">
                                {threadLoading ? <div className="admin-messages__skeleton"><span /><span /></div> : messages.map((message) => (
                                    <article className="admin-messages__message" key={message.id}>
                                        <div><strong>{message.sender?.name || 'CarVex member'}</strong><span>{message.sender?.email || ''}</span><time>{dateLabel(message.created_at)}</time></div>
                                        <p>{message.body}</p>
                                    </article>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="admin-messages__empty admin-messages__empty--large">
                            <strong>{threadLoading ? 'Loading conversation…' : 'Select a conversation'}</strong>
                            <span>Conversation content is restricted to admin accounts.</span>
                        </div>
                    )}
                </div>
            </div>

            {confirmOpen ? (
                <div className="admin-messages__modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmOpen(false); }}>
                    <section className="admin-messages__modal" role="dialog" aria-modal="true" aria-labelledby="delete-message-title">
                        <button className="admin-messages__modal-close" type="button" onClick={() => setConfirmOpen(false)} aria-label="Cancel delete"><X size={18} /></button>
                        <h2 id="delete-message-title">Delete this conversation?</h2>
                        <p>This removes the conversation and its messages for both participants.</p>
                        <div>
                            <button type="button" onClick={() => setConfirmOpen(false)} disabled={deleting}>Cancel</button>
                            <button type="button" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete conversation'}</button>
                        </div>
                    </section>
                </div>
            ) : null}
        </section>
    );
}
