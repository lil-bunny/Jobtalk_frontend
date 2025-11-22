"use client";
import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';

export default function ChatWindow({ resumeText = '', resumeChunks = [], sessionId }) {
  const intro = resumeText
    ? `Your new resume has been uploaded. I parsed ${resumeText.length.toLocaleString()} characters. Ask anything about it.\n\nPreview:\n` + resumeText.slice(0, 400) + (resumeText.length > 400 ? '…' : '')
    : 'Hi! Your chat is now unlocked. Ask anything about your resume.';
  const [messages, setMessages] = useState([
    { id: 'm1', role: 'assistant', content: intro }
  ]);
  const containerRef = useRef(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = async (text) => {
    const userMsg = { id: `u-${Date.now()}` , role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          resumeText,
          resumeChunks,
          sessionId,
          bootstrap: !bootstrapped,
        }),
      });
      const data = await res.json();
      const content = res.ok ? (data?.reply || '(no reply)') : (data?.error || 'Chat error');
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content },
      ]);
      if (!bootstrapped) setBootstrapped(true);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: 'Network error while contacting chat API.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="chat-container">
      <div className="messages" ref={containerRef}>
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {sending && (
          <div className="mt-2 text-sm text-slate-500">Assistant is thinking…</div>
        )}
      </div>
      <div className="message-input">
        <ChatInput onSend={handleSend} />
      </div>
    </section>
  );
}
