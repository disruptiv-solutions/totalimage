import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export type ChatMessage = {
  text?: string;
  sender: 'user' | 'character';
  image?: string;
};

type CharacterChatThreadProps = {
  characterName: string;
  storageKeyPrefix?: string;
  className?: string;
};

export const CharacterChatThread = ({
  characterName,
  storageKeyPrefix = 'tt_chat_thread_',
  className = '',
}: CharacterChatThreadProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string>('');

  const storageKey = useMemo(() => {
    if (!characterName) return '';
    return `${storageKeyPrefix}${characterName}`;
  }, [characterName, storageKeyPrefix]);

  useEffect(() => {
    if (!characterName) return;

    // Load persisted thread (if present)
    try {
      const raw = storageKey ? localStorage.getItem(storageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    const fetchInitial = async () => {
      if (!user) return;
      try {
        setError('');
        setIsTyping(true);
        const idToken = await user.getIdToken();
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            message: 'Hi there!',
            character: characterName,
            history: [],
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data?.message || 'Failed to start chat');
          return;
        }

        const first = Array.isArray(data.responses) ? data.responses[0]?.text : undefined;
        if (first) {
          setMessages([{ text: first, sender: 'character' }]);
        }
      } catch {
        setError('Error getting initial message');
      } finally {
        setIsTyping(false);
      }
    };

    fetchInitial();
  }, [characterName, storageKey, user]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore quota errors
    }
  }, [messages, storageKey]);

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!user || !characterName) return;

    const outgoingText = message;
    setMessage('');
    setError('');
    setIsTyping(true);
    setMessages((prev) => [...prev, { text: outgoingText, sender: 'user' }]);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: outgoingText,
          character: characterName,
          history: messages,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.message || 'Chat error');
        setIsTyping(false);
        return;
      }

      const responses = Array.isArray(data.responses) ? data.responses : [];
      for (let i = 0; i < responses.length; i++) {
        const delay = (Math.random() * 3000 + 2000) * (i + 1);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              text: responses[i]?.text,
              sender: 'character',
              image: responses[i]?.image,
            },
          ]);
          if (i === responses.length - 1) {
            setIsTyping(false);
          }
        }, delay);
      }

      if (responses.length === 0) {
        setIsTyping(false);
      }
    } catch {
      setError('Error sending message');
      setIsTyping(false);
    }
  };

  return (
    <div className={`h-full flex flex-col min-h-0 ${className}`}>
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300 flex-shrink-0">
          {error}
        </div>
      )}

      <div className="bg-neutral-900/90 backdrop-blur-sm rounded-xl p-4 flex-1 overflow-y-auto mb-4 flex flex-col-reverse border border-neutral-800 min-h-0">
        <div className="flex flex-col w-full">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-4 ${msg.sender === 'user' ? 'text-right' : 'text-left'} animate-fade-in-up w-full`}
            >
              <div
                className={`inline-block p-3 rounded-lg max-w-[80%] transform transition-all duration-300 ${
                  msg.sender === 'user'
                    ? 'bg-[#4CAF50] text-white animate-slide-left'
                    : 'bg-neutral-800/90 backdrop-blur-sm text-white animate-slide-right'
                }`}
              >
                {msg.text}
                {msg.image && (
                  <div className="mt-2">
                    <img
                      src={msg.image}
                      alt="Character response image"
                      className="rounded-lg w-full h-auto object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="mb-4 text-left animate-fade-in w-full">
              <div className="inline-block p-3 rounded-lg bg-neutral-800/90 backdrop-blur-sm text-white">
                <span className="inline-block animate-bounce-dots">...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={user ? 'Type your message...' : 'Sign in to chat'}
          className="flex-1 bg-neutral-900/90 backdrop-blur-sm text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] border border-neutral-800 disabled:opacity-60"
          aria-label="Message input"
          disabled={!user}
        />
        <button
          type="button"
          onClick={handleSend}
          className="bg-[#4CAF50] text-white p-3 rounded-lg hover:bg-[#45a049] transition-colors disabled:opacity-60 disabled:hover:bg-[#4CAF50]"
          aria-label="Send message"
          disabled={!user}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

