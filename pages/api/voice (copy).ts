import type { NextApiRequest, NextApiResponse } from 'next';
import { Buffer } from 'buffer';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

type Data = {
  audio?: string;
  contentType?: string;
  ttsText?: string;
  visualContext?: string;
  error?: {
    message: string;
    details?: any;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: { message: 'Method not allowed' }
    });
  }

  try {
    const { audio, character, history } = req.body;
    if (!audio || !character) {
      return res.status(400).json({ 
        error: { message: 'Missing required fields' }
      });
    }

    // Properly handle the input audio data
    const base64Regex = /^data:([^;]+)(?:;codecs=([^;,]+))?;base64,(.+)$/;
    const matches = audio.match(base64Regex);
    if (!matches) {
      console.error('[DEBUG] Invalid audio data format');
      return res.status(400).json({ 
        error: { message: 'Invalid audio data format' }
      });
    }

    const [, mimeType, , base64Data] = matches;
    const audioBuffer = Buffer.from(base64Data, 'base64');

    // Standardize audio format for Whisper API
    const format = {
      ext: 'mp3',
      type: 'audio/mpeg'
    };

    // Prepare Whisper API request
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: `audio.${format.ext}`,
      contentType: format.type,
    });
    formData.append('model', 'whisper-1');

    // Call Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData.getBuffer() as unknown as BodyInit,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('[DEBUG] Whisper API error details:', errorText);
      throw new Error('Transcription failed: ' + errorText);
    }


    const whisperData = await whisperResponse.json();
    const transcribedMessage = whisperData.text;

    // Call chat API
    const protocol = req.headers['x-forwarded-proto'] || 
      (process.env.NODE_ENV === 'development' ? 'http' : 'https');
    const host = req.headers.host;

    const chatRes = await fetch(`${protocol}://${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: transcribedMessage,
        character,
        history,
        mode: "voice"
      }),
    });

    if (!chatRes.ok) {
      throw new Error('Failed to get chat response');
    }

    const chatData = await chatRes.json();
    const aiResponseText = chatData.responses?.find((r: any) => r.text)?.text || '';
    if (!aiResponseText) {
      throw new Error('No response text received');
    }

    // Process visual context
    const contextMatches = aiResponseText.match(/\*([^*]+)\*/g);
    const visualContext = contextMatches 
      ? contextMatches.map(match => match.replace(/\*/g, '').trim()).join(' ')
      : '';
    const ttsText = aiResponseText.replace(/\*[^*]+\*/g, '').trim();

    // Get voice ID
    const voiceId = character.toLowerCase() === 'leela' 
      ? "nU42VjYHsVdnEWnrXcbE" 
      : process.env.ELEVENLABS_VOICE_ID;

    // Call ElevenLabs API
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
        },
        body: JSON.stringify({
          text: ttsText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      throw new Error('Failed to generate voice response');
    }

    // Process audio response
    const arrayBuffer = await ttsResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create proper data URL for audio
    const base64Audio = buffer.toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // Return response
    res.status(200).json({
      audio: audioDataUrl,
      contentType: 'audio/mpeg',
      ttsText,
      visualContext,
    });

  } catch (error) {
    console.error('[DEBUG] Voice API error:', error);
    res.status(500).json({
      error: {
        message: error instanceof Error ? error.message : 'Internal Server Error',
      },
    });
  }
}///