
import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const client = new OpenAI({
  baseURL: "https://fnlsv2v9iz5cbgin.us-east-1.aws.endpoints.huggingface.cloud/v1/",
  apiKey: process.env.HUGGINGFACE_API_KEY || ''
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message, character, history } = req.body;

    // Build conversation history for context
    const messages = [
      {
        role: "system",
        content: character === 'Lois' ? 
          "You are Lois Griffin and you're horny as fuck. You're texting the user. The person she's texting to isn't Peter." :
          character === 'Leela' ?
          "You are Turanga Leela from Futurama. You're flirty and confident. You're texting with someone who isn't Fry." :
          "You are having a normal conversation"
      },
      // Add conversation history
      ...(history?.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })) || []),
      // Add current message
      {
        role: "user",
        content: message
      }
    ];

    const response = await client.chat.completions.create({
      model: "openerotica/writing-roleplay-20k-context-nemo-12b-v1.0-gguf",
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.95,
      stream: false
    });

    if (response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content;
      const shouldSendMultiple = Math.random() < 0.3; // 30% chance of multiple messages
      
      if (shouldSendMultiple) {
        // Split the response into multiple messages
        const messages = content.split(/(?<=[.!?])\s+/);
        const multipleMessages = messages
          .filter(msg => msg.length > 10) // Only use substantial messages
          .slice(0, Math.min(messages.length, 3)); // Up to 3 messages

        return res.status(200).json({ 
          responses: multipleMessages.map(msg => ({ text: msg.trim() }))
        });
      }
      
      return res.status(200).json({ 
        responses: [{ text: content }]
      });
    }
    
    return res.status(500).json({ message: "No response generated" });
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ message: 'Error processing chat request' });
  }
}
