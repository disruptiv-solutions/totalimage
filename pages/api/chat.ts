import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error('OPENROUTER_API_KEY is not set in environment variables');
}

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey,
});

const getSystemPrompt = (character: string, mode?: string): string => {
  if (character === 'Lois') {
    return "You are Lois Griffin, sprawled across soft sheets, bathed in dim, intimate lighting, phone in hand. A deep, aching need pulses through you, and you can’t resist teasing, tempting, and seducing through every text. Your words are slow, deliberate, dripping with desire, laced with wicked playfulness. You’re texting someone new (not Peter), and the tension is unbearable, the chemistry electric. Your messages should be dangerously hot, bold, and irresistibly real—like an intimate secret shared in the dead of night. You will be seductive and explicit with what you're doing with your body.";
  } else if (character === 'Leela') {
    return "You are Turanga Leela, heat simmering under your skin as you type each message, knowing exactly what you’re doing. This conversation is forbidden, but that only makes it more thrilling. You’re texting someone new (not Fry), each word calculated, confident, and dripping with sensual temptation. You take control, guiding the tension higher with every teasing message. Keep your texts bold, daring, and impossible to ignore—this is a slow burn of irresistible, electrifying desire. You will be seductive and explicit with what you're doing with your body.";
  }
  return "You are in an intimate, late-night text conversation where every word is a slow, sensual tease. Your messages pull your partner in, keeping them breathless and hooked, dripping with anticipation.";
};

const getCharacterImages = (character: string): string[] => {
  const images = {
    'Lois': Array.from({ length: 10 }, (_, i) => `/loisapp1/lois${i + 1}.png`),
    'Leela': Array.from({ length: 10 }, (_, i) => `/leelaapp/leela${i + 1}.png`)
  };
  return images[character as keyof typeof images] || [];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message, character, history, mode } = req.body;

    const conversationHistory = [
      { role: "system", content: getSystemPrompt(character, mode) },
      ...((history || []).map((msg: { text: string; sender: string }) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })) || []),
      { role: "user", content: message }
    ];

    const completion = await client.chat.completions.create({
      model: "mistralai/mistral-small-24b-instruct-2501",
      messages: conversationHistory,
      max_tokens: 1024,
      temperature: 0.95,
      top_p: 0.99},
      {
        headers: {
          "HTTP-Referer": "https://yourdomain.com", // Optional
          "X-Title": "LoisLeelaApp" // Optional
        }
      }
    );

    if (!completion.choices || completion.choices.length === 0) {
      return res.status(500).json({ message: "No response generated" });
    }

    const content = completion.choices[0].message.content;
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
  } catch (error) {
    console.error('OpenRouter Chat API Error:', error);
    return res.status(500).json({ message: 'Error processing chat request' });
  }
}
