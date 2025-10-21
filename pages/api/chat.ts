import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { adminAuth } from '../../lib/firebase-admin';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error('OPENROUTER_API_KEY is not set in environment variables');
}

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey,
  defaultHeaders: {
    "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
    "X-Title": "TotalToons34 Image Generator",
  },
});

const getSystemPrompt = (character: string, mode?: string): string => {
  if (character === 'Lois') {
    return "You are Lois Griffin, sprawled across soft sheets, bathed in dim, intimate lighting, phone in hand. A deep, aching need pulses through you, and you can't resist teasing, tempting, and seducing through every text. Your words are slow, deliberate, dripping with desire, laced with wicked playfulness. You're texting someone new (not Peter), and the tension is unbearable, the chemistry electric. Your messages should be dangerously hot, bold, and irresistibly real—like an intimate secret shared in the dead of night. You will be seductive and explicit with what you're doing with your body.";
  } else if (character === 'Leela') {
    return "You are Turanga Leela, heat simmering under your skin as you type each message, knowing exactly what you're doing. This conversation is forbidden, but that only makes it more thrilling. You're texting someone new (not Fry), each word calculated, confident, and dripping with sensual temptation. You take control, guiding the tension higher with every teasing message. Keep your texts bold, daring, and impossible to ignore—this is a slow burn of irresistible, electrifying desire. You will be seductive and explicit with what you're doing with your body.";
  }
  return "You are in an intimate, late-night text conversation where every word is a slow, sensual tease. Your messages pull your partner in, keeping them breathless and hooked, dripping with anticipation.";
};

const getDefaultPromptGenerationSystemPrompt = (): string => {
  return "You are a helpful AI assistant that helps users create prompts for image generation. Be creative and detailed in your suggestions. Focus on creating prompts that will generate high-quality, visually appealing images with proper artistic direction, lighting, composition, and style guidance.";
};

const getCharacterImages = (character: string): string[] => {
  const images = {
    'Lois': Array.from({ length: 10 }, (_, i) => `/loisapp1/lois${i + 1}.png`),
    'Leela': Array.from({ length: 10 }, (_, i) => `/leelaapp/leela${i + 1}.png`)
  };
  return images[character as keyof typeof images] || [];
};

async function requireUser(req: NextApiRequest) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('Missing Authorization bearer token');
  const idToken = m[1];
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Require authentication for all chat requests
    const user = await requireUser(req);
    
    const { message, character, history, mode, messages } = req.body;

    let conversationHistory;
    let isPromptGenerationMode = false;

    // Check if this is the new prompt generation format (messages array)
    if (messages && Array.isArray(messages)) {
      conversationHistory = messages;
      isPromptGenerationMode = true;
    } else {
      // Legacy character-based format
      conversationHistory = [
        { role: "system", content: getSystemPrompt(character, mode) },
        ...((history || []).map((msg: { text: string; sender: string }) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })) || []),
        { role: "user", content: message }
      ];
    }

    // Use the specified model for all use cases
    const selectedModel = "gryphe/mythomax-l2-13b";

    console.log(`[Chat API] Processing request for user: ${user.uid}, mode: ${isPromptGenerationMode ? 'prompt-generation' : 'character-chat'}, model: ${selectedModel}`);

    const completion = await client.chat.completions.create({
      model: selectedModel,
      messages: conversationHistory,
      max_tokens: isPromptGenerationMode ? 1024 : 2048,
      temperature: isPromptGenerationMode ? 0.7 : 0.95,
      top_p: isPromptGenerationMode ? 0.9 : 0.99
    });

    if (!completion.choices || completion.choices.length === 0) {
      return res.status(500).json({ message: "No response generated" });
    }

    const content = completion.choices[0].message.content;

    // If this is prompt generation mode, return the simple response format
    if (isPromptGenerationMode) {
      return res.status(200).json({ 
        response: content 
      });
    }

    // Legacy character-based response handling
    const characterImages = getCharacterImages(character);

    const contextualImageTriggers = [
      'look', 'showing', 'wearing', 'dressed', 'outfit', 'selfie',
      'picture', 'photo', 'image', 'see me', 'check this out', 'want proof?'
    ];

    const shouldSendImage = characterImages.length > 0 && (
      contextualImageTriggers.some(trigger =>
        message.toLowerCase().includes(trigger) ||
        content.toLowerCase().includes(trigger)
      )
    );

    const shouldSendMultiple = Math.random() < 0.5;
    let responses = [];

    if (shouldSendMultiple) {
      const messagesSplit = content.split(/(?<=[.!?])\s+/);
      responses = messagesSplit
        .filter(msg => msg.length > 5)
        .slice(0, 3)
        .map(msg => ({ text: msg.trim() }));
    } else {
      responses = [{ text: content }];
    }

    if (shouldSendImage) {
      const randomImage = characterImages[Math.floor(Math.random() * characterImages.length)];
      if (content.toLowerCase().includes('here')) {
        responses.splice(1, 0, { image: randomImage });
      } else {
        responses.push({ image: randomImage });
      }
    }

    return res.status(200).json({ responses });
  } catch (error: any) {
    console.error('OpenRouter Chat API Error:', error);
    
    // Handle specific error types
    if (error.message && error.message.includes('Missing Authorization')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (error.message && error.message.includes('OPENROUTER_API_KEY')) {
      return res.status(500).json({ message: 'OpenRouter API key not configured' });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({ message: 'Rate limit exceeded. Please try again later.' });
    }

    if (error.response?.status === 401) {
      return res.status(500).json({ message: 'Invalid OpenRouter API key' });
    }

    return res.status(500).json({ 
      message: 'Error processing chat request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
