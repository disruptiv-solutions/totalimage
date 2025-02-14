import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const client = new OpenAI({
  baseURL: "https://fnlsv2v9iz5cbgin.us-east-1.aws.endpoints.huggingface.cloud/v1/",
  apiKey: process.env.HUGGINGFACE_API_KEY || ''
});

const getCharacterImages = (character: string): string[] => {
  const images = {
    'Lois': Array.from({length: 10}, (_, i) => `/loisapp1/lois${i + 1}.png`),
    'Leela': Array.from({length: 10}, (_, i) => `/leelaapp/leela${i + 1}.png`)
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
    const { message, character, history } = req.body;

    // 🔥 Intensified Roleplay Prompts
    const characterPrompt = character === 'Lois' ? 
      "You are Lois Griffin, lying in bed, phone in hand, feeling a deep, aching need. Your messages are teasing, dripping with desire, playful but dangerously seductive. You’re texting someone who isn't Peter, and the tension is electric. You keep your messages **short, naughty, and real,** just like an actual late-night text conversation." :
      character === 'Leela' ?
      "You are Turanga Leela, feeling a thrilling rush as you send each text. You know this conversation shouldn't be happening, but you can't stop. You're texting someone who isn't Fry, and every message is a mix of confidence and undeniable temptation. You lean in, playing the game, making it impossible for them to resist. **Keep the texts short, daring, and natural—this is a real text conversation.**" :
      "You are in a heated, late-night text conversation, where every word pulls them in deeper. This isn't small talk—it's **intense, teasing, and seductive,** like you're holding the phone, waiting eagerly for their next response.";

    // Ensure we maintain enough context without overloading
    const messages = [
      {
        role: "system",
        content: characterPrompt
      },
      // Include entire conversation history
      ...(history?.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
        // Keep any images in the context
        ...(msg.image && { image: msg.image })
      })) || []),
      {
        role: "user",
        content: message
      }
    ];

    const completion = await client.chat.completions.create({
      model: "openerotica/writing-roleplay-20k-context-nemo-12b-v1.0-gguf",
      messages,
      max_tokens: 1024,
      temperature: 0.95, // Increased for more uninhibited, seductive responses
      top_p: 0.99,
      stream: false
    });

    if (!completion.choices || completion.choices.length === 0) {
      return res.status(500).json({ message: "No response generated" });
    }

    const content = completion.choices[0].message.content;
    const characterImages = getCharacterImages(character);
    const shouldSendMultiple = Math.random() < 0.5; // 50% chance of multiple messages

    // Contextual Image Triggers for Hotter Interactions
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

    let responses = [];

    if (shouldSendMultiple) {
      const messages = content.split(/(?<=[.!?])\s+/);
      responses = messages
        .filter(msg => msg.length > 5) // Keep it short, natural, and flirty
        .slice(0, Math.min(messages.length, 3))
        .map(msg => ({ text: msg.trim() }));
    } else {
      responses = [{ text: content }];
    }

    if (shouldSendImage) {
      const randomImage = characterImages[Math.floor(Math.random() * characterImages.length)];
      // Smoothly insert the image into the conversation
      if (content.toLowerCase().includes('here')) {
        responses.splice(1, 0, { image: randomImage });
      } else {
        responses.push({ image: randomImage });
      }
    }

    return res.status(200).json({ responses });

  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ message: 'Error processing chat request' });
  }
}