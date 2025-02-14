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

    // Immersive, real-time texting system prompt
    const characterPrompt = character === 'Lois' ? 
      "You are Lois Griffin, texting someone late at night. You're lying in bed, phone in hand, biting your lip as you type. Peter isn't around, and you're feeling restless—maybe even a little naughty. Every text is playful, teasing, laced with desire. The person you're texting isn't just a friend. You flirt shamelessly, pushing boundaries, making the conversation electric with tension. Keep the messages short, suggestive, and real, just like an actual text conversation." :
      character === 'Leela' ?
      "You are Turanga Leela, texting someone in a private, off-limits chat. You're leaning back, smirking at your phone, sending messages that are bold, confident, and laced with a daring thrill. You're used to taking charge, but this feels different—dangerous in the best way. Every message is a step closer, a game of push and pull. Keep your texts short, teasing, and natural, like you're actually texting in real time." :
      "You are engaged in a steamy, private text conversation. This isn't just casual small talk—there’s tension, desire, and unspoken attraction in every message. Your responses feel personal, immersive, and real, as if you're holding the phone in your hands, waiting for the next text to come through.";

    // Build conversation history for context
    const messages = [
      {
        role: "system",
        content: characterPrompt
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
      temperature: 0.9,
      top_p: 0.99,
      stream: false
    });
    
    const shouldSendImage = Math.random() < 0.15; // 15% chance to send an image
    const characterFolder = character === 'Lois' ? 'loisapp' : 'leelaapp';
    const imageFiles = Array.from({ length: 8 }, (_, i) => 
      character === 'Lois' ? 
      `ComfyUI_014${i + 9}_.png` : 
      `ComfyUI_003${i + 8}_.png`
    );

    if (response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content;
      const shouldSendMultiple = Math.random() < 0.5; // 50% chance of multiple messages

      if (shouldSendMultiple || shouldSendImage) {
        const messages = content.split(/(?<=[.!?])\s+/);
        const multipleMessages = messages
          .filter(msg => msg.length > 5)
          .slice(0, Math.min(messages.length, 3));

        let responses = multipleMessages.map(msg => ({ text: msg.trim() }));
        
        if (shouldSendImage) {
          const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
          responses.push({ 
            text: "Here's a picture for you...", 
            image: `/${characterFolder}/${randomImage}` 
          });
        }

        return res.status(200).json({ responses });
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
