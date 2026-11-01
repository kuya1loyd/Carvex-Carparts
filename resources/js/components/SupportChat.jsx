import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, Sparkles } from 'lucide-react';
import supportChatService from '../services/supportChatService';

export default function SupportChat() {
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        const content = draft.trim();
        if (!content || loading) return;

        const nextMessages = [...messages, { role: 'user', content }].slice(-12);
        setMessages(nextMessages);
        setDraft('');
        setError('');
        setLoading(true);

        try {
            const response = await supportChatService.reply(nextMessages);
            const reply = String(response?.data?.reply || '').trim();
            if (!reply) throw new Error('The assistant did not return a reply.');
            setMessages([...nextMessages, { role: 'assistant', content: reply }].slice(-12));
        } catch (requestError) {
            setMessages(messages);
            setDraft(content);
            setError(requestError?.response?.data?.message || 'Chat is temporarily unavailable. Please contact CarVex support.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="support-chat" aria-labelledby="support-chat-title">
            <div className="support-chat__intro">
                <span className="support-chat__icon"><Bot size={20} aria-hidden="true" /></span>
                <div>
                    <p className="support-chat__eyebrow"><Sparkles size={13} aria-hidden="true" /> CarVex assistant</p>
                    <h2 id="support-chat-title">Need a quick answer?</h2>
                    <p>Ask a general parts or website question. For order-specific help, use your support inbox.</p>
                </div>
            </div>

            <div className="support-chat__transcript" role="log" aria-live="polite" aria-relevant="additions text">
                {messages.length === 0 ? (
                    <div className="support-chat__welcome">
                        <strong>What can I help you with?</strong>
                        <span>Ask about part terminology, finding a listing, or how to contact a seller.</span>
                    </div>
                ) : messages.map((message, index) => (
                    <div className={`support-chat__message support-chat__message--${message.role}`} key={`${message.role}-${index}`}>
                        <p>{message.content}</p>
                    </div>
                ))}
                {loading ? <div className="support-chat__typing" aria-label="Assistant is replying"><span /><span /><span /></div> : null}
            </div>

            {error ? (
                <div className="support-chat__error" role="alert">
                    <p>{error}</p>
                    <Link to="/dashboard/support">Open the support inbox</Link>
                </div>
            ) : null}

            <form className="support-chat__form" onSubmit={handleSubmit}>
                <label className="sr-only" htmlFor="support-chat-message">Ask the CarVex assistant</label>
                <textarea
                    id="support-chat-message"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={2000}
                    rows={2}
                    placeholder="Type your question…"
                    disabled={loading}
                />
                <button type="submit" disabled={!draft.trim() || loading} aria-label="Send question">
                    <Send size={17} aria-hidden="true" />
                    <span>{loading ? 'Sending' : 'Ask'}</span>
                </button>
            </form>
            <p className="support-chat__note">The assistant cannot view your orders or confirm live stock and vehicle fitment.</p>
        </section>
    );
}
