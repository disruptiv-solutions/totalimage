import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

// Get list of available images for each character
const getCharacterImages = (character: string): string[] => {
  const folder = character.toLowerCase() + 'app';
  const imagePath = path.join(process.cwd(), folder);
  if (!fs.existsSync(imagePath)) return [];
  return fs.readdirSync(imagePath)
    .filter(file => file.endsWith('.png'))
    .map(file => `/${folder}/${file}`);
};


export default function Chat() {
  const router = useRouter();
  const { character } = router.query;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{text: string, sender: string, image?: string}>>([]);
  const [isTyping, setIsTyping] = useState(false);

  const backgroundImage = character === 'Lois' ? '/loischat.png' : '/leelachat.png';

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
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          character,
          history: messages.slice(-10)
        }),
      });

      const data = await response.json();
      if (response.ok) {
        for (let i = 0; i < data.responses.length; i++) {
          const delay = (Math.random() * 3000 + 2000) * (i + 1);
          setTimeout(() => {
            setMessages(prev => [...prev, {
              text: data.responses[i].text,
              sender: 'character',
              image: data.responses[i].image // Add image to message object
            }]);
            if (i === data.responses.length - 1) {
              setIsTyping(false);
            }
          }, delay);
        }
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
    <div className="min-h-screen bg-black relative">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 blur-md"
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          filter: 'blur(8px)',
          transform: 'scale(1.1)' // Prevents blur from showing edges
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/" className="mr-4">
            <ArrowLeft className="w-6 h-6 text-white hover:text-[#4CAF50] transition-colors" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Chat with {character}</h1>
        </div>

        <div className="bg-neutral-900/90 backdrop-blur-sm rounded-xl p-4 h-[60vh] overflow-y-auto mb-4 flex flex-col-reverse border border-neutral-800">
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
                      : 'bg-neutral-800/90 backdrop-blur-sm text-white animate-slide-right'
                  }`}
                >
                  {msg.text}
                  {msg.image && (
                    <div className="mt-2">
                      <img 
                        src={msg.image} 
                        alt="Character Image"
                        className="rounded-lg max-w-[250px] md:max-w-[300px] w-full h-auto object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="mb-4 text-left animate-fade-in">
                <div className="inline-block p-3 rounded-lg bg-neutral-800/90 backdrop-blur-sm text-white">
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
            className="flex-1 bg-neutral-900/90 backdrop-blur-sm text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] border border-neutral-800"
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