import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
  throw new Error('HUGGINGFACE_API_KEY is not set in environment variables');
}

const client = new OpenAI({
  baseURL: "https://fnlsv2v9iz5cbgin.us-east-1.aws.endpoints.huggingface.cloud/v1/",
  apiKey: apiKey
});

const getCharacterImages = (character: string): string[] => {
  const images = {
    'Lois': Array.from({ length: 10 }, (_, i) => `/loisapp1/lois${i + 1}.png`),
    'Leela': Array.from({ length: 10 }, (_, i) => `/leelaapp/leela${i + 1}.png`)
  };
  return images[character as keyof typeof images] || [];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { message, character } = req.body;

  if (!message || !character) {
    return res.status(400).json({ message: 'Missing required fields: message and character required' });
  }

  try {
    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: `You are ${character}. Respond in character.`},
        {role: "user", content: message}
      ]
    });

    res.status(200).json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ message: 'Error processing chat request' });
  }
}