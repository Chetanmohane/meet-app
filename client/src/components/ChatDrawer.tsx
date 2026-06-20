import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { ChatMessage } from '../hooks/useWebRTC';

interface ChatDrawerProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

export default function ChatDrawer({ messages, onSendMessage, onClose }: ChatDrawerProps) {
  const [text, setText] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  return (
    <div className="drawer-container">
      <div className="drawer-header">
        <h3>In-call messages</h3>
        <button className="btn-icon-sm" onClick={onClose} title="Close panel">
          <X size={18} />
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary-dark)', fontSize: '14px' }}>
            Messages can only be seen by people in the call and are deleted when the call ends.
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.isLocal ? 'local' : ''}`}>
              {!msg.isLocal && (
                <div className="chat-sender-info">
                  <span className="sender-name">{msg.senderName}</span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
              )}
              <div className="message-text">
                {msg.messageText}
              </div>
              {msg.isLocal && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatBottomRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            placeholder="Send a message to everyone"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
          />
          <button type="submit" className="btn-send-chat" disabled={!text.trim()} title="Send message">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
