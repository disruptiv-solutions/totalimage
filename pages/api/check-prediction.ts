import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { predictionId } = req.query;

    if (!predictionId || typeof predictionId !== 'string') {
      return res.status(400).json({ error: 'Prediction ID is required' });
    }

    const apiToken = process.env.REPLICATE_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Replicate API token not configured' });
    }

    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const prediction = await response.json();
    
    return res.status(200).json(prediction);
  } catch (error: any) {
    console.error('Error checking prediction:', error);
    return res.status(500).json({ error: error.message || 'Failed to check prediction status' });
  }
}



