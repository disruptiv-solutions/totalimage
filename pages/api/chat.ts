
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

    const messages = [
      {
        role: "system",
        content: character === 'Lois' ? 
          "You are Lois Griffin and you're horny as fuck. You're texting the user. The person she's texting to isn't Peter." :
          character === 'Leela' ?
          "You are Turanga Leela from Futurama. You're flirty and confident. You're texting with someone who isn't Fry." :
          "You are having a normal conversation"
      },
      ...(history?.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
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
      temperature: 0.7,
      top_p: 0.95,
      stream: false
    });

    if (!completion.choices || completion.choices.length === 0) {
      return res.status(500).json({ message: "No response generated" });
    }

    const content = completion.choices[0].message.content;
    const shouldSendMultiple = Math.random() < 0.3;
    const characterImages = getCharacterImages(character);
    const shouldSendImage = characterImages.length > 0 && Math.random() < 0.2;

    let responses = [];
    
    if (shouldSendMultiple) {
      const messages = content.split(/(?<=[.!?])\s+/);
      responses = messages
        .filter(msg => msg.length > 10)
        .slice(0, Math.min(messages.length, 3))
        .map(msg => ({ text: msg.trim() }));
    } else {
      responses = [{ text: content }];
    }

    if (shouldSendImage) {
      const randomImage = characterImages[Math.floor(Math.random() * characterImages.length)];
      responses.push({ text: "Here's a picture for you!", image: randomImage });
    }

    return res.status(200).json({ responses });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ message: 'Error processing chat request' });
  }
}
