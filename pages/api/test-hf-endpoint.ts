import type { NextApiRequest, NextApiResponse } from 'next';

const HF_ENDPOINT = 'https://vrejxat1x5ukm592.us-east-1.aws.endpoints.huggingface.cloud';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      prompt,
      loraUrl,
      loraScale,
      steps,
      guidanceScale,
      negativePrompt,
      width,
      height,
      seed
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const hfToken = process.env.HUGGINGFACE_TOKEN;
    
    if (!hfToken) {
      return res.status(500).json({ error: 'Hugging Face token not configured. Add HUGGINGFACE_TOKEN to .env.local' });
    }

    console.log('=== CALLING HF ENDPOINT ===');
    console.log('Endpoint:', HF_ENDPOINT);
    console.log('Prompt:', prompt);
    console.log('LoRA URL:', loraUrl || 'None');
    console.log('Parameters:', { steps, guidanceScale, width, height, seed });

    // Build request payload
    const payload: any = {
      inputs: prompt,
      parameters: {}
    };

    // Add parameters - only include if provided
    if (steps) payload.parameters.num_inference_steps = steps;
    if (guidanceScale) payload.parameters.guidance_scale = guidanceScale;
    if (negativePrompt) payload.parameters.negative_prompt = negativePrompt;
    if (width) payload.parameters.width = width;
    if (height) payload.parameters.height = height;
    if (seed !== null && seed !== -1) payload.parameters.seed = seed;
    
    // Add LoRA parameters if custom handler supports it
    if (loraUrl) {
      payload.parameters.lora_url = loraUrl;
      payload.parameters.lora_scale = loraScale || 0.8;
    }

    console.log('Request payload:', JSON.stringify(payload, null, 2));

    // Call HF endpoint
    const startTime = Date.now();
    const response = await fetch(HF_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;
    console.log(`Response status: ${response.status} (${duration}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HF Endpoint error:', errorText);
      throw new Error(`HF Endpoint returned ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    console.log('Response content-type:', contentType);

    // Check if response is JSON (custom handler) or image (default handler)
    if (contentType.includes('application/json')) {
      // Custom handler response
      const data = await response.json();
      console.log('=== JSON RESPONSE DETAILS ===');
      console.log('Type:', typeof data);
      console.log('Is Array:', Array.isArray(data));
      console.log('Keys:', Array.isArray(data) ? `Array with ${data.length} items` : Object.keys(data));
      console.log('First item:', Array.isArray(data) ? data[0] : 'N/A');
      console.log('Sample data:', JSON.stringify(data).substring(0, 500));
      
      if (data.image) {
        // Base64 image from custom handler
        const imageUrl = `data:image/png;base64,${data.image}`;
        return res.status(200).json({ 
          image: imageUrl,
          duration: duration / 1000,
          loraLoaded: data.lora_loaded,
          loraUrl: data.lora_url
        });
      } else {
        console.error('❌ No image field in JSON response');
        console.error('Full response:', JSON.stringify(data).substring(0, 1000));
        throw new Error(`No image in response. Got: ${Array.isArray(data) ? 'Array' : 'Object'} with keys: ${Array.isArray(data) ? 'none' : Object.keys(data).join(', ')}`);
      }
    } else if (contentType.includes('image/')) {
      // Default handler - returns image directly (png, jpeg, webp, etc.)
      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      
      // Detect image format from content-type
      let imageFormat = 'png';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        imageFormat = 'jpeg';
      } else if (contentType.includes('webp')) {
        imageFormat = 'webp';
      }
      
      const imageUrl = `data:image/${imageFormat};base64,${base64Image}`;
      
      console.log(`✓ Image received (${imageBuffer.byteLength} bytes, format: ${imageFormat})`);
      
      return res.status(200).json({ 
        image: imageUrl,
        duration: duration / 1000
      });
    } else {
      // Unknown content type - try to handle as image anyway
      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const imageUrl = `data:image/png;base64,${base64Image}`;
      
      console.log(`⚠ Unknown content-type, treating as image (${imageBuffer.byteLength} bytes)`);
      
      return res.status(200).json({ 
        image: imageUrl,
        duration: duration / 1000
      });
    }
  } catch (error: any) {
    console.error('❌ Error calling HF endpoint:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate image',
      details: error.toString()
    });
  }
}

