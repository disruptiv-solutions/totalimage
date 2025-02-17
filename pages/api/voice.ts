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

    console.log('[DEBUG] Audio data prefix:', audio.substring(0, 100));

    // Extract base64 data from the audio input
    const matches = audio.match(/^data:([^;]+)(?:;codecs=([^;,]+))?;base64,(.+)$/);
    if (!matches) {
      console.log('[DEBUG] Failed to match audio data format');
      return res.status(400).json({ 
        error: { message: 'Invalid audio data format' }
      });
    }

    const [, mimeType, codec, base64Data] = matches;
    console.log('[DEBUG] Parsed audio data:');
    console.log('- MIME type:', mimeType);
    console.log('- Codec:', codec || 'none specified');
    console.log('- Base64 data length:', base64Data.length);

    const audioBuffer = Buffer.from(base64Data, 'base64');
    console.log('[DEBUG] Audio buffer details:');
    console.log('- Size:', audioBuffer.length, 'bytes');
    console.log('- First 16 bytes:', audioBuffer.slice(0, 16));
    console.log('- First 16 bytes (hex):', audioBuffer.slice(0, 16).toString('hex'));

    // Map MIME types to formats
    const formatMap: Record<string, { ext: string; type: string }> = {
      'audio/webm': { ext: 'webm', type: 'audio/webm' },
      'audio/mp4': { ext: 'mp3', type: 'audio/mpeg' },
      'audio/x-m4a': { ext: 'mp3', type: 'audio/mpeg' },
      'audio/mpeg': { ext: 'mp3', type: 'audio/mpeg' },
      'audio/mp3': { ext: 'mp3', type: 'audio/mpeg' },
      'audio/ogg': { ext: 'ogg', type: 'audio/ogg' },
      'audio/wav': { ext: 'wav', type: 'audio/wav' },
    };

    const format = formatMap[mimeType] || { ext: 'mp3', type: 'audio/mpeg' };
    console.log('[DEBUG] Selected format:', format);

    // Prepare form data for Whisper API call
    const formData = new FormData();
    const filename = `audio.${format.ext}`;
    formData.append('file', audioBuffer, {
      filename,
      contentType: format.type,
    });
    formData.append('model', 'whisper-1');

    const formDataBuffer = formData.getBuffer();
    const formHeaders = formData.getHeaders();

    console.log('[DEBUG] FormData details:');
    console.log('- Filename:', filename);
    console.log('- Content type:', format.type);
    console.log('- Buffer size:', formDataBuffer.length);
    console.log('- Headers:', formHeaders);

    // Call Whisper API to transcribe the audio
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('Missing OpenAI API Key');
    }

    console.log('[DEBUG] Sending request to Whisper API...');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        ...formHeaders,
      },
      body: formDataBuffer as unknown as BodyInit,
    });

    console.log('[DEBUG] Whisper API response status:', whisperResponse.status);
    console.log('[DEBUG] Whisper API response headers:', Object.fromEntries(whisperResponse.headers));

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.json().catch(async () => {
        const text = await whisperResponse.text();
        console.log('[DEBUG] Failed to parse error as JSON:', text);
        return text;
      });
      console.log('[DEBUG] Whisper API error details:', errorData);
      return res.status(400).json({ 
        error: { 
          message: 'Transcription failed',
          details: errorData,
        },
      });
    }

    const whisperData = await whisperResponse.json();
    console.log('[DEBUG] Whisper API success:', whisperData);
    const transcribedMessage = whisperData.text;

    // Call the chat API with the transcribed message
    const protocol =
      req.headers['x-forwarded-proto'] ||
      (process.env.NODE_ENV === 'development' ? 'http' : 'https');
    const host = req.headers.host;
    const chatUrl = `${protocol}://${host}/api/chat`;
    console.log('[DEBUG] Calling chat API at:', chatUrl);

    const chatRes = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: transcribedMessage,
        character,
        history,
      }),
    });

    if (!chatRes.ok) {
      const errorText = await chatRes.text();
      console.error(`[DEBUG] Chat API error (${chatRes.status}):`, errorText);
      throw new Error('Failed to get chat response');
    }

    const chatData = await chatRes.json();
    let aiResponseText =
      chatData.responses && chatData.responses.length > 0
        ? chatData.responses.find((r: any) => r.text)?.text || ''
        : '';

    if (!aiResponseText) {
      throw new Error('Chat API did not return any text');
    }
    console.log('[DEBUG] AI response text:', aiResponseText);

    // Process the AI response text:
    // - Extract text wrapped in asterisks as visual context.
    // - Remove that text from the TTS content.
    let visualContext = '';
    const contextMatches = aiResponseText.match(/\*([^*]+)\*/g);
    if (contextMatches) {
      visualContext = contextMatches.map(match => match.replace(/\*/g, '').trim()).join(' ');
    }
    const ttsText = aiResponseText.replace(/\*[^*]+\*/g, '').trim();
    console.log('[DEBUG] TTS text:', ttsText);
    console.log('[DEBUG] Visual context:', visualContext);

    // --- ElevenLabs TTS API Call ---
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    // Set default voice id (for Lois) from your environment
    let voiceId = process.env.ELEVENLABS_VOICE_ID;
    // If the character is "leela" (case-insensitive), override with the new voice id
    if (typeof character === 'string' && character.toLowerCase() === 'leela') {
      voiceId = "nU42VjYHsVdnEWnrXcbE";
    }
    console.log('[DEBUG] Selected voice id:', voiceId);

    if (!elevenLabsApiKey || !voiceId) {
      throw new Error('Missing ElevenLabs API configuration');
    }

    const ttsBody = {
      text: ttsText,
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    };

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        body: JSON.stringify(ttsBody),
      }
    );

    console.log('[DEBUG] ElevenLabs TTS response headers:');
    ttsResponse.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    const ttsContentType = ttsResponse.headers.get('content-type') || '';
    if (ttsContentType.includes('text/html')) {
      const htmlError = await ttsResponse.text();
      console.error('[DEBUG] ElevenLabs TTS returned HTML error:', htmlError);
      throw new Error('ElevenLabs TTS returned HTML error');
    }

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[DEBUG] ElevenLabs TTS error response:', errorText);
      throw new Error('Failed to generate voice response from ElevenLabs');
    }

    const arrayBuffer = await ttsResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64AudioResponse = buffer.toString('base64');
    console.log(
      '[DEBUG] ElevenLabs returned base64 audio (first 100 chars):',
      base64AudioResponse.substring(0, 100)
    );

    // Return both the TTS text and visual context along with the audio.
    res.status(200).json({
      audio: base64AudioResponse,
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
}
///