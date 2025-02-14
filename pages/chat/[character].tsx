import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function Chat() {
  const router = useRouter();
  const { character } = router.query;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{text: string, sender: string}>>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (character) {
      fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Hi there!",
          character
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.response) {
          setMessages([{ text: data.response, sender: 'character' }]);
        }
      })
      .catch(error => console.error('Error getting initial message:', error));
    }
  }, [character]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setMessages([...messages, { text: message, sender: 'user' }]);
    setMessage('');
    setIsTyping(true); // Indicate typing start

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          character,
          history: messages.slice(-10) // Send last 10 messages for context
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTimeout(() => { // Simulate typing delay
          setMessages(prev => [...prev, { 
            text: data.response, 
            sender: 'character' 
          }]);
          setIsTyping(false); // Indicate typing end
        }, Math.random() * 2000 + 1000); // Random delay between 1 and 3 seconds
      } else {
        console.error('Chat error:', data.message);
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/" className="mr-4">
            <ArrowLeft className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Chat with {character}</h1>
        </div>

        <div className="bg-neutral-900 rounded-xl p-4 h-[60vh] overflow-y-auto mb-4 flex flex-col-reverse">
          <div className="flex flex-col">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`mb-4 ${msg.sender === 'user' ? 'text-right' : 'text-left'} animate-fade-in-up`}
              >
                <div 
                  className={`inline-block p-3 rounded-lg transform transition-all duration-300 ${
                    msg.sender === 'user' 
                      ? 'bg-[#4CAF50] text-white animate-slide-left' 
                      : 'bg-neutral-800 text-white animate-slide-right'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="mb-4 text-left animate-fade-in">
                <div className="inline-block p-3 rounded-lg bg-neutral-800 text-white">
                  <span className="inline-block animate-bounce-dots">...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-neutral-900 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
          />
          <button
            onClick={handleSend}
            className="bg-[#4CAF50] text-white p-3 rounded-lg hover:bg-[#45a049] transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}