"use client";
import { useEffect, useRef, useState } from 'react';

export default function ChatInput({ onSend }) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [text]);

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setIsSending(true);
    try {
      await onSend?.(value);
      setText('');
    } finally {
      setIsSending(false);
    }
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        className="chat-textarea"
        placeholder="Send a message… (Ctrl/Cmd + Enter)"
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button className="button-primary" onClick={submit} disabled={isSending || !text.trim()}>
        Send
      </button>
    </div>
  );
}
