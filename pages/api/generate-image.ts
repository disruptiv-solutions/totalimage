import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { modelId, versionId, prompt, settings } = req.body;

    console.log('=== IMAGE GENERATION REQUEST ===');
    console.log('Model ID:', modelId);
    console.log('Version ID:', versionId);
    console.log('Prompt:', prompt);
    console.log('Settings:', JSON.stringify(settings, null, 2));

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!versionId) {
      return res.status(400).json({ error: 'Model version ID is required' });
    }

    const apiToken = process.env.REPLICATE_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Replicate API token not configured' });
    }

    // Prepare the input payload
    const inputPayload = {
      prompt: prompt,
      ...(settings || {})
    };

    console.log('=== SENDING TO REPLICATE ===');
    console.log('Input payload:', JSON.stringify(inputPayload, null, 2));

    // Start the prediction with the specific version
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: versionId,
        input: inputPayload
      })
    });

    console.log('Replicate response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('=== REPLICATE API ERROR ===');
      console.error('Error data:', JSON.stringify(errorData, null, 2));
      throw new Error(`Replicate API error: ${errorData.detail || response.statusText}`);
    }

    const prediction = await response.json();
    
    console.log('=== REPLICATE RESPONSE ===');
    console.log('Prediction ID:', prediction.id);
    console.log('Status:', prediction.status);
    console.log('Output:', prediction.output);
    console.log('Logs:', prediction.logs);
    console.log('Error:', prediction.error);
    
    // Return the prediction
    return res.status(200).json({ 
      predictionId: prediction.id,
      status: prediction.status,
      output: prediction.output
    });
  } catch (error: any) {
    console.error('=== GENERATION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
}

