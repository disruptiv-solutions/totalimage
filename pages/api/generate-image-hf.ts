import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, settings } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const hfToken = process.env.HUGGINGFACE_TOKEN;
    const hfEndpoint = process.env.HUGGINGFACE_ENDPOINT_URL;
    
    if (!hfToken || !hfEndpoint) {
      return res.status(500).json({ error: 'Hugging Face credentials not configured' });
    }

    // Call your HF Inference Endpoint
    const response = await fetch(hfEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'image/png',
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: settings?.steps || 35,
          guidance_scale: settings?.cfg_scale || 5.0,
          negative_prompt: settings?.negative_prompt || '',
          width: settings?.width || 1024,
          height: settings?.height || 1024,
          lora_url: settings?.loras || null,
          lora_scale: 0.8,
          seed: settings?.seed === -1 ? null : settings?.seed,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HF Endpoint error:', errorText);
      throw new Error(`HF Endpoint error: ${response.statusText}`);
    }

    // Get image as buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Convert to base64 for returning to frontend
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const imageUrl = `data:image/png;base64,${base64Image}`;
    
    return res.status(200).json({ 
      output: [imageUrl],
      status: 'succeeded'
    });
  } catch (error: any) {
    console.error('Error generating image with HF:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
}



